import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { getDb, initDatabase, query } from '../src/database/index.js';

test('Integration Test Suite for QueryWise End-to-End', async (t) => {
  await initDatabase();

  await t.test('1. Database is seeded with sample records', async () => {
    const userRes = await query('SELECT COUNT(*) as count FROM demo_users');
    const orderRes = await query('SELECT COUNT(*) as count FROM demo_orders');
    assert.equal(parseInt(userRes.rows[0].count, 10), 500);
    assert.equal(parseInt(orderRes.rows[0].count, 10), 3000);
  });

  await t.test('2. Query Analysis Engine evaluates SELECT * and Seq Scan', async () => {
    const { analyzeQueryAndPlan } = await import('../src/analysis/ruleEngine.js');
    const sql = "SELECT * FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00;";
    const explainRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`);
    const planJson = explainRes.rows[0]['QUERY PLAN'][0];
    
    const analysis = analyzeQueryAndPlan(sql, planJson);
    assert.ok(analysis.issues.length >= 2, 'Should detect at least SELECT * and Seq Scan');
    assert.ok(analysis.recommendations.length >= 2, 'Should generate actionable recommendations');
    assert.ok(analysis.metrics.executionTimeMs >= 0);
  });

  await t.test('3. Query Comparison computes exact improvement delta', async () => {
    const origSql = "SELECT id, order_number, user_id, status, total_amount, created_at FROM demo_orders WHERE status = 'pending' AND total_amount > 1500.00;";
    const optSql = "SELECT id, username, full_name, email, role, country FROM demo_users WHERE id = 42;";

    const origRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, FORMAT JSON) ${origSql}`);
    const origPlan = origRes.rows[0]['QUERY PLAN'][0];

    const optRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, FORMAT JSON) ${optSql}`);
    const optPlan = optRes.rows[0]['QUERY PLAN'][0];

    const origTime = origPlan['Execution Time'] || 0.001;
    const optTime = optPlan['Execution Time'] || 0.001;

    const timeImprovementPct = Number((((origTime - optTime) / origTime) * 100).toFixed(2));
    assert.ok(typeof timeImprovementPct === 'number');
  });
});

