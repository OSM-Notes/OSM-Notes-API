/**
 * OpenStreetMap attribution for API responses that contain OSM data or derivatives.
 * Use in responses so clients can display proper attribution (e.g. on maps or in UIs).
 *
 * @see https://www.openstreetmap.org/copyright
 */

export const OSM_ATTRIBUTION = {
  text: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
} as const;

export type OsmAttribution = typeof OSM_ATTRIBUTION;
