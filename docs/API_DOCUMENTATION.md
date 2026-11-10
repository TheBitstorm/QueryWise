# QueryWise REST API Documentation

Base URL: `http://localhost:5000/api` (Local) or `https://<your-app-runner-url>/api` (AWS)

All endpoints accept and return JSON payloads.

---

## 1. Query Analysis

### `POST /api/analyze`
Submits a SQL statement to the database safety validator, executes `EXPLAIN (ANALYZE)` or `EXPLAIN (COSTS)`, detects performance bottlenecks, generates AI explanations, and logs the profile in history.

**Request Body:**
```json
{
  "sql": "SELECT id, order_number, user_id, status, total_amount FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00;",
  "explainOnly": false
}
```

**Parameters:**
- `sql` (string, required): A read-only SQL query (`SELECT` or `WITH`).
- `explainOnly` (boolean, optional, default: `false`): When `true`, runs `EXPLAIN (COSTS)` without executing the query.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "7f3b4a2d-1c8e-4a6f-9e3d-0b2a1c4e6f8a",
    "sql": "SELECT id, order_number, user_id, status, total_amount FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00",
    "metrics": {
      "planningTimeMs": 0.124,
      "executionTimeMs": 2.450,
      "estimatedCost": 72.50,
      "rowsReturned": 248,
      "totalIssuesCount": 1,
      "highSeverityCount": 1
    },
    "performanceStatus": "slow",
    "plan": {
      "Plan": {
        "Node Type": "Seq Scan",
        "Relation Name": "demo_orders",
        "Total Cost": 72.50,
        "Actual Total Time": 2.38,
        "Filter": "((status = 'pending') AND (total_amount > 1500.00))",
        "Rows Removed by Filter": 2752
      }
    },
    "rawPlanText": "Seq Scan on demo_orders (cost=0.00..72.50 rows=250 width=36)...",
    "issues": [
      {
        "id": "ISSUE_SEQ_SCAN_demo_orders",
        "name": "Sequential Scan with Filter on 'demo_orders'",
        "severity": "high",
        "description": "PostgreSQL is scanning every page of the table 'demo_orders' sequentially...",
        "evidence": "Plan Node: Seq Scan on relation 'demo_orders' with filter...",
        "suggestedFix": "Create an index covering the column(s) evaluated in the filter.",
        "exampleFix": "CREATE INDEX idx_demo_orders_status ON demo_orders (status);",
        "estimatedBenefit": "Estimated 50-90% reduction in execution time and disk I/O on larger tables."
      }
    ],
    "recommendations": [
      {
        "title": "Add Supporting Index on 'demo_orders'",
        "category": "Indexing",
        "impact": "High",
        "description": "Create a B-Tree index to allow PostgreSQL to perform a direct Index Scan...",
        "actionSql": "CREATE INDEX idx_demo_orders_status ON demo_orders (status);"
      }
    ],
    "explanation": {
      "isAiGenerated": true,
      "provider": "Google Gemini (gemini-1.5-flash)",
      "summary": "This query retrieves pending high-value orders from the demo_orders table.",
      "whySlow": "The database had to inspect all 3,000 orders sequentially because no index exists on the status column.",
      "planBreakdown": "PostgreSQL executed a Seq Scan across all physical table blocks.",
      "issuesExplained": [
        {
          "issueName": "Sequential Scan with Filter",
          "plainLanguageMeaning": "Without an index, the database reads every row from disk into memory."
        }
      ],
      "howOptimizationHelps": "A B-Tree index allows the database engine to jump straight to pending orders.",
      "nextSteps": [
        "Create index: CREATE INDEX idx_demo_orders_status ON demo_orders(status);",
        "Compare query execution before and after using the Comparison tool."
      ]
    },
    "createdAt": "2026-11-10T13:45:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Query contains forbidden operation 'DROP'. Only read-only SELECT statements are supported."
}
```

---

## 2. Query Comparison

### `POST /api/compare`
Runs `EXPLAIN (ANALYZE)` on both the original SQL and candidate optimized SQL in identical conditions, computing percentage latency and cost improvements.

**Request Body:**
```json
{
  "originalSql": "SELECT * FROM demo_orders WHERE status = 'pending' AND total_amount > 1500;",
  "optimizedSql": "SELECT id, username, email FROM demo_users WHERE id = 42;"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "original": {
      "sql": "SELECT * FROM demo_orders WHERE status = 'pending' AND total_amount > 1500",
      "metrics": {
        "executionTimeMs": 2.45,
        "estimatedCost": 72.50
      },
      "performanceStatus": "slow",
      "issuesCount": 2
    },
    "optimized": {
      "sql": "SELECT id, username, email FROM demo_users WHERE id = 42",
      "metrics": {
        "executionTimeMs": 0.08,
        "estimatedCost": 8.28
      },
      "performanceStatus": "optimal",
      "issuesCount": 0
    },
    "comparison": {
      "timeImprovementPct": 96.73,
      "costImprovementPct": 88.58,
      "timeSavedMs": 2.37,
      "costSaved": 64.22,
      "faster": true,
      "cheaper": true
    }
  }
}
```

---

## 3. History Management

### `GET /api/history`
Retrieves past query analyses with status filtering, search, and pagination.

**Query Parameters:**
- `status` (`'all'` | `'optimal'` | `'warning'` | `'slow'`)
- `search` (string)
- `limit` (integer, default: `50`)
- `offset` (integer, default: `0`)

### `GET /api/history/:id`
Retrieves complete execution plan, detected issues, recommendations, and AI explanation for a specific query analysis record.

### `DELETE /api/history/:id`
Permanently deletes a query record and its associated plan details.

---

## 4. Diagnostics & Dashboard

### `GET /api/dashboard`
Returns aggregated performance metrics:
- Total queries analyzed
- Average execution time (ms)
- Slow query count
- Total recommendations generated
- Health distribution counts (Optimal, Warning, Bottleneck)
- Recent 8 query executions
- Chronological performance timeline for Recharts

### `GET /api/health`
Returns connection health, PostgreSQL engine version, latency ping, table row counts, and AI provider status.

### `GET /api/demo/samples`
Returns 5 pre-configured demonstration queries showcasing various database access patterns.

