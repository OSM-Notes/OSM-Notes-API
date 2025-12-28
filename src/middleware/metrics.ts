/**
 * Prometheus metrics middleware
 * Collects and exposes metrics for monitoring
 *
 * @module middleware/metrics
 * @description
 * This middleware collects Prometheus metrics for:
 * - HTTP request duration (histogram)
 * - HTTP request count (counter)
 * - Error count (counter)
 *
 * Metrics are exposed via the `/metrics` endpoint in Prometheus format.
 */

import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

/**
 * Prometheus registry
 */
const register = new promClient.Registry();

/**
 * Collect default Node.js metrics (CPU, memory, etc.)
 */
promClient.collectDefaultMetrics({ register });

/**
 * HTTP request duration histogram
 * Tracks response time in seconds
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Response time buckets
  registers: [register],
});

/**
 * HTTP request count counter
 * Tracks total number of HTTP requests
 */
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * HTTP error count counter
 * Tracks number of HTTP errors (4xx and 5xx)
 */
const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Rate limit exceeded counter
 * Tracks number of requests blocked by rate limiting
 */
const rateLimitExceededTotal = new promClient.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of requests blocked by rate limiting',
  labelNames: ['ip', 'user_agent'],
  registers: [register],
});

/**
 * Normalize route path for metrics
 * Replaces dynamic segments with placeholders
 *
 * @param path - Request path
 * @returns Normalized path
 */
function normalizeRoute(path: string): string {
  // Replace numeric IDs with :id placeholder
  return path.replace(/\/\d+/g, '/:id').replace(/\/api\/v\d+/g, '/api/:version');
}

/**
 * Metrics middleware
 * Tracks HTTP requests and responses
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  let routePath: string = req.path || 'unknown';

  // Safely access req.route.path if available
  if (req.route && typeof req.route === 'object' && 'path' in req.route) {
    const routeObj = req.route as { path?: unknown };
    if (routeObj.path && typeof routeObj.path === 'string') {
      routePath = routeObj.path;
    }
  }

  const route = normalizeRoute(routePath);
  const method = req.method;

  // Start timer for duration metric
  const endTimer = httpRequestDuration.startTimer({
    method,
    route,
  });

  // Track response finish
  res.on('finish', () => {
    const statusCode = res.statusCode.toString();

    // End timer and observe duration
    endTimer({
      status_code: statusCode,
    });

    // Increment request counter
    httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      httpErrorsTotal.inc({
        method,
        route,
        status_code: statusCode,
      });
    }
  });

  next();
}

/**
 * Get metrics in Prometheus format
 *
 * @returns Promise resolving to metrics string
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Track rate limit exceeded event
 *
 * @param ip - IP address that exceeded rate limit
 * @param userAgent - User-Agent that exceeded rate limit
 */
export function trackRateLimitExceeded(ip: string, userAgent: string): void {
  rateLimitExceededTotal.inc({
    ip: ip || 'unknown',
    user_agent: userAgent || 'unknown',
  });
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
