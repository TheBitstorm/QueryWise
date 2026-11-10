import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSql } from '../src/analysis/sqlValidator.js';
import { analyzeQueryAndPlan } from '../src/analysis/ruleEngine.js';
import { generateExplanation } from '../src/services/aiService.js';
import { getDb, query, initDatabase } from '../src/database/index.js';

test('1. SQL Validator permits safe SELECT and CTE queries', () => {
  const q1 = validateSql('SELECT id, username FROM demo_users WHERE id = 1;');
  assert.equal(q1.isValid, true);
  assert.equal(q1.sanitizedSql, 'SELECT id, username FROM demo_users WHERE id = 1');

  const q2 = validateSql('WITH recent AS (SELECT * FROM demo_orders LIMIT 10) SELECT * FROM recent;');
  assert.equal(q2.isValid, true);
});

test('2. SQL Validator strictly blocks mutation and administrative queries', () => {
  const badQueries = [
    'DROP TABLE demo_users;',
    'DELETE FROM demo_orders WHERE id = 5;',
    'UPDATE demo_products SET price = 0;',
    'INSERT INTO demo_users (username) VALUES (\'hacker\');',
    'ALTER TABLE demo_users ADD COLUMN is_admin boolean;',
    'TRUNCATE demo_transactions;',
    'GRANT ALL PRIVILEGES ON ALL TABLES TO public;',
  ];

  for (const bq of badQueries) {
    const res = validateSql(bq);
    assert.equal(res.isValid, false, `Expected '${bq}' to be blocked`);
    assert.ok(res.error);
  }
});

test('3. SQL Validator blocks chained multiple statements', () => {
  const chained = validateSql('SELECT * FROM demo_users; DROP TABLE demo_orders;');
  assert.equal(chained.isValid, false);
  assert.match(chained.error, /Multiple SQL statements/i);
});

test('4. End-to-end EXPLAIN ANALYZE on demo database generates real issues & plan', async () => {
  await initDatabase();

  // Test unindexed filter query on 3000 orders
  const sql = "SELECT * FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00;";
  const explainRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`);
  const planJson = explainRes.rows[0]['QUERY PLAN'][0];

  assert.ok(planJson.Plan, 'Execution plan should contain Plan node');
  assert.ok(planJson['Execution Time'] >= 0, 'Should have positive execution time');

  const analysis = analyzeQueryAndPlan(sql, planJson);

  assert.ok(analysis.issues.length > 0, 'Should detect issues in SELECT * on unindexed orders');
  assert.ok(analysis.issues.some(i => i.id === 'ISSUE_SELECT_STAR'), 'Should detect SELECT *');
  assert.ok(analysis.issues.some(i => i.id.startsWith('ISSUE_SEQ_SCAN')), 'Should detect Seq Scan on demo_orders');
  assert.ok(analysis.recommendations.length > 0, 'Should generate recommendations');

  // Test explanation generator
  const explanation = await generateExplanation({
    sql,
    planObject: planJson,
    issues: analysis.issues,
    recommendations: analysis.recommendations,
    metrics: analysis.metrics,
  });

  assert.ok(explanation.summary, 'Explanation must have summary');
  assert.ok(explanation.whySlow, 'Explanation must describe why query is slow');
  assert.ok(explanation.planBreakdown, 'Explanation must include plan breakdown');
  assert.ok(explanation.nextSteps.length > 0, 'Explanation must give next steps');
});

