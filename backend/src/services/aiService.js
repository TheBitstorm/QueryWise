import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates beginner-friendly explanations of SQL execution plans and detected issues.
 * Uses Google Gemini API when configured, with a 100% reliable deterministic fallback.
 * 
 * @param {object} params
 * @param {string} params.sql
 * @param {object} params.planObject
 * @param {Array} params.issues
 * @param {Array} params.recommendations
 * @param {object} params.metrics
 * @returns {Promise<object>} Structured explanation payload
 */
export async function generateExplanation({ sql, planObject, issues, recommendations, metrics }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here') {
    try {
      return await generateGeminiExplanation(apiKey, { sql, planObject, issues, recommendations, metrics });
    } catch (err) {
      console.warn('[AI Service] Gemini API call failed, falling back to deterministic engine:', err.message);
      return generateDeterministicExplanation({ sql, planObject, issues, recommendations, metrics, fallbackReason: err.message });
    }
  }

  // Deterministic fallback
  return generateDeterministicExplanation({ sql, planObject, issues, recommendations, metrics });
}

/**
 * Call Google Gemini API
 */
async function generateGeminiExplanation(apiKey, { sql, planObject, issues, recommendations, metrics }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Default to gemini-1.5-flash for fast and cost-effective responses
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const rootPlan = planObject?.Plan || planObject?.[0]?.Plan;

  const prompt = `
You are QueryWise AI, an expert database performance mentor for software engineers.
Explain the following PostgreSQL query performance analysis in clear, accessible language for developers.

CRITICAL INSTRUCTIONS:
1. Ground your answer STRICTLY in the provided data. Do NOT hallucinate execution times, index names, or table statistics.
2. Return ONLY a valid JSON object matching the requested schema. No markdown backticks, no markdown wrapping, pure JSON.

INPUT DATA:
- SQL Query:
${sql}

- Performance Metrics:
Execution Time: ${metrics.executionTimeMs} ms
Planning Time: ${metrics.planningTimeMs} ms
Estimated Cost: ${metrics.estimatedCost}
Rows Returned: ${metrics.rowsReturned}
Primary Node: ${rootPlan?.['Node Type'] || 'N/A'} (${rootPlan?.['Relation Name'] || 'N/A'})

- Detected Issues:
${JSON.stringify(issues.map(i => ({ name: i.name, severity: i.severity, evidence: i.evidence, suggestedFix: i.suggestedFix })))}

- Suggested Recommendations:
${JSON.stringify(recommendations.map(r => ({ title: r.title, description: r.description })))}

OUTPUT JSON SCHEMA:
{
  "summary": "1-2 sentences explaining what business operation this query performs",
  "whySlow": "Clear explanation of the main bottleneck causing latency or resource consumption",
  "planBreakdown": "Step-by-step description of how PostgreSQL executed the query in plain English",
  "issuesExplained": [
    {
      "issueName": "string",
      "plainLanguageMeaning": "why this matters to application performance in plain terms"
    }
  ],
  "howOptimizationHelps": "How applying the suggested fix or index reduces disk I/O, CPU, or memory",
  "nextSteps": [
    "Step 1 actionable developer advice",
    "Step 2..."
  ]
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Clean markdown fences if model included them
  const cleanedJson = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleanedJson);

  return {
    isAiGenerated: true,
    provider: 'Google Gemini (gemini-1.5-flash)',
    summary: parsed.summary,
    whySlow: parsed.whySlow,
    planBreakdown: parsed.planBreakdown,
    issuesExplained: parsed.issuesExplained || [],
    howOptimizationHelps: parsed.howOptimizationHelps,
    nextSteps: parsed.nextSteps || [],
  };
}

/**
 * Deterministic rule-based explanation engine (guaranteed 100% uptime & zero API cost)
 */
export function generateDeterministicExplanation({ sql, planObject, issues, recommendations, metrics, fallbackReason }) {
  const rootPlan = planObject?.Plan || planObject?.[0]?.Plan;
  const primaryNode = rootPlan?.['Node Type'] || 'Query Execution';
  const relation = rootPlan?.['Relation Name'] || 'target relation';

  // 1. What the query does
  let summary = `This query retrieves data from ${relation ? `the '${relation}' table` : 'the database'}`;
  if (sql.toLowerCase().includes('join')) {
    summary += ' by combining records across multiple relations';
  }
  if (sql.toLowerCase().includes('order by')) {
    summary += ' and sorts the resulting dataset';
  }
  if (sql.toLowerCase().includes('group by')) {
    summary += ' while aggregating records';
  }
  summary += '.';

  // 2. Why slow
  let whySlow = 'Query execution was evaluated by the PostgreSQL optimizer.';
  if (issues.length > 0) {
    const topIssue = issues[0];
    whySlow = `The primary performance bottleneck is ${topIssue.name.toLowerCase()}. ${topIssue.description}`;
  } else if (metrics.executionTimeMs < 10) {
    whySlow = `The query executed in ${metrics.executionTimeMs} ms with an estimated cost of ${metrics.estimatedCost}, which is well within acceptable operational bounds.`;
  }

  // 3. Plan breakdown
  let planBreakdown = `PostgreSQL chose a ${primaryNode} strategy. `;
  if (primaryNode === 'Seq Scan') {
    planBreakdown += `Because no index satisfied the query conditions, every single page on disk was inspected sequentially.`;
  } else if (primaryNode === 'Index Scan' || primaryNode === 'Bitmap Index Scan') {
    planBreakdown += `The planner utilized a B-Tree index lookup, allowing direct page access rather than inspecting every table record.`;
  } else if (primaryNode === 'Hash Join' || primaryNode === 'Merge Join') {
    planBreakdown += `The planner performed a ${primaryNode} to pair rows between tables based on the join keys.`;
  } else if (primaryNode === 'Nested Loop') {
    planBreakdown += `The planner used a Nested Loop join, repeatedly probing the inner relation for each matching outer row.`;
  }

  // 4. Issues explained
  const issuesExplained = issues.map(i => ({
    issueName: i.name,
    plainLanguageMeaning: `${i.description} ${i.suggestedFix}`
  }));

  // 5. How optimization helps
  let howOptimizationHelps = 'Applying the recommended indexing and query rewriting reduces the number of disk blocks PostgreSQL must read into memory buffers, reducing I/O latency and CPU load.';
  if (recommendations.length > 0) {
    howOptimizationHelps = `Specifically, ${recommendations[0].description}`;
  }

  // 6. Actionable next steps
  const nextSteps = [
    recommendations.length > 0 ? recommendations[0].title : 'Verify query selectivity under peak load',
    'Test with EXPLAIN ANALYZE on a staging environment before running migrations',
    'Compare original vs optimized query using the QueryWise Comparison tool'
  ];

  return {
    isAiGenerated: false,
    provider: fallbackReason 
      ? `Deterministic Rule Engine (Fallback: ${fallbackReason.substring(0, 40)}...)` 
      : 'QueryWise Rule Engine (Deterministic)',
    summary,
    whySlow,
    planBreakdown,
    issuesExplained,
    howOptimizationHelps,
    nextSteps,
  };
}

