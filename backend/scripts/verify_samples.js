import { getDb, query, initDatabase } from '../src/database/index.js';
import { getSampleQueriesHandler } from '../src/controllers/queryController.js';

async function verifyAll() {
  console.log('=== VERIFYING DATABASE SCHEMA & SAMPLE QUERIES ===');
  await initDatabase();

  // 1. Inspect actual columns of all demo tables
  console.log('\n--- Actual Columns in Demo Tables ---');
  const tables = ['demo_users', 'demo_products', 'demo_orders', 'demo_transactions'];
  for (const table of tables) {
    const colRes = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    console.log(`\nTable: ${table} (${colRes.rows.length} columns)`);
    colRes.rows.forEach(c => {
      console.log(`  - ${c.column_name.padEnd(20)} ${c.data_type}`);
    });
  }

  // 2. Fetch the 5 sample queries from controller
  console.log('\n--- Testing All Preloaded Sample Queries ---');
  const mockReq = {};
  let samplesList = [];
  const mockRes = {
    json: (payload) => {
      samplesList = payload.data;
    }
  };
  getSampleQueriesHandler(mockReq, mockRes);

  console.log(`Found ${samplesList.length} sample queries.\n`);

  for (const sample of samplesList) {
    console.log(`Testing Sample [${sample.id}]: ${sample.title}`);
    console.log(`SQL:\n${sample.sql}\n`);
    try {
      // Test direct SELECT execution
      const selectRes = await query(sample.sql);
      console.log(`[PASS] Query executed successfully! Returned ${selectRes.rows.length} row(s).`);
      if (selectRes.rows.length > 0) {
        console.log('First row sample:', JSON.stringify(selectRes.rows[0]));
      }

      // Test EXPLAIN (ANALYZE, FORMAT JSON)
      const explainRes = await query(`EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sample.sql}`);
      const plan = explainRes.rows[0]['QUERY PLAN'][0];
      console.log(`[PASS] EXPLAIN ANALYZE succeeded! Root Node: ${plan.Plan['Node Type']}, Total Cost: ${plan.Plan['Total Cost']}, Execution Time: ${plan['Execution Time']}ms`);
      console.log('------------------------------------------------------------\n');
    } catch (err) {
      console.error(`[FAIL] Query failed: ${err.message}\n------------------------------------------------------------\n`);
    }
  }

  process.exit(0);
}

verifyAll().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

