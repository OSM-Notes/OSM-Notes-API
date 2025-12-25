/**
 * Main routes index
 */

import { Router } from 'express';
import { getAppConfig } from '../config/app';
import healthRouter from './health';

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

export default router;
