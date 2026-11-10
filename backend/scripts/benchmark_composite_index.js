import { getDb, query, exec, initDatabase } from '../src/database/index.js';

async function testIndexBenchmark() {
  await initDatabase();
  await exec('SET enable_seqscan = on; SET jit = off;');

  const testSql = `SELECT id, order_number, user_id, status, total_amount, created_at
FROM demo_orders
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 25;`;

  console.log('=== 1. BEFORE COMPOSITE INDEX ===');
  await exec('DROP INDEX IF EXISTS idx_orders_status_created;');
  await exec('ANALYZE demo_orders;');

  const beforeRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${testSql}`);
  const beforePlan = beforeRes.rows[0]['QUERY PLAN'][0];
  console.log('BEFORE PLAN Structure:', JSON.stringify(beforePlan, null, 2));

  console.log('\n=== 2. CREATING COMPOSITE INDEX ===');
  await exec('CREATE INDEX idx_orders_status_created ON demo_orders (status, created_at DESC);');
  await exec('ANALYZE demo_orders;');

  const afterRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${testSql}`);
  const afterPlan = afterRes.rows[0]['QUERY PLAN'][0];
  console.log('AFTER PLAN Structure:', JSON.stringify(afterPlan, null, 2));

  process.exit(0);
}

testIndexBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
