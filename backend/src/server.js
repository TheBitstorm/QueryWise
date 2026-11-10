import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { initDatabase, getConnectionStatus } from './database/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (from backend/.env or root .env)
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const backendEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security & request parsing middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '512kb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Root health check endpoint for AWS Load Balancer / App Runner
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await getConnectionStatus();
    res.status(dbStatus.connected ? 200 : 503).json({
      status: dbStatus.connected ? 'healthy' : 'degraded',
      service: 'QueryWise Backend API',
      timestamp: new Date().toISOString(),
      database: dbStatus.type,
      connected: dbStatus.connected,
    });
  } catch (e) {
    res.status(500).json({ status: 'unhealthy', error: e.message });
  }
});

// Serve static frontend files in production if built
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  console.log(`[QueryWise] Serving production frontend build from ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `API endpoint '${req.originalUrl}' not found.` });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('[QueryWise Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.',
  });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n[QueryWise] Shutting down gracefully (SIGINT)...');
  const { closeDatabase } = await import('./database/index.js');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[QueryWise] Shutting down gracefully (SIGTERM)...');
  const { closeDatabase } = await import('./database/index.js');
  await closeDatabase();
  process.exit(0);
});

// Start server and initialize database
async function startServer() {
  try {
    console.log('[QueryWise] Bootstrapping Database & Engine...');
    await initDatabase();
    console.log('[QueryWise] Database ready.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log('------------------------------------------------------------');
      console.log(`  QueryWise Backend API is active`);
      console.log(`  URL: http://localhost:${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log(`  API Base: http://localhost:${PORT}/api`);
      console.log('------------------------------------------------------------');
    });
  } catch (err) {
    console.error('[QueryWise] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

