/**
 * Transform internal Note and NoteComment types to OSM API 0.6 JSON format (GeoJSON FeatureCollection).
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Map_Notes_API
 */

import type { Note, NoteComment } from '../types';

/** GeoJSON Point (longitude, latitude) */
interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

/** GeoJSON Feature with Point geometry */
interface GeoJsonFeature<TProps = unknown> {
  type: 'Feature';
  geometry: GeoJsonPoint;
  properties: TProps;
}

/** GeoJSON FeatureCollection */
interface GeoJsonFeatureCollection<TProps = unknown> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<TProps>[];
}

/**
 * OSM API 0.6 comment shape (single comment in a note)
 */
export interface OsmComment {
  date: string;
  uid?: number;
  user?: string;
  user_url?: string;
  action: string;
  text: string | null;
  html?: string;
}

/**
 * OSM API 0.6 note properties (GeoJSON feature properties)
 */
export interface OsmNoteProperties {
  id: number;
  url: string;
  comment_url: string;
  close_url: string;
  date_created: string;
  status: string;
  closed_at?: string | null;
  comments: OsmComment[];
}

/**
 * Format a Date to OSM-style string "YYYY-MM-DD HH:mm:ss UTC"
 */
function formatOsmDate(d: Date): string {
  return d
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Build base URL for OSM-style links (e.g. note url, comment_url)
 */
export function getOsmNotesBaseUrl(req: {
  protocol: string;
  get: (name: string) => string | undefined;
}): string {
  const protocol = req.protocol || 'https';
  const host = req.get?.('host') || req.get?.('Host') || 'localhost:3000';
  return `${protocol}://${host}/api/0.6/notes`;
}

/**
 * Convert internal NoteComment to OSM comment shape
 */
function toOsmComment(c: NoteComment, _baseUrl: string): OsmComment {
  const created = c.created_at instanceof Date ? c.created_at : new Date(c.created_at);
  const comment: OsmComment = {
    date: formatOsmDate(created),
    action: c.action || 'opened',
    text: c.text ?? null,
  };
  if (c.user_id != null) comment.uid = c.user_id;
  if (c.username) {
    comment.user = c.username;
    // user_url could point to OSM user profile; we don't have it, omit or use placeholder
  }
  if (c.text) comment.html = `<p>${escapeHtml(c.text)}</p>`;
  return comment;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert internal Note + comments to OSM GeoJSON Feature properties
 */
export function noteToOsmProperties(
  note: Note,
  comments: NoteComment[],
  baseUrl: string
): OsmNoteProperties {
  const created = note.created_at instanceof Date ? note.created_at : new Date(note.created_at);
  const id = note.note_id;
  const notePath = `${baseUrl}/${id}.json`;
  return {
    id,
    url: notePath,
    comment_url: `${baseUrl}/${id}/comment.json`,
    close_url: `${baseUrl}/${id}/close.json`,
    date_created: formatOsmDate(created),
    status: note.status,
    closed_at: note.closed_at
      ? note.closed_at instanceof Date
        ? formatOsmDate(note.closed_at)
        : String(note.closed_at)
      : null,
    comments: comments.map((c) => toOsmComment(c, baseUrl)),
  };
}

/**
 * Build a single note as GeoJSON Feature for OSM 0.6 response
 */
export function noteToOsmFeature(
  note: Note,
  comments: NoteComment[],
  baseUrl: string
): GeoJsonFeature<OsmNoteProperties> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [note.longitude, note.latitude],
    },
    properties: noteToOsmProperties(note, comments, baseUrl),
  };
}

/**
 * Build GeoJSON FeatureCollection for OSM 0.6 list responses (bbox or search)
 */
export function notesToOsmFeatureCollection(
  notes: Note[],
  commentsByNoteId: Map<number, NoteComment[]>,
  baseUrl: string
): GeoJsonFeatureCollection<OsmNoteProperties> {
  const features = notes.map((note) => {
    const comments = commentsByNoteId.get(note.note_id) ?? [];
    return noteToOsmFeature(note, comments, baseUrl);
  });
  return {
    type: 'FeatureCollection',
    features,
  };
}
