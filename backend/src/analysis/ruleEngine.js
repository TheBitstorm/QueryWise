/**
 * QueryWise Deterministic Rule-Based Performance Analysis Engine
 * 
 * Inspects SQL patterns and PostgreSQL execution plans (EXPLAIN / EXPLAIN ANALYZE)
 * to uncover real performance bottlenecks, missing indexes, and anti-patterns
 * based on actual execution metrics and planner costs.
 */

// Pass-through or wrapper nodes that inherit subplan costs without doing the primary heavy lifting
const WRAPPER_NODE_TYPES = [
  'Limit',
  'Result',
  'Materialize',
  'Subquery Scan',
  'Gather',
  'Gather Merge',
  'Append',
  'Merge Append',
];

/**
 * Normalizes PostgreSQL planner costs to remove any 10-billion penalties
 * caused by planner flags (e.g. enable_seqscan = off adds 10,000,000,000)
 */
export function normalizeCost(rawCost) {
  if (typeof rawCost !== 'number' || isNaN(rawCost)) return 0;
  if (rawCost >= 10000000000) {
    return Number((rawCost - 10000000000).toFixed(2));
  }
  return Number(rawCost.toFixed(2));
}

/**
 * Recursively flatten the PostgreSQL execution plan tree into an array of nodes
 * with normalized costs and calculated exclusive costs/times.
 */
export function flattenPlanTree(node, depth = 0, parentNode = null) {
  if (!node) return [];

  const rawTotalCost = node['Total Cost'] || 0;
  const rawStartupCost = node['Startup Cost'] || 0;
  const normalizedTotalCost = normalizeCost(rawTotalCost);
  const normalizedStartupCost = normalizeCost(rawStartupCost);

  // Compute direct child costs to determine exclusive node cost
  const directChildPlans = Array.isArray(node.Plans) ? node.Plans : [];
  const childrenCostSum = directChildPlans.reduce(
    (sum, c) => sum + normalizeCost(c['Total Cost'] || 0),
    0
  );
  const childrenTimeSum = directChildPlans.reduce(
    (sum, c) => sum + (typeof c['Actual Total Time'] === 'number' ? c['Actual Total Time'] : 0),
    0
  );

  const actualTime = typeof node['Actual Total Time'] === 'number' ? node['Actual Total Time'] : null;
  const exclusiveCost = Number(Math.max(0, normalizedTotalCost - childrenCostSum).toFixed(2));
  const exclusiveTime = actualTime !== null ? Number(Math.max(0, actualTime - childrenTimeSum).toFixed(3)) : null;

  const selfNode = {
    id: `${node['Node Type']}_${depth}_${Math.random().toString(36).substring(2, 7)}`,
    nodeType: node['Node Type'],
    relationName: node['Relation Name'] || null,
    alias: node['Alias'] || null,
    startupCost: normalizedStartupCost,
    totalCost: normalizedTotalCost,
    exclusiveCost,
    planRows: node['Plan Rows'] || 0,
    planWidth: node['Plan Width'] || 0,
    actualStartupTime: node['Actual Startup Time'] ?? null,
    actualTotalTime: actualTime,
    exclusiveTime,
    actualRows: node['Actual Rows'] ?? null,
    actualLoops: node['Actual Loops'] ?? 1,
    filter: node['Filter'] || null,
    rowsRemovedByFilter: node['Rows Removed by Filter'] ?? 0,
    indexName: node['Index Name'] || null,
    indexCond: node['Index Cond'] || null,
    sortKey: node['Sort Key'] || null,
    sortMethod: node['Sort Method'] || null,
    sortSpaceUsed: node['Sort Space Used'] || null,
    sortSpaceType: node['Sort Space Type'] || null,
    joinType: node['Join Type'] || null,
    hashCond: node['Hash Cond'] || null,
    depth,
    parentType: parentNode?.['Node Type'] || null,
    isWrapperNode: WRAPPER_NODE_TYPES.includes(node['Node Type']),
  };

  let list = [selfNode];

  for (const child of directChildPlans) {
    list = list.concat(flattenPlanTree(child, depth + 1, node));
  }

  return list;
}

/**
 * Analyzes a SQL query and its PostgreSQL execution plan using evidence-based heuristics
 * @param {string} sql
 * @param {object} planObject - Output of EXPLAIN (ANALYZE, FORMAT JSON)
 * @returns {{ issues: Array, recommendations: Array, summary: object }}
 */
export function analyzeQueryAndPlan(sql, planObject) {
  const issues = [];
  const recommendations = [];

  const rootPlan = planObject?.Plan || planObject?.[0]?.Plan;
  const planningTime = planObject?.['Planning Time'] ?? planObject?.[0]?.['Planning Time'] ?? 0;
  const executionTime = planObject?.['Execution Time'] ?? planObject?.[0]?.['Execution Time'] ?? 0;
  const totalCost = normalizeCost(rootPlan?.['Total Cost'] || 0);

  const flattenedNodes = rootPlan ? flattenPlanTree(rootPlan) : [];

  // Helper: Extract filter and sort columns from query
  const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(ORDER\s+BY|GROUP\s+BY|LIMIT|$)/i);
  const whereClause = whereMatch ? whereMatch[1].trim() : '';

  const orderByMatch = sql.match(/ORDER\s+BY\s+([\w.,\s]+?)(LIMIT|OFFSET|$)/i);
  const orderByClause = orderByMatch ? orderByMatch[1].trim() : '';

  // 1. Check for SELECT * usage
  const selectStarRegex = /SELECT\s+(\*|[\w\s,.]+\*)/i;
  if (selectStarRegex.test(sql)) {
    issues.push({
      id: 'ISSUE_SELECT_STAR',
      name: 'Unconstrained Column Projection (SELECT *)',
      severity: 'medium',
      description: 'The query requests all table columns using wildcard syntax. This transfers unneeded column attributes into database buffers and prevents the planner from utilizing Index-Only Scans.',
      evidence: 'SQL text specifies `SELECT *`.',
      suggestedFix: 'Specify only the exact columns required by the application.',
      exampleFix: 'Replace `SELECT *` with explicit column list (e.g. `SELECT id, order_number, total_amount`).',
      estimatedBenefit: 'Reduces network serialization overhead and memory buffer footprint.'
    });

    recommendations.push({
      title: 'Project Specific Columns',
      category: 'Query Structure',
      impact: 'Medium',
      description: 'Replace `SELECT *` with explicit columns. This allows PostgreSQL to satisfy queries via Index-Only Scans when covering indexes exist.',
      actionSql: '-- Example projection:\n-- SELECT id, order_number, total_amount FROM demo_orders;'
    });
  }

  // 2. Evidence-Based Sequential Scan Evaluation
  const seqScans = flattenedNodes.filter(n => n.nodeType === 'Seq Scan');
  for (const seq of seqScans) {
    const rowsRemoved = seq.rowsRemovedByFilter || 0;
    const actualRows = seq.actualRows ?? seq.planRows ?? 0;
    const totalScanned = actualRows + rowsRemoved;
    const hasFilter = Boolean(seq.filter);
    const selectivity = totalScanned > 0 ? (actualRows / totalScanned) : 1;

    // A Sequential Scan is NOT automatically a critical bottleneck!
    // Consider actual execution time, table size, rows scanned, and selectivity.
    if (hasFilter && rowsRemoved > 50) {
      const isSlowExecution = executionTime > 25 || (seq.actualTotalTime && seq.actualTotalTime > 20);
      const isModerateExecution = executionTime >= 5 || (seq.actualTotalTime && seq.actualTotalTime >= 5);
      const isHighDiscard = rowsRemoved > 500 && selectivity < 0.25;

      let severity = 'low';
      if (isHighDiscard && isSlowExecution) {
        severity = 'high';
      } else if (isModerateExecution || isHighDiscard) {
        severity = 'medium';
      }

      issues.push({
        id: `ISSUE_SEQ_SCAN_${seq.relationName}`,
        name: `Sequential Scan on '${seq.relationName || 'table'}'`,
        severity,
        description: severity === 'high'
          ? `PostgreSQL inspected all ${totalScanned} rows in '${seq.relationName}' and discarded ${rowsRemoved} rows (${Math.round((1 - selectivity) * 100)}% filtered out) with a measured execution time of ${seq.actualTotalTime || executionTime}ms.`
          : `PostgreSQL evaluated a Sequential Scan on '${seq.relationName}', discarding ${rowsRemoved} unneeded rows. Because execution took ${seq.actualTotalTime || executionTime}ms, impact is currently ${severity === 'medium' ? 'moderate' : 'low'}, but will scale linearly with table growth.`,
        evidence: `Node: Seq Scan on '${seq.relationName}'. Actual Time: ${seq.actualTotalTime ?? 'N/A'}ms. Filter: ${seq.filter}. Rows discarded: ${rowsRemoved} of ${totalScanned}. Planner cost: ${seq.totalCost}.`,
        suggestedFix: `Create an index on '${seq.relationName}' covering the filtered column(s).`,
        exampleFix: generateCreateIndexSuggestion(seq.relationName, seq.filter),
        estimatedBenefit: 'Enables direct B-Tree index page traversal, avoiding full table scans.'
      });

      recommendations.push({
        title: `Add Supporting Index on '${seq.relationName}'`,
        category: 'Indexing',
        impact: severity === 'high' ? 'High' : 'Medium',
        description: `Create a B-Tree index to allow PostgreSQL to perform an Index Scan instead of inspecting all ${totalScanned} rows sequentially.`,
        actionSql: generateCreateIndexSuggestion(seq.relationName, seq.filter)
      });
    } else if (!hasFilter && seq.planRows > 1500 && !sql.toLowerCase().includes('limit')) {
      issues.push({
        id: `ISSUE_UNBOUNDED_SCAN_${seq.relationName}`,
        name: `Unbounded Table Scan on '${seq.relationName}'`,
        severity: 'low',
        description: `The query reads all rows from '${seq.relationName}' without a WHERE filter or LIMIT clause.`,
        evidence: `Sequential scan reading estimated ${seq.planRows} rows.`,
        suggestedFix: 'Add filtering predicates or a pagination LIMIT clause if full table retrieval is unnecessary.',
        exampleFix: `SELECT ... FROM ${seq.relationName} LIMIT 50;`,
        estimatedBenefit: 'Prevents memory ballooning as data volume expands.'
      });
    }
  }

  // 3. Composite Index Recommendation (Filter + ORDER BY Pattern)
  // When a query filters by Column A and sorts by Column B, a composite index (col_a, col_b)
  // satisfies both the filter and sort order simultaneously!
  const sortNodes = flattenedNodes.filter(n => n.nodeType === 'Sort');
  if (sortNodes.length > 0 && whereClause && orderByClause) {
    const primarySeq = seqScans[0];
    const targetTable = primarySeq?.relationName || 'demo_orders';
    const compositeRec = generateCompositeIndexRecommendation(targetTable, whereClause, orderByClause);
    if (compositeRec) {
      issues.push({
        id: 'ISSUE_FILTER_AND_SORT_MISMATCH',
        name: `Unindexed Filter and Sort on '${targetTable}'`,
        severity: (executionTime > 20 || sortNodes[0].totalCost > 30) ? 'medium' : 'low',
        description: `The query filters on predicate (${whereClause.slice(0, 45)}) and orders by (${orderByClause}). Without a composite index, PostgreSQL must execute a separate sort phase in memory.`,
        evidence: `Plan requires both a Scan on '${targetTable}' and a runtime Sort on key: ${JSON.stringify(sortNodes[0].sortKey)}.`,
        suggestedFix: `Create a composite index on '${targetTable}' combining the filter and sort columns.`,
        exampleFix: compositeRec.actionSql,
        estimatedBenefit: 'Eliminates the separate runtime Sort operation by providing rows in pre-sorted index order.'
      });

      recommendations.unshift(compositeRec);
    }
  }

  // 4. Check for Disk Sort Operations
  for (const sort of sortNodes) {
    const isDiskSort = sort.sortSpaceType === 'Disk';
    if (isDiskSort) {
      issues.push({
        id: 'ISSUE_DISK_SORT_SPILL',
        name: 'Sort Operation Spilling to Temporary Disk Files',
        severity: 'high',
        description: `The query sort exceeded PostgreSQL's work_mem allocation and wrote ${sort.sortSpaceUsed || 'temporary'} KB to disk, causing high I/O latency.`,
        evidence: `Sort Method: ${sort.sortMethod}, Space Used: ${sort.sortSpaceUsed} KB (Disk). Total sort cost: ${sort.totalCost}.`,
        suggestedFix: 'Create an index matching the ORDER BY columns, or increase work_mem for this session.',
        exampleFix: `-- Create index matching sort order:\nCREATE INDEX idx_${(sort.relationName || 'tbl')}_sort ON ${(sort.relationName || 'table_name')} (${Array.isArray(sort.sortKey) ? sort.sortKey.join(', ') : sort.sortKey});`,
        estimatedBenefit: 'Removes disk I/O latency by leveraging pre-ordered B-Tree index pages.'
      });
    }
  }

  // 5. Inefficient Filtering: Leading Wildcards (e.g. LIKE '%pattern')
  const leadingWildcardMatch = sql.match(/LIKE\s+['"]%[^'"]+['"]/i) || sql.match(/ILIKE\s+['"]%[^'"]+['"]/i);
  if (leadingWildcardMatch) {
    issues.push({
      id: 'ISSUE_LEADING_WILDCARD',
      name: 'Unindexable Leading Wildcard Predicate (LIKE \'%...\')',
      severity: 'medium',
      description: 'Pattern matching starting with a wildcard (`%` or `_`) prevents the PostgreSQL query planner from using standard B-Tree index lookups, forcing full page scans.',
      evidence: `Query uses pattern predicate: ${leadingWildcardMatch[0]}.`,
      suggestedFix: 'Switch to prefix matching (`term%`), PostgreSQL Trigram GIN indexes (`pg_trgm`), or full-text search.',
      exampleFix: `-- For substring matching, use a GIN trigram index:\nCREATE EXTENSION IF NOT EXISTS pg_trgm;\nCREATE INDEX idx_trgm_name ON table_name USING gin (column_name gin_trgm_ops);`,
      estimatedBenefit: 'Allows GIN index scans for arbitrary substring search operations.'
    });

    recommendations.push({
      title: 'Refactor Leading Wildcard or Use GIN Trigram Index',
      category: 'Search Optimization',
      impact: 'Medium',
      description: 'If prefix matching is sufficient, switch to `LIKE \'term%\'`. For arbitrary substring lookups, create a trigram GIN index.',
      actionSql: '-- Prefix matching:\n-- WHERE column_name LIKE \'term%\';'
    });
  }

  // 6. Inefficient Filtering: Function on Filtered Column
  const functionOnColumnMatch = sql.match(/WHERE\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_.]+)\s*\)\s*(=|<|>|LIKE)/i);
  if (functionOnColumnMatch) {
    const fnName = functionOnColumnMatch[1].toUpperCase();
    const colName = functionOnColumnMatch[2];
    if (['LOWER', 'UPPER', 'DATE', 'TRIM', 'COALESCE'].includes(fnName)) {
      issues.push({
        id: 'ISSUE_FUNCTION_ON_COLUMN',
        name: `Expression-Wrapped Predicate: ${fnName}(${colName})`,
        severity: 'medium',
        description: `Applying scalar function '${fnName}' to column '${colName}' in the WHERE clause invalidates standard B-Tree index lookups on that column.`,
        evidence: `WHERE clause uses functional expression: \`${functionOnColumnMatch[0]}\`.`,
        suggestedFix: `Create an expression (functional) index on ${fnName}(${colName}), or normalize column values at write time.`,
        exampleFix: `CREATE INDEX idx_expr_${colName.replace('.', '_')} ON demo_products (${fnName}(${colName}));`,
        estimatedBenefit: 'Allows direct B-Tree index lookups on expression predicates.'
      });

      recommendations.push({
        title: 'Create Expression / Functional Index',
        category: 'Indexing',
        impact: 'Medium',
        description: `Create an index directly on the expression ${fnName}(${colName}) so PostgreSQL can perform direct index scans.`,
        actionSql: `CREATE INDEX idx_products_category_lower ON demo_products (${fnName}(category));`
      });
    }
  }

  // 7. Check for Costly Nested Loops with high row products
  const nestedLoops = flattenedNodes.filter(n => n.nodeType === 'Nested Loop');
  for (const nl of nestedLoops) {
    if ((nl.actualTotalTime && nl.actualTotalTime > 25) || (nl.planRows > 500 && !nl.indexName)) {
      issues.push({
        id: 'ISSUE_EXPENSIVE_NESTED_LOOP',
        name: 'High-Volume Nested Loop Join',
        severity: 'medium',
        description: 'A Nested Loop join iterates through the outer relation and probes the inner table for each row. Without supporting join indexes, latency scales quadratically.',
        evidence: `Nested Loop join with estimated cost: ${nl.totalCost}, rows: ${nl.planRows}. Measured time: ${nl.actualTotalTime ?? 'N/A'}ms.`,
        suggestedFix: 'Ensure foreign key columns on joined relations are indexed so PostgreSQL can execute an Index Nested Loop or Hash Join.',
        exampleFix: '-- Ensure foreign key is indexed:\nCREATE INDEX idx_orders_user_id ON demo_orders (user_id);',
        estimatedBenefit: 'Converts unindexed loop into indexed lookup or Hash Join.'
      });
    }
  }

  // 8. Accurate Dominant Bottleneck Node Detection
  // Do NOT blame wrapper nodes like 'Limit' or 'Result'! Find the worker node doing the actual heavy work.
  const workNodes = flattenedNodes.filter(n => !n.isWrapperNode);
  if (workNodes.length > 0) {
    // Sort by exclusive cost first, then by exclusive actual time
    const sortedWorkers = [...workNodes].sort((a, b) => {
      if (a.exclusiveTime !== null && b.exclusiveTime !== null && Math.abs(a.exclusiveTime - b.exclusiveTime) > 2) {
        return b.exclusiveTime - a.exclusiveTime;
      }
      return b.exclusiveCost - a.exclusiveCost;
    });

    const topWorker = sortedWorkers[0];
    // Only report if the worker represents significant effort (e.g. exclusive cost > 15 or exclusive time > 5ms)
    if (topWorker && (topWorker.exclusiveCost > 15 || (topWorker.exclusiveTime && topWorker.exclusiveTime > 5))) {
      const costPct = totalCost > 0 ? Math.min(100, Math.round((topWorker.totalCost / totalCost) * 100)) : 0;
      issues.push({
        id: 'ISSUE_PRIMARY_WORKER_BOTTLENECK',
        name: `Primary Execution Bottleneck: ${topWorker.nodeType}${topWorker.relationName ? ` on '${topWorker.relationName}'` : ''}`,
        severity: (topWorker.exclusiveTime > 30 || topWorker.exclusiveCost > 50) ? 'high' : 'medium',
        description: `The underlying ${topWorker.nodeType} node ${topWorker.relationName ? `on '${topWorker.relationName}' ` : ''}accounts for the majority of execution effort (estimated node cost: ${topWorker.totalCost}, actual time: ${topWorker.actualTotalTime ?? 'N/A'}ms). Optimizing this node will produce the largest performance improvement.`,
        evidence: `Node Type: ${topWorker.nodeType}, Relation: ${topWorker.relationName || 'Intermediate'}, Total Node Cost: ${topWorker.totalCost}, Exclusive Cost: ${topWorker.exclusiveCost}.`,
        suggestedFix: `Target optimization on '${topWorker.relationName || topWorker.nodeType}', focusing on its scan predicates, join keys, or sort columns.`,
        exampleFix: topWorker.relationName ? `-- Target relation: ${topWorker.relationName}` : 'Optimize data access strategy.',
        estimatedBenefit: `Directly optimizes the plan node responsible for ~${costPct}% of estimated query cost.`
      });
    }
  }

  // Deduplicate issues by id
  const uniqueIssues = [];
  const seenIds = new Set();
  for (const iss of issues) {
    if (!seenIds.has(iss.id)) {
      seenIds.add(iss.id);
      uniqueIssues.push(iss);
    }
  }

  // Deduplicate recommendations by title
  const uniqueRecs = [];
  const seenTitles = new Set();
  for (const rec of recommendations) {
    if (!seenTitles.has(rec.title)) {
      seenTitles.add(rec.title);
      uniqueRecs.push(rec);
    }
  }

  // Determine evidence-based overall query health status
  // A query executing in a few milliseconds on a demo dataset should NOT be labelled a critical bottleneck!
  const highCount = uniqueIssues.filter(i => i.severity === 'high').length;
  const medCount = uniqueIssues.filter(i => i.severity === 'medium').length;

  let performanceStatus = 'optimal';
  if (executionTime >= 50 || highCount > 0) {
    performanceStatus = 'slow';
  } else if (executionTime >= 10 || medCount > 0) {
    performanceStatus = 'warning';
  }

  return {
    performanceStatus,
    issues: uniqueIssues,
    recommendations: uniqueRecs,
    flattenedNodes,
    metrics: {
      planningTimeMs: Number(planningTime.toFixed(3)),
      executionTimeMs: Number(executionTime.toFixed(3)),
      estimatedCost: totalCost,
      rowsReturned: rootPlan?.['Actual Rows'] ?? rootPlan?.['Plan Rows'] ?? 0,
      totalIssuesCount: uniqueIssues.length,
      highSeverityCount: highCount,
    }
  };
}

/**
 * Generates an index creation SQL statement from a relation name and filter string
 */
function generateCreateIndexSuggestion(relationName, filterStr) {
  if (!relationName) return '-- CREATE INDEX idx_name ON table_name (column_name);';

  // Extract column names from filter like ((status)::text = 'completed'::text) or (created_at > '2025-01-01')
  const colMatches = filterStr.match(/\(?([A-Za-z0-9_]+)\)?(?:::text|::integer)?\s*(=|>|<|>=|<=|IN)/gi);
  let colName = 'column_name';

  if (colMatches && colMatches.length > 0) {
    const raw = colMatches[0].split(/\s*(=|>|<|IN)/)[0].replace(/[()]/g, '').replace(/::\w+/g, '').trim();
    if (raw) colName = raw;
  } else {
    const simpleCol = filterStr.match(/([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (simpleCol && !['and', 'or', 'not', 'true', 'false', 'text'].includes(simpleCol[1].toLowerCase())) {
      colName = simpleCol[1];
    }
  }

  return `CREATE INDEX idx_${relationName}_${colName} ON ${relationName} (${colName});`;
}

/**
 * Generates a composite index recommendation when a query has both WHERE filtering
 * and ORDER BY sorting (e.g. status = 'pending' ORDER BY created_at DESC)
 */
function generateCompositeIndexRecommendation(relationName, whereClause, orderByClause) {
  if (!relationName || !whereClause || !orderByClause) return null;

  // Extract primary filter column (e.g. status)
  const filterMatch = whereClause.match(/([A-Za-z0-9_]+)\s*(=|IN)/i);
  const filterCol = filterMatch ? filterMatch[1].replace(/.*?\./, '').trim() : null;

  // Extract primary sort column and direction (e.g. created_at DESC)
  const sortMatch = orderByClause.match(/([A-Za-z0-9_.]+)(?:\s+(ASC|DESC))?/i);
  if (!sortMatch) return null;

  const sortCol = sortMatch[1].replace(/.*?\./, '').trim();
  const sortDir = (sortMatch[2] || 'ASC').toUpperCase();

  if (!filterCol || !sortCol || filterCol === sortCol) return null;

  const indexName = `idx_${relationName}_${filterCol}_${sortCol}`;
  const actionSql = `CREATE INDEX ${indexName} ON ${relationName} (${filterCol}, ${sortCol} ${sortDir});`;

  return {
    title: `Create Composite Filter & Sort Index on '${relationName}'`,
    category: 'Composite Indexing',
    impact: 'High',
    description: `The query filters by '${filterCol}' and sorts by '${sortCol} ${sortDir}'. A composite B-Tree index satisfies both operations simultaneously, allowing PostgreSQL to jump straight to matching rows in pre-sorted order and eliminating the separate Sort step.`,
    actionSql
  };
}
