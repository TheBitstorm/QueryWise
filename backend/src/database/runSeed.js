import { initDatabase, seedDatabase } from './seed.js';
import { getDb } from './index.js';

async function main() {
  console.log('[Seed Runner] Initializing database...');
  await getDb();
  await seedDatabase();
  console.log('[Seed Runner] Finished successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('[Seed Runner] Fatal error:', err);
  process.exit(1);
});

