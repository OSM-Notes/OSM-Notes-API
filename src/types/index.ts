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

/**
 * User profile from datamartUsers
 */
export interface UserProfile {
  dimension_user_id: number;
  user_id: number;
  username: string | null;
  history_whole_open: number;
  history_whole_closed: number;
  history_whole_commented: number;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  user_response_time: number | null;
  days_since_last_action: number | null;
  applications_used?: unknown; // JSON array
  collaboration_patterns?: unknown; // JSON object
  countries_open_notes?: unknown; // JSON array
  hashtags?: unknown; // JSON array (string[])
  date_starting_creating_notes?: Date | string | null;
  date_starting_solving_notes?: Date | string | null;
  last_year_activity?: string | null;
  working_hours_of_week_opening?: unknown; // JSON array (number[])
  activity_by_year?: unknown; // JSON object
}

/**
 * Country profile from datamartCountries
 */
export interface CountryProfile {
  dimension_country_id: number;
  country_id: number;
  country_name: string | null;
  country_name_en: string | null;
  country_name_es: string | null;
  iso_alpha2: string | null;
  history_whole_open: number;
  history_whole_closed: number;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  notes_health_score: number | null;
  new_vs_resolved_ratio: number | null;
  notes_backlog_size: number | null;
  notes_created_last_30_days: number | null;
  notes_resolved_last_30_days: number | null;
  users_open_notes?: unknown; // JSON array
  applications_used?: unknown; // JSON array
  hashtags?: unknown; // JSON array (string[])
  activity_by_year?: unknown; // JSON object
  working_hours_of_week_opening?: unknown; // JSON array (number[])
}
