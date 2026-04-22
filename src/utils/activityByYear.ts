/**
 * Build API "activity by year" maps and trend series from datamart columns.
 * Source of truth in OSM-Notes-Analytics: history_YYYY_open / history_YYYY_closed
 * (plus history_year_open / history_year_closed as rolling "current year" window).
 * Optional legacy column activity_by_year (JSON) is used only if no per-year columns match.
 */

import type { TrendEntry } from '../types';

const HISTORY_YEAR_RE = /^history_(\d{4})_(open|closed)$/;

function toNumber(val: unknown): number {
  if (val === null || val === undefined) {
    return 0;
  }
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function tryParseLegacyActivityByYear(
  raw: unknown
): Record<string, { open: number; closed: number }> | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  try {
    const activity: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
      return null;
    }
    const out: Record<string, { open: number; closed: number }> = {};
    for (const [year, data] of Object.entries(activity as Record<string, unknown>)) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const d = data as Record<string, unknown>;
        if ('open' in d && 'closed' in d) {
          out[year] = { open: toNumber(d.open), closed: toNumber(d.closed) };
        }
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Object keyed by year with open/closed counts, for user/country profile JSON.
 */
export function buildActivityByYearFromRow(
  row: Record<string, unknown>
): Record<string, { open: number; closed: number }> {
  const byYear: Record<string, { open: number; closed: number }> = {};
  for (const [key, val] of Object.entries(row)) {
    const m = key.match(HISTORY_YEAR_RE);
    if (!m) {
      continue;
    }
    const year = m[1];
    const which = m[2] as 'open' | 'closed';
    const n = toNumber(val);
    if (!byYear[year]) {
      byYear[year] = { open: 0, closed: 0 };
    }
    byYear[year][which] = n;
  }
  if (Object.keys(byYear).length > 0) {
    return byYear;
  }
  const legacy = tryParseLegacyActivityByYear(row.activity_by_year);
  if (legacy) {
    return legacy;
  }
  return {};
}

function objectToTrendEntries(obj: Record<string, { open: number; closed: number }>): TrendEntry[] {
  return Object.keys(obj)
    .sort()
    .map((y) => ({ year: y, open: obj[y].open, closed: obj[y].closed }));
}

/**
 * When no history_YYYY_* values exist, use rolling "current year" metrics (Analytics).
 */
function trendFromHistoryYearRow(row: Record<string, unknown>): TrendEntry | null {
  const ho = row.history_year_open;
  const hc = row.history_year_closed;
  if (ho === null || ho === undefined) {
    if (hc === null || hc === undefined) {
      return null;
    }
  }
  const y = new Date().getUTCFullYear();
  return {
    year: String(y),
    open: toNumber(ho),
    closed: toNumber(hc),
  };
}

export type ActivityTrendsMode = 'user' | 'country' | 'global';

/**
 * Build sorted trend points for the analytics trends API.
 */
export function buildTrendsFromDatamartRow(
  row: Record<string, unknown>,
  _mode: ActivityTrendsMode
): TrendEntry[] {
  const fromCols = buildActivityByYearFromRow(row);
  if (Object.keys(fromCols).length > 0) {
    return objectToTrendEntries(fromCols);
  }
  const single = trendFromHistoryYearRow(row);
  if (single) {
    return [single];
  }
  return [];
}
