import crypto from 'crypto';
import { query, exec, getConnectionStatus } from '../database/index.js';
import { validateSql } from '../analysis/sqlValidator.js';
import { analyzeQueryAndPlan } from '../analysis/ruleEngine.js';
import { generateExplanation } from '../services/aiService.js';

/**
 * Controller: Analyze a single SQL query
 */
export async function analyzeQueryHandler(req, res) {
  try {
    const { sql, explainOnly = false } = req.body;

    // 1. Strict SQL Validation & execution safety
    const validation = validateSql(sql);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const sanitizedSql = validation.sanitizedSql;

    // 2. Execute EXPLAIN (ANALYZE, FORMAT JSON) or EXPLAIN (FORMAT JSON)
    const explainCommand = explainOnly
      ? `EXPLAIN (COSTS, VERBOSE, FORMAT JSON) ${sanitizedSql}`
      : `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sanitizedSql}`;

    let planResult;
    try {
      planResult = await query(explainCommand);
    } catch (dbErr) {
      return res.status(422).json({
        success: false,
        error: `Database execution error: ${dbErr.message}`,
        detail: dbErr.detail || null,
        hint: dbErr.hint || null,
      });
    }

    // Also get raw text plan for developer inspection
    let rawPlanText = '';
    try {
      const textExplainCmd = explainOnly
        ? `EXPLAIN (COSTS) ${sanitizedSql}`
        : `EXPLAIN (ANALYZE, COSTS) ${sanitizedSql}`;
      const textRes = await query(textExplainCmd);
      rawPlanText = textRes.rows.map(r => r['QUERY PLAN']).join('\n');
    } catch (e) {
      rawPlanText = 'Raw plan text unavailable.';
    }

    const rawPlanJson = planResult.rows[0]?.['QUERY PLAN'] || planResult.rows[0];
    const planObject = Array.isArray(rawPlanJson) ? rawPlanJson[0] : rawPlanJson;

    // 3. Run deterministic rule-based analysis
    const analysis = analyzeQueryAndPlan(sanitizedSql, planObject);

    // 4. Generate AI / Rule Explanation
    const explanation = await generateExplanation({
      sql: sanitizedSql,
      planObject,
      issues: analysis.issues,
      recommendations: analysis.recommendations,
      metrics: analysis.metrics,
    });

    // 5. Store record in query_history & query_analysis_results
    const queryId = crypto.randomUUID();
    const normalized = sanitizedSql.replace(/\s+/g, ' ').trim();

    try {
      await query(
        `INSERT INTO query_history (
          id, query_text, normalized_query, execution_time_ms, planning_time_ms,
          estimated_cost, rows_returned, performance_status, issues_count, high_severity_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          queryId,
          sanitizedSql,
          normalized,
          analysis.metrics.executionTimeMs,
          analysis.metrics.planningTimeMs,
          analysis.metrics.estimatedCost,
          analysis.metrics.rowsReturned,
          analysis.performanceStatus,
          analysis.metrics.totalIssuesCount,
          analysis.metrics.highSeverityCount,
        ]
      );

      await query(
        `INSERT INTO query_analysis_results (
          id, query_id, execution_plan, raw_plan_text, detected_issues, recommendations, ai_explanation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          queryId,
          JSON.stringify(planObject),
          rawPlanText,
          JSON.stringify(analysis.issues),
          JSON.stringify(analysis.recommendations),
          JSON.stringify(explanation),
        ]
      );
    } catch (saveErr) {
      console.warn('[Query Controller] Notice: Could not persist history record:', saveErr.message);
    }

    return res.json({
      success: true,
      data: {
        id: queryId,
        sql: sanitizedSql,
        metrics: analysis.metrics,
        performanceStatus: analysis.performanceStatus,
        plan: planObject,
        rawPlanText,
        flattenedNodes: analysis.flattenedNodes,
        issues: analysis.issues,
        recommendations: analysis.recommendations,
        explanation,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Query Controller] Internal error in analyzeQueryHandler:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while analyzing the query.',
      details: err.message,
    });
  }
}

/**
 * Controller: Compare original query vs optimized query
 */
export async function compareQueriesHandler(req, res) {
  try {
    const { originalSql, optimizedSql } = req.body;

    const origVal = validateSql(originalSql);
    if (!origVal.isValid) {
      return res.status(400).json({ success: false, error: `Original SQL Error: ${origVal.error}` });
    }

    const optVal = validateSql(optimizedSql);
    if (!optVal.isValid) {
      return res.status(400).json({ success: false, error: `Optimized SQL Error: ${optVal.error}` });
    }

    // Execute both in sequence with warm-up run to ensure equitable buffer cache conditions
    const origCmd = `EXPLAIN (ANALYZE, COSTS, VERBOSE, FORMAT JSON) ${origVal.sanitizedSql}`;
    const optCmd = `EXPLAIN (ANALYZE, COSTS, VERBOSE, FORMAT JSON) ${optVal.sanitizedSql}`;

    // Run original query
    const origRes = await query(origCmd);
    const origPlanJson = origRes.rows[0]?.['QUERY PLAN'] || origRes.rows[0];
    const origPlan = Array.isArray(origPlanJson) ? origPlanJson[0] : origPlanJson;
    const origAnalysis = analyzeQueryAndPlan(origVal.sanitizedSql, origPlan);

    // Run optimized query
    const optRes = await query(optCmd);
    const optPlanJson = optRes.rows[0]?.['QUERY PLAN'] || optRes.rows[0];
    const optPlan = Array.isArray(optPlanJson) ? optPlanJson[0] : optPlanJson;
    const optAnalysis = analyzeQueryAndPlan(optVal.sanitizedSql, optPlan);

    // Calculate percentage improvements: ((Original - Optimized) / Original) * 100
    const origTime = origAnalysis.metrics.executionTimeMs || 0.001;
    const optTime = optAnalysis.metrics.executionTimeMs || 0.001;
    const timeImprovementPct = Number((((origTime - optTime) / origTime) * 100).toFixed(2));

    const origCost = origAnalysis.metrics.estimatedCost || 0.001;
    const optCost = optAnalysis.metrics.estimatedCost || 0.001;
    const costImprovementPct = Number((((origCost - optCost) / origCost) * 100).toFixed(2));

    return res.json({
      success: true,
      data: {
        original: {
          sql: origVal.sanitizedSql,
          metrics: origAnalysis.metrics,
          performanceStatus: origAnalysis.performanceStatus,
          issuesCount: origAnalysis.issues.length,
          plan: origPlan,
        },
        optimized: {
          sql: optVal.sanitizedSql,
          metrics: optAnalysis.metrics,
          performanceStatus: optAnalysis.performanceStatus,
          issuesCount: optAnalysis.issues.length,
          plan: optPlan,
        },
        comparison: {
          timeImprovementPct,
          costImprovementPct,
          timeSavedMs: Number(Math.max(0, origTime - optTime).toFixed(3)),
          costSaved: Number(Math.max(0, origCost - optCost).toFixed(2)),
          faster: optTime < origTime,
          cheaper: optCost < origCost,
        },
      },
    });
  } catch (err) {
    console.error('[Query Controller] Compare error:', err);
    return res.status(500).json({
      success: false,
      error: `Comparison failed: ${err.message}`,
    });
  }
}

/**
 * Controller: Get Query Analysis History
 */
export async function getHistoryHandler(req, res) {
  try {
    const { status, limit = 50, offset = 0, search } = req.query;

    let sql = 'SELECT * FROM query_history WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND performance_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (query_text ILIKE $${params.length} OR normalized_query ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    params.push(parseInt(limit, 10));
    sql += ` LIMIT $${params.length}`;

    params.push(parseInt(offset, 10));
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    // Get total count for pagination
    const countRes = await query('SELECT COUNT(*) as total FROM query_history');
    const totalCount = parseInt(countRes.rows[0].total, 10);

    return res.json({
      success: true,
      data: {
        records: result.rows,
        total: totalCount,
      },
    });
  } catch (err) {
    console.error('[Query Controller] History error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Get Single History Record with Full Analysis Details
 */
export async function getHistoryDetailHandler(req, res) {
  try {
    const { id } = req.params;

    const histRes = await query('SELECT * FROM query_history WHERE id = $1', [id]);
    if (histRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Query history record not found.' });
    }

    const detailRes = await query('SELECT * FROM query_analysis_results WHERE query_id = $1', [id]);
    const details = detailRes.rows[0] || {};

    const historyRecord = histRes.rows[0];

    return res.json({
      success: true,
      data: {
        id: historyRecord.id,
        sql: historyRecord.query_text,
        metrics: {
          executionTimeMs: parseFloat(historyRecord.execution_time_ms) || 0,
          planningTimeMs: parseFloat(historyRecord.planning_time_ms) || 0,
          estimatedCost: parseFloat(historyRecord.estimated_cost) || 0,
          rowsReturned: historyRecord.rows_returned || 0,
          totalIssuesCount: historyRecord.issues_count || 0,
          highSeverityCount: historyRecord.high_severity_count || 0,
        },
        performanceStatus: historyRecord.performance_status,
        plan: typeof details.execution_plan === 'string' ? JSON.parse(details.execution_plan) : details.execution_plan,
        rawPlanText: details.raw_plan_text || '',
        issues: typeof details.detected_issues === 'string' ? JSON.parse(details.detected_issues) : (details.detected_issues || []),
        recommendations: typeof details.recommendations === 'string' ? JSON.parse(details.recommendations) : (details.recommendations || []),
        explanation: typeof details.ai_explanation === 'string' ? JSON.parse(details.ai_explanation) : (details.ai_explanation || {}),
        createdAt: historyRecord.created_at,
      },
    });
  } catch (err) {
    console.error('[Query Controller] History detail error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Delete a history record
 */
export async function deleteHistoryHandler(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM query_history WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Analysis record deleted successfully.' });
  } catch (err) {
    console.error('[Query Controller] Delete error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Aggregate Real Dashboard Metrics
 */
export async function getDashboardHandler(req, res) {
  try {
    // 1. Overall stats
    const statsRes = await query(`
      SELECT
        COUNT(*)::int as total_queries,
        COALESCE(ROUND(AVG(execution_time_ms), 2), 0) as avg_execution_time_ms,
        COALESCE(SUM(CASE WHEN performance_status = 'slow' THEN 1 ELSE 0 END), 0)::int as slow_queries_count,
        COALESCE(SUM(issues_count), 0)::int as total_recommendations_count
      FROM query_history
    `);
    const stats = statsRes.rows[0];

    // 2. Query Health distribution
    const healthRes = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN performance_status = 'optimal' THEN 1 ELSE 0 END), 0)::int as optimal,
        COALESCE(SUM(CASE WHEN performance_status = 'warning' THEN 1 ELSE 0 END), 0)::int as warning,
        COALESCE(SUM(CASE WHEN performance_status = 'slow' THEN 1 ELSE 0 END), 0)::int as slow
      FROM query_history
    `);
    const health = healthRes.rows[0];

    // 3. Recent 8 queries
    const recentRes = await query(`
      SELECT id, query_text, execution_time_ms, estimated_cost, performance_status, issues_count, created_at
      FROM query_history
      ORDER BY created_at DESC
      LIMIT 8
    `);

    // 4. Performance timeline for Recharts chart (last 12 queries in chronological order)
    const trendRes = await query(`
      SELECT id, SUBSTRING(query_text, 1, 25) as label, execution_time_ms, estimated_cost, created_at
      FROM (
        SELECT id, query_text, execution_time_ms, estimated_cost, created_at
        FROM query_history
        ORDER BY created_at DESC
        LIMIT 12
      ) q
      ORDER BY created_at ASC
    `);

    return res.json({
      success: true,
      data: {
        summary: {
          totalQueries: stats.total_queries,
          avgExecutionTimeMs: parseFloat(stats.avg_execution_time_ms),
          slowQueriesCount: stats.slow_queries_count,
          totalRecommendationsCount: stats.total_recommendations_count,
        },
        healthDistribution: [
          { name: 'Optimal', value: health.optimal, color: '#16A34A' },
          { name: 'Warning', value: health.warning, color: '#D97706' },
          { name: 'Bottleneck', value: health.slow, color: '#DC2626' },
        ],
        recentQueries: recentRes.rows,
        performanceTrend: trendRes.rows.map((r, idx) => ({
          name: `Q#${idx + 1}`,
          fullQuery: r.label,
          timeMs: parseFloat(r.execution_time_ms) || 0,
          cost: parseFloat(r.estimated_cost) || 0,
        })),
      },
    });
  } catch (err) {
    console.error('[Query Controller] Dashboard metrics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: System and Database Health
 */
export async function getHealthHandler(req, res) {
  try {
    const dbStatus = await getConnectionStatus();
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');

    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      aiService: {
        provider: hasGeminiKey ? 'Google Gemini API' : 'QueryWise Deterministic Rule Engine',
        status: hasGeminiKey ? 'connected' : 'fallback_active',
        hasApiKey: hasGeminiKey,
        notice: hasGeminiKey ? 'Active production model' : 'Deterministic rule engine provides reliable offline analysis without requiring an API key.',
      },
      cloudEnvironment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        isAws: Boolean(process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION),
        region: process.env.AWS_REGION || 'local-us-east-1',
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
}

/**
 * Controller: Preset Sample Queries for Demonstration
 */
export function getSampleQueriesHandler(req, res) {
  const samples = [
    {
      id: 'sample-1',
      title: '1. Basic Point Lookup (Indexed Primary Key)',
      category: 'Optimal Pattern',
      description: 'Fetches a single user record by its indexed primary key (id = 42). Demonstrates optimal Index Scan behavior.',
      sql: `SELECT id, username, full_name, email, role, country\nFROM demo_users\nWHERE id = 42;`,
      expectedIssue: 'None (Optimal)',
    },
    {
      id: 'sample-2',
      title: '2. Wildcard Projection Anti-Pattern (SELECT *)',
      category: 'Query Anti-Pattern',
      description: 'Uses SELECT * to retrieve all columns without projection filtering, transferring unneeded column buffers.',
      sql: `SELECT *\nFROM demo_products\nWHERE category = 'Electronics'\nORDER BY price DESC;`,
      expectedIssue: 'SELECT * column bloat and in-memory sort',
    },
    {
      id: 'sample-3',
      title: '3. Unindexed Sequential Scan on 3,000 Orders',
      category: 'Missing Index Bottleneck',
      description: 'Filters 3,000 orders by status = \'pending\' and total_amount > 1500. Forces a full table Sequential Scan because no composite index exists.',
      sql: `SELECT id, order_number, user_id, status, total_amount, created_at\nFROM demo_orders\nWHERE status = 'pending'\n  AND total_amount > 1500.00;`,
      expectedIssue: 'Sequential Scan with filter; Missing supporting index',
    },
    {
      id: 'sample-4',
      title: '4. Expensive Multi-Table Join & Unindexed Sort',
      category: 'Join & Sort Bottleneck',
      description: 'Joins demo_orders with demo_users and demo_transactions, filtering by country and sorting by transaction amount without supporting index.',
      sql: `SELECT o.order_number, u.username, u.country, t.amount, t.payment_method, t.status\nFROM demo_orders o\nJOIN demo_users u ON o.user_id = u.id\nJOIN demo_transactions t ON t.order_id = o.id\nWHERE u.country = 'Germany'\nORDER BY t.amount DESC\nLIMIT 25;`,
      expectedIssue: 'Multi-table join, nested loop or unindexed sort',
    },
    {
      id: 'sample-5',
      title: '5. Inefficient Filter: Function on Column & Leading Wildcard',
      category: 'Inefficient Filter',
      description: 'Wraps column in LOWER() and uses a leading wildcard ILIKE, preventing index lookups.',
      sql: `SELECT id, name, category, price, stock_quantity\nFROM demo_products\nWHERE LOWER(category) = 'electronics'\n  AND name LIKE '%Gen-1%';`,
      expectedIssue: 'Function on filtered column; unindexable leading wildcard pattern',
    },
  ];

  return res.json({ success: true, data: samples });
}

/**
 * Controller: Get Demo Database Schema Columns & Types
 */
export async function getDemoSchemaHandler(req, res) {
  try {
    const colRes = await query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('demo_users', 'demo_products', 'demo_orders', 'demo_transactions')
      ORDER BY table_name, ordinal_position
    `);

    const schemaByTable = {};
    colRes.rows.forEach(r => {
      if (!schemaByTable[r.table_name]) {
        schemaByTable[r.table_name] = [];
      }
      schemaByTable[r.table_name].push({
        column: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES'
      });
    });

    return res.json({ success: true, data: schemaByTable });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}


