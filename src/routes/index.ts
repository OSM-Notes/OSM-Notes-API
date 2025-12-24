/**
 * Main routes index
 */

import { Router } from 'express';
import { getAppConfig } from '../config/app';

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
 * Health check route (will be moved to separate file later)
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
