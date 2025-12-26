/**
 * Main routes index
 */

import { Router } from 'express';
import { getAppConfig } from '../config/app';
import healthRouter from './health';
import notesRouter from './notes';
import usersRouter from './users';
import countriesRouter from './countries';
import analyticsRouter from './analytics';

const router = Router();
const { apiVersion } = getAppConfig();

/**
 * @swagger
 * /api/v1:
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

/**
 * Users routes
 */
router.use(`/api/${apiVersion}/users`, usersRouter);

/**
 * Countries routes
 */
router.use(`/api/${apiVersion}/countries`, countriesRouter);

/**
 * Analytics routes
 */
router.use(`/api/${apiVersion}/analytics`, analyticsRouter);

export default router;
