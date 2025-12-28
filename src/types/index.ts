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
 * Advanced search filters with logical operators
 */
export interface AdvancedSearchFilters extends Omit<SearchFilters, 'hashtag' | 'application'> {
  /**
   * Text search in note comments
   */
  text?: string;
  /**
   * Logical operator to combine filters: 'AND' (default) or 'OR'
   */
  operator?: 'AND' | 'OR';
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

/**
 * Global analytics from datamartGlobal
 */
export interface GlobalAnalytics {
  dimension_global_id: number;
  history_whole_open: number;
  history_whole_closed: number;
  currently_open_count: number | null;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  notes_created_last_30_days: number | null;
  notes_resolved_last_30_days: number | null;
  active_users_count: number | null;
  notes_backlog_size: number | null;
  applications_used?: unknown; // JSON array
  top_countries?: unknown; // JSON array
}

/**
 * Valid metrics for user rankings
 */
export type UserRankingMetric =
  | 'history_whole_open'
  | 'history_whole_closed'
  | 'history_whole_commented'
  | 'resolution_rate'
  | 'avg_days_to_resolution';

/**
 * Valid metrics for country rankings
 */
export type CountryRankingMetric =
  | 'history_whole_open'
  | 'history_whole_closed'
  | 'resolution_rate'
  | 'avg_days_to_resolution'
  | 'notes_health_score';

/**
 * User ranking entry
 */
export interface UserRankingEntry {
  rank: number;
  user_id: number;
  username: string | null;
  value: number | null;
}

/**
 * Country ranking entry
 */
export interface CountryRankingEntry {
  rank: number;
  country_id: number;
  country_name: string | null;
  value: number | null;
}

/**
 * User rankings result
 */
export interface UserRankingsResult {
  metric: UserRankingMetric;
  country?: number;
  order: 'asc' | 'desc';
  rankings: UserRankingEntry[];
}

/**
 * Country rankings result
 */
export interface CountryRankingsResult {
  metric: CountryRankingMetric;
  order: 'asc' | 'desc';
  rankings: CountryRankingEntry[];
}

/**
 * User rankings query parameters
 */
export interface UserRankingsParams {
  metric: UserRankingMetric;
  country?: number;
  limit: number;
  order?: 'asc' | 'desc';
}

/**
 * Country rankings query parameters
 */
export interface CountryRankingsParams {
  metric: CountryRankingMetric;
  limit: number;
  order?: 'asc' | 'desc';
}

/**
 * Hashtag entry
 */
export interface HashtagEntry {
  hashtag: string;
  count: number;
}

/**
 * Hashtag list result
 */
export interface HashtagListResult {
  data: HashtagEntry[];
  pagination: Pagination;
}

/**
 * Hashtag details - user summary
 */
export interface HashtagUserSummary {
  user_id: number;
  username: string | null;
  history_whole_open: number;
  history_whole_closed: number;
}

/**
 * Hashtag details - country summary
 */
export interface HashtagCountrySummary {
  country_id: number;
  country_name: string | null;
  history_whole_open: number;
  history_whole_closed: number;
}

/**
 * Hashtag details result
 */
export interface HashtagDetailsResult {
  hashtag: string;
  users_count: number;
  countries_count: number;
  users: HashtagUserSummary[];
  countries: HashtagCountrySummary[];
}

/**
 * Hashtag list query parameters
 */
export interface HashtagListParams {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}
