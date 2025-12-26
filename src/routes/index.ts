/**
 * Main routes index
 */

import { Router } from 'express';
import { getAppConfig } from '../config/app';
import healthRouter from './health';
import notesRouter from './notes';

const router = Router();
const { apiVersion } = getAppConfig();

/**
 * API version info endpoint
 */
router.get(`/api/${apiVersion}`, (_req, res) => {
  res.json({
    name: 'OSM Notes API',
    version: process.env.npm_package_version || '0.1.0',
    apiVersion,
    status: 'operational',
  });
});

/**
 * Health check routes
 */
router.use('/health', healthRouter);

/**
 * Notes routes
 */
router.use(`/api/${apiVersion}/notes`, notesRouter);

export default router;
