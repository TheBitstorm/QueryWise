import { getDb, query, initDatabase } from '../src/database/index.js';

async function main() {
  await initDatabase();
  await query('SET enable_seqscan = on;');

  const showSeq = await query('SHOW enable_seqscan');
  console.log('SHOW enable_seqscan:', showSeq.rows);

  const planRes = await query('EXPLAIN (FORMAT JSON) SELECT * FROM demo_orders WHERE status = \'pending\'');
  console.log('demo_orders plan cost:', planRes.rows[0]['QUERY PLAN'][0].Plan['Total Cost']);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
