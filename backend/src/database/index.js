import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbClient = null;
let dbType = 'embedded'; // 'postgres' or 'embedded'
let isInitialized = false;

/**
 * Initialize database connection (PGlite or Amazon RDS/Postgres)
 */
export async function getDb() {
  if (dbClient) return dbClient;

  const databaseUrl = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;

  if (databaseUrl) {
    try {
      console.log('[Database] Connecting to PostgreSQL via connection string...');
      const pool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') 
          ? { rejectUnauthorized: false } 
          : false,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000, // Safe 10s query limit
      });

      // Test connection
      await pool.query('SELECT 1');
      console.log('[Database] Connected to external PostgreSQL (RDS / Server) successfully.');
      dbType = 'postgres';
      dbClient = pool;
      return dbClient;
    } catch (err) {
      console.warn('[Database] Failed to connect to external PostgreSQL, falling back to embedded PGlite:', err.message);
    }
  }

  // Use embedded PGlite
  console.log('[Database] Initializing embedded PostgreSQL (PGlite v16)...');
  const dataDir = path.join(__dirname, '..', '..', 'data', 'pglite_db');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    // Clean up stale postmaster.pid lock file if node was previously interrupted
    const pidFile = path.join(dataDir, 'postmaster.pid');
    const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch (e) {}
    }
    if (fs.existsSync(lockFile)) {
      try { fs.unlinkSync(lockFile); } catch (e) {}
    }
  }

  const pglite = new PGlite(dataDir);
  // Ensure standard planner cost metrics (disable artificial penalties)
  try {
    await pglite.exec('SET enable_seqscan = on; SET jit = off;');
  } catch (e) {
    // Ignore setting errors if not supported
  }

  dbType = 'embedded';
  dbClient = pglite;
  console.log('[Database] Embedded PostgreSQL initialized successfully.');
  return dbClient;
}

/**
 * Close database connection cleanly
 */
export async function closeDatabase() {
  if (dbClient) {
    try {
      if (dbType === 'postgres') {
        await dbClient.end();
      } else {
        await dbClient.close();
      }
    } catch (e) {
      // Ignore closing errors on shutdown
    }
    dbClient = null;
  }
}

/**
 * Execute a query with optional parameters
 */
export async function query(sql, params = []) {
  const db = await getDb();
  if (dbType === 'postgres') {
    return await db.query(sql, params);
  } else {
    return await db.query(sql, params);
  }
}

/**
 * Execute raw DDL or multi-statement SQL
 */
export async function exec(sql) {
  const db = await getDb();
  if (dbType === 'postgres') {
    return await db.query(sql);
  } else {
    return await db.exec(sql);
  }
}

/**
 * Initialize schema and seed demo records if necessary
 */
export async function initDatabase() {
  if (isInitialized) return;
  const db = await getDb();

  let schemaPath = path.join(__dirname, '..', '..', '..', 'sql', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  }
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);
    try {
      await exec('ALTER TABLE query_history ALTER COLUMN estimated_cost TYPE NUMERIC(20, 2);');
      await exec('ALTER TABLE query_history ALTER COLUMN execution_time_ms TYPE NUMERIC(20, 3);');
      await exec('ALTER TABLE query_history ALTER COLUMN planning_time_ms TYPE NUMERIC(20, 3);');
    } catch (e) {
      // Ignore if columns already altered
    }
    console.log('[Database] Schema verified and applied.');
  }

  // Check if demo_users table has data
  try {
    const res = await query('SELECT COUNT(*) as count FROM demo_users');
    const count = parseInt(res.rows[0].count, 10);
    if (count === 0) {
      console.log('[Database] Seeding demo database with realistic records...');
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase();
      console.log('[Database] Demo database seeded successfully.');
    } else {
      console.log(`[Database] Demo database already contains ${count} users.`);
    }

    // Seed initial analysis history for dashboard visualization
    const { seedInitialHistory } = await import('./seedHistory.js');
    await seedInitialHistory();
  } catch (err) {
    console.warn('[Database] Error checking demo data:', err.message);
  }

  isInitialized = true;
}

/**
 * Returns connection diagnostic status for the Settings and Health pages
 */
export async function getConnectionStatus() {
  try {
    const start = Date.now();
    const verRes = await query('SELECT version() as version');
    const latencyMs = Date.now() - start;

    const tableCounts = {};
    for (const tbl of ['demo_users', 'demo_products', 'demo_orders', 'demo_transactions', 'query_history']) {
      try {
        const cRes = await query(`SELECT COUNT(*) as c FROM ${tbl}`);
        tableCounts[tbl] = parseInt(cRes.rows[0].c, 10);
      } catch (e) {
        tableCounts[tbl] = 0;
      }
    }

    return {
      connected: true,
      type: dbType === 'postgres' ? 'Amazon RDS / External PostgreSQL' : 'Embedded PostgreSQL (PGlite v16 WASM)',
      version: verRes.rows[0]?.version || 'PostgreSQL 16',
      latencyMs,
      tableCounts,
      isDemoDatabase: true,
      safeMode: true,
    };
  } catch (err) {
    return {
      connected: false,
      type: dbType,
      error: err.message,
      latencyMs: -1,
      tableCounts: {},
      isDemoDatabase: true,
      safeMode: true,
    };
  }
}
