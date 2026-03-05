/**
 * Main routes index
 */

import { Router } from 'express';
import { getAppConfig } from '../config/app';
import healthRouter from './health';
import metricsRouter from './metrics';
import notesRouter from './notes';
import usersRouter from './users';
import countriesRouter from './countries';
import analyticsRouter from './analytics';
import searchRouter from './search';
import hashtagsRouter from './hashtags';
import osmCompatRouter from './osmCompat';

const router = Router();
const { apiVersion } = getAppConfig();

/** Base path for this project's API (notes-api v1, v2, ...) */
const notesApiBase = `notes-api/${apiVersion}`;

/**
 * @swagger
 * /notes-api/v1:
 *   get:
 *     summary: Get API version information
 *     tags: [Info]
 *     security:
 *       - UserAgent: []
 *     responses:
 *       200:
 *         description: API version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: OSM Notes API
 *                 version:
 *                   type: string
 *                   example: 0.1.0
 *                 apiVersion:
 *                   type: string
 *                   example: v1
 *                 status:
 *                   type: string
 *                   example: operational
 */
router.get(`/${notesApiBase}`, (_req, res) => {
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
 * Metrics routes (Prometheus)
 */
router.use('/metrics', metricsRouter);

/**
 * OSM API 0.6 compatibility (notes only, read-only)
 * Same paths/params as api.openstreetmap.org for easy migration.
 */
router.use('/api/0.6/notes', osmCompatRouter);

/**
 * Notes routes (this project's API)
 */
router.use(`/${notesApiBase}/notes`, notesRouter);

/**
 * Users routes
 */
router.use(`/${notesApiBase}/users`, usersRouter);

/**
 * Countries routes
 */
router.use(`/${notesApiBase}/countries`, countriesRouter);

/**
 * Analytics routes
 */
router.use(`/${notesApiBase}/analytics`, analyticsRouter);

/**
 * Search routes
 */
router.use(`/${notesApiBase}/search`, searchRouter);

/**
 * Hashtags routes
 */
router.use(`/${notesApiBase}/hashtags`, hashtagsRouter);

export default router;
