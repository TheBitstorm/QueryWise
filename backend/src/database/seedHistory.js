import { query } from './index.js';
import { analyzeQueryAndPlan } from '../analysis/ruleEngine.js';
import { generateExplanation } from '../services/aiService.js';
import crypto from 'crypto';

export async function seedInitialHistory() {
  try {
    const cRes = await query('SELECT COUNT(*) as count FROM query_history');
    if (parseInt(cRes.rows[0].count, 10) >= 4) {
      return; // Already populated
    }

    console.log('[Seed History] Populating initial demo queries for dashboard charts...');

    const sampleQueries = [
      {
        sql: "SELECT id, username, full_name, email, role, country FROM demo_users WHERE id = 42",
        explainOnly: false
      },
      {
        sql: "SELECT * FROM demo_products WHERE category = 'Electronics' ORDER BY price DESC",
        explainOnly: false
      },
      {
        sql: "SELECT id, order_number, user_id, status, total_amount, created_at FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00",
        explainOnly: false
      },
      {
        sql: "SELECT o.order_number, u.username, u.country, t.amount, t.payment_method, t.status FROM demo_orders o JOIN demo_users u ON o.user_id = u.id JOIN demo_transactions t ON t.order_id = o.id WHERE u.country = 'Germany' ORDER BY t.amount DESC LIMIT 25",
        explainOnly: false
      },
      {
        sql: "SELECT id, name, category, price, stock_quantity FROM demo_products WHERE LOWER(category) = 'electronics' AND name LIKE '%Gen-1%'",
        explainOnly: false
      },
      {
        sql: "SELECT u.country, COUNT(o.id) as order_count, SUM(o.total_amount) as total_revenue FROM demo_users u JOIN demo_orders o ON o.user_id = u.id GROUP BY u.country ORDER BY total_revenue DESC",
        explainOnly: false
      }
    ];

    for (const item of sampleQueries) {
      try {
        const explainCmd = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${item.sql}`;
        const planRes = await query(explainCmd);
        const planObj = planRes.rows[0]['QUERY PLAN'][0];

        const textExplainCmd = `EXPLAIN (ANALYZE, COSTS) ${item.sql}`;
        const textRes = await query(textExplainCmd);
        const rawPlanText = textRes.rows.map(r => r['QUERY PLAN']).join('\n');

        const analysis = analyzeQueryAndPlan(item.sql, planObj);
        const explanation = await generateExplanation({
          sql: item.sql,
          planObject: planObj,
          issues: analysis.issues,
          recommendations: analysis.recommendations,
          metrics: analysis.metrics,
        });

        const queryId = crypto.randomUUID();
        const normalized = item.sql.replace(/\s+/g, ' ').trim();

        await query(
          `INSERT INTO query_history (
            id, query_text, normalized_query, execution_time_ms, planning_time_ms,
            estimated_cost, rows_returned, performance_status, issues_count, high_severity_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            queryId,
            item.sql,
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
            JSON.stringify(planObj),
            rawPlanText,
            JSON.stringify(analysis.issues),
            JSON.stringify(analysis.recommendations),
            JSON.stringify(explanation),
          ]
        );
      } catch (e) {
        console.warn('[Seed History] Skip query on seed error:', e.message);
      }
    }

    console.log('[Seed History] Initial demo queries populated.');
  } catch (err) {
    console.warn('[Seed History] Note:', err.message);
  }
}
