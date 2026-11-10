import express from 'express';
import {
  analyzeQueryHandler,
  compareQueriesHandler,
  getHistoryHandler,
  getHistoryDetailHandler,
  deleteHistoryHandler,
  getDashboardHandler,
  getHealthHandler,
  getSampleQueriesHandler,
  getDemoSchemaHandler,
} from '../controllers/queryController.js';

const router = express.Router();

// Analysis & Performance Intelligence
router.post('/analyze', analyzeQueryHandler);
router.post('/compare', compareQueriesHandler);

// History & Auditing
router.get('/history', getHistoryHandler);
router.get('/history/:id', getHistoryDetailHandler);
router.delete('/history/:id', deleteHistoryHandler);

// Dashboard Aggregates
router.get('/dashboard', getDashboardHandler);

// Health & Presets
router.get('/health', getHealthHandler);
router.get('/demo/samples', getSampleQueriesHandler);
router.get('/demo/schema', getDemoSchemaHandler);

export default router;

