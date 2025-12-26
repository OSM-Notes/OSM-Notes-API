/**
 * TypeScript type definitions
 */

/**
 * Note status types
 */
export type NoteStatus = 'open' | 'closed' | 'reopened';

/**
 * Note from database
 */
export interface Note {
  note_id: number;
  latitude: number;
  longitude: number;
  status: NoteStatus;
  created_at: Date;
  closed_at: Date | null;
  id_user: number | null;
  id_country: number | null;
  comments_count?: number;
}

/**
 * Note comment from database
 */
export interface NoteComment {
  comment_id: number;
  note_id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  created_at: Date;
  text: string | null;
}

/**
 * Search filters for notes
 */
export interface SearchFilters {
  country?: number;
  status?: NoteStatus;
  hashtag?: string;
  date_from?: string;
  date_to?: string;
  user_id?: number;
  application?: string;
  bbox?: string; // Format: "min_lon,min_lat,max_lon,max_lat"
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Search result with pagination
 */
export interface SearchResult<T> {
  data: T[];
  pagination: Pagination;
  filters?: Partial<SearchFilters>;
}
