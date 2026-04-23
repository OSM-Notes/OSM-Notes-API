/**
 * DWH schema contract check — aligned with OSM-Notes-Analytics
 * (public.schema_version, component dwh; see docs/Schema_Versioning_DWH.md there).
 */

import type { Pool } from 'pg';

/** Safe component id for SQL (same rules as Analytics etc/schema_compatibility.sh) */
export function isSafeSchemaComponentId(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(s);
}

/**
 * Compare MAJOR.MINOR.PATCH. Non-numeric parts default to 0.
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) {
      return 1;
    }
    if (av < bv) {
      return -1;
    }
  }
  return 0;
}

/**
 * Inclusive min, max may be "1.0.x" (any patch in minor line) per Analytics.
 */
export function isDwhVersionInRange(
  dbVersion: string,
  minVersion: string,
  maxVersion: string | undefined | null
): boolean {
  if (compareSemver(dbVersion, minVersion) < 0) {
    return false;
  }
  if (maxVersion === undefined || maxVersion === null || maxVersion.trim() === '') {
    return true;
  }
  const m = maxVersion.trim().match(/^(\d+)\.(\d+)\.[xX]$/);
  if (m) {
    const major = parseInt(m[1], 10);
    const minor = parseInt(m[2], 10);
    const effectiveMax = `${major}.${minor + 1}.0`;
    // db must be < effectiveMax (same as Analytics MAX_EXCLUSIVE)
    return compareSemver(dbVersion, effectiveMax) < 0;
  }
  if (compareSemver(dbVersion, maxVersion) > 0) {
    return false;
  }
  return true;
}

export interface DwhSchemaCheckConfig {
  enabled: boolean;
  component: string;
  minVersion: string;
  maxVersion: string;
}

export function getDwhSchemaCheckConfigFromEnv(): DwhSchemaCheckConfig {
  const enabled =
    (process.env.DWH_SCHEMA_CHECK_ENABLED || '').toLowerCase() === 'true' ||
    (process.env.DWH_SCHEMA_CHECK_ENABLED || '') === '1';
  const component = (process.env.SCHEMA_DWH_COMPONENT || 'dwh').trim();
  const minVersion = (process.env.EXPECTED_DWH_SCHEMA_MIN || '1.0.0').trim();
  const maxVersion = (process.env.EXPECTED_DWH_SCHEMA_MAX || '1.0.x').trim();
  if (!isSafeSchemaComponentId(component)) {
    throw new Error('Invalid SCHEMA_DWH_COMPONENT (alphanumeric, underscore, hyphen; 1–64 chars)');
  }
  return { enabled, component, minVersion, maxVersion };
}

export type DwhSchemaCheckStatus = 'ok' | 'disabled' | 'missing' | 'incompatible' | 'error';

export interface DwhSchemaCheckResult {
  status: DwhSchemaCheckStatus;
  version?: string;
  details?: string;
}

/**
 * Query DB and verify dwh (or other component) version is in expected range.
 */
export async function runDwhSchemaCheck(
  pool: Pool,
  config: DwhSchemaCheckConfig
): Promise<DwhSchemaCheckResult> {
  if (!config.enabled) {
    return { status: 'disabled' };
  }
  try {
    const res = await pool.query<{ version: string }>(
      'SELECT version FROM public.schema_version WHERE component = $1',
      [config.component]
    );
    if (res.rows.length === 0) {
      return {
        status: 'missing',
        details: `No row in public.schema_version for component='${config.component}'`,
      };
    }
    const v = (res.rows[0].version || '').trim();
    if (!v) {
      return { status: 'missing', details: 'Empty version in public.schema_version' };
    }
    if (!isDwhVersionInRange(v, config.minVersion, config.maxVersion)) {
      return {
        status: 'incompatible',
        version: v,
        details: `Version ${v} is outside [${config.minVersion}, ${config.maxVersion ?? '…'}]`,
      };
    }
    return { status: 'ok', version: v };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status: 'error',
      details: msg,
    };
  }
}
