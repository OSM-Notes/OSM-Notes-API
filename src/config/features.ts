/**
 * Feature flags derived from validated environment.
 */

import { getEnv } from './env';

/**
 * ML note classification via DWH (stored rows from Analytics batch classify — no pgml.predict in API).
 */
export function isMlNoteClassificationEnabled(): boolean {
  return getEnv().ML_NOTE_CLASSIFICATION_ENABLED === 'true';
}
