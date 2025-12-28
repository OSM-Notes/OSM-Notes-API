/**
 * Metrics routes
 * Exposes Prometheus metrics endpoint
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getMetrics } from '../middleware/metrics';

const router = Router();

/**
 * Async wrapper for route handlers
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Metrics]
 *     description: Exposes metrics in Prometheus format for monitoring
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP http_requests_total Total number of HTTP requests
 *                 # TYPE http_requests_total counter
 *                 http_requests_total{method="GET",route="/api/v1/users/:id",status_code="200"} 42
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error generating metrics');
    }
  })
);

export default router;
