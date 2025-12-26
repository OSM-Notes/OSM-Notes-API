/**
 * API Documentation routes (Swagger)
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';

const router = Router();

/**
 * Swagger UI documentation
 * Available at /docs
 */
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'OSM Notes API Documentation',
  })
);

/**
 * OpenAPI JSON specification
 * Available at /docs/json
 */
router.get('/json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
