/**
 * Cursor utilities for keyset pagination
 *
 * Cursor format: base64(JSON({ created_at: ISO string, note_id: number }))
 * This is opaque to the client; the server encodes/decodes it.
 */

export interface CursorData {
  created_at: string; // ISO 8601
  note_id: number;
}

/**
 * Encode cursor data to an opaque string (base64 JSON).
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/**
 * Decode an opaque cursor string back to CursorData.
 * Returns null if the cursor is invalid or malformed.
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(json) as unknown;
    if (
      typeof data === 'object' &&
      data !== null &&
      'created_at' in data &&
      'note_id' in data &&
      typeof (data as CursorData).created_at === 'string' &&
      typeof (data as CursorData).note_id === 'number'
    ) {
      return data as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build cursor from the last item in a list of notes.
 * Returns undefined if the list is empty.
 */
export function buildNextCursor(
  items: Array<{ created_at: Date; note_id: number }>,
  limit: number
): string | undefined {
  if (items.length === 0 || items.length < limit) {
    return undefined;
  }
  const last = items[items.length - 1];
  return encodeCursor({
    created_at: last.created_at.toISOString(),
    note_id: last.note_id,
  });
}
