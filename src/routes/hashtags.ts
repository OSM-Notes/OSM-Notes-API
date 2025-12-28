/**
 * Hashtags routes
 * Defines routes for hashtags endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as hashtagsController from '../controllers/hashtagsController';
import { validateUserAgent } from '../middleware/validateUserAgent';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { requestLogger } from '../middleware/requestLogger';
import { metricsMiddleware } from '../middleware/metrics';

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
 * GET /api/v1/hashtags
 * Get list of hashtags with usage counts
 */
router.get(
  '/',
  validateUserAgent,
  rateLimitMiddleware,
  requestLogger,
  metricsMiddleware,
  asyncHandler(hashtagsController.getHashtags)
);

/**
 * GET /api/v1/hashtags/:hashtag
 * Get details for a specific hashtag
 */
router.get(
  '/:hashtag',
  validateUserAgent,
  rateLimitMiddleware,
  requestLogger,
  metricsMiddleware,
  asyncHandler(hashtagsController.getHashtagDetails)
);

export default router;
