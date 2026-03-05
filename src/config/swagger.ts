/**
 * Swagger/OpenAPI configuration
 * Loads the API spec from file (canonical: OSM-Notes-Common schemas/openapi/notes-api-v1.yaml).
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getAppConfig } from './app';

/** Project root (one level up from dist when compiled, or from src when using ts-node/Jest). */
function getProjectRoot(): string {
  const dir = __dirname;
  // When compiled: dist/config -> project root is ../..
  if (dir.includes('dist')) {
    return path.resolve(dir, '..', '..');
  }
  // Jest and ts-node: prefer process.cwd() (project root) so openapi/ is found
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'openapi', 'notes-api-v1.yaml'))) return cwd;
  if (fs.existsSync(path.join(cwd, 'lib', 'osm-common', 'schemas', 'openapi', 'notes-api-v1.yaml')))
    return cwd;
  // Fallback: relative to this file (src/config -> ../..)
  return path.resolve(dir, '..', '..');
}

/**
 * Resolve path to the OpenAPI spec file.
 * Order: OPENAPI_SPEC_PATH env, then OSM-Notes-Common submodule, then local openapi/.
 */
function resolveSpecPath(): string {
  const root = getProjectRoot();
  const envPath = process.env.OPENAPI_SPEC_PATH;
  if (envPath) {
    const absolute = path.isAbsolute(envPath) ? envPath : path.resolve(root, envPath);
    if (fs.existsSync(absolute)) return absolute;
  }
  const commonPath = path.join(
    root,
    'lib',
    'osm-common',
    'schemas',
    'openapi',
    'notes-api-v1.yaml'
  );
  if (fs.existsSync(commonPath)) return commonPath;
  const localPath = path.join(root, 'openapi', 'notes-api-v1.yaml');
  if (fs.existsSync(localPath)) return localPath;
  throw new Error(
    'OpenAPI spec not found. Set OPENAPI_SPEC_PATH or add openapi/notes-api-v1.yaml (or OSM-Notes-Common submodule at lib/osm-common/schemas/openapi/).'
  );
}

/**
 * Load and parse the OpenAPI spec (YAML or JSON).
 */
function loadSpec(): Record<string, unknown> {
  const specPath = resolveSpecPath();
  const content = fs.readFileSync(specPath, 'utf8');
  const ext = path.extname(specPath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(content) as Record<string, unknown>;
  }
  return yaml.load(content) as Record<string, unknown>;
}

/**
 * Get the Swagger/OpenAPI specification object.
 * Optionally patches servers[0].url with the current port for development.
 */
export function getSwaggerSpec(): Record<string, unknown> {
  const spec = loadSpec();
  const config = getAppConfig();
  const servers = spec.servers as Array<{ url: string; description?: string }> | undefined;
  if (servers && servers.length > 0 && config.port) {
    servers[0] = {
      ...servers[0],
      url: `http://localhost:${config.port}`,
      description: servers[0].description || 'Development server',
    };
  }
  if (process.env.npm_package_version && spec.info && typeof spec.info === 'object') {
    (spec.info as Record<string, unknown>).version = process.env.npm_package_version;
  }
  return spec;
}

/** Cached spec for Swagger UI and /docs/json (lazy-loaded). */
let cachedSpec: Record<string, unknown> | null = null;

/**
 * Swagger specification for use by swagger-ui-express.
 * Uses cached spec so file is read once.
 */
export const swaggerSpec = ((): Record<string, unknown> => {
  if (!cachedSpec) {
    cachedSpec = getSwaggerSpec();
  }
  return cachedSpec;
})();
