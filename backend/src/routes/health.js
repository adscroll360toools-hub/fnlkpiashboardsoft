// backend/src/routes/health.js
import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * Simple health-check endpoint to verify the server is running.
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ace-pilot-backend',
    version: '1.0.0',
  });
});

export default router;
