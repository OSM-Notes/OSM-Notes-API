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
 * Stored ML note classification from DWH `dwh.note_type_classifications`
 * (populated by OSM-Notes-Analytics batch classify / ml_03 — not live pgml inference in the API).
 */
export interface NoteMlClassification {
  note_id: number;
  main_category: string;
  category_confidence: number;
  category_method: string;
  specific_type: string;
  type_confidence: number;
  /** Per-class probabilities when present in DWH (JSONB). */
  type_probabilities: Record<string, unknown> | null;
  type_method: string;
  recommended_action: string;
  action_confidence: number;
  action_method: string;
  priority_score: number;
  classification_version: string | null;
  classification_timestamp: Date;
  updated_at: Date;
  classification_factors: Record<string, unknown> | null;
  similar_notes: number[] | null;
  estimated_resolution_time: number | null;
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
  /**
   * Cursor for keyset pagination (opaque string from previous response's next_cursor).
   * If present, cursor mode is used and `page` is ignored.
   */
  after?: string;
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
 * Pagination metadata (page/offset mode)
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Cursor pagination metadata (keyset mode)
 */
export interface CursorPagination {
  limit: number;
  /** Opaque cursor to fetch the next page (use as `after` param). Absent if no more results. */
  next_cursor?: string;
  /** Total count (optional; may be omitted in cursor mode for performance). */
  total?: number;
}

/**
 * Search result with pagination (page/offset mode)
 */
export interface SearchResult<T> {
  data: T[];
  pagination: Pagination;
  filters?: Partial<SearchFilters>;
}

/**
 * Search result with cursor pagination (keyset mode)
 */
export interface CursorSearchResult<T> {
  data: T[];
  pagination: CursorPagination;
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
  /** Derived in API from history_YYYY_open / history_YYYY_closed (optional legacy column activity_by_year) */
  activity_by_year?: unknown; // JSON object
}

/**
 * Inferred user ID link based on username activity.
 */
export interface InferredUserIdLink {
  user_id: number;
  username: string;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  comments_count: number;
  notes_count: number;
  status: 'active' | 'inactive';
}

/**
 * Inferred lifecycle event for a user identity.
 */
export interface InferredLifecycleEvent {
  event_type: 'first_seen' | 'last_seen' | 'possible_user_id_change';
  occurred_at: Date | string;
  user_id: number;
  username: string;
  related_user_id?: number;
  confidence: 'low' | 'medium';
  inferred: true;
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
  /** Derived in API from history_YYYY_open / history_YYYY_closed (optional legacy column activity_by_year) */
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
 * Parameters for listing users
 */
export interface UserListParams {
  page?: number;
  limit?: number;
  sort?: 'user_id' | 'username' | 'history_whole_open' | 'history_whole_closed' | 'resolution_rate';
  order?: 'asc' | 'desc';
}

/**
 * Parameters for listing countries
 */
export interface CountryListParams {
  page?: number;
  limit?: number;
  sort?:
    | 'country_id'
    | 'country_name'
    | 'history_whole_open'
    | 'history_whole_closed'
    | 'resolution_rate';
  order?: 'asc' | 'desc';
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

/**
 * User comparison entry
 */
export interface UserComparisonEntry {
  user_id: number;
  username: string | null;
  history_whole_open: number;
  history_whole_closed: number;
  history_whole_commented: number;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  user_response_time: number | null;
}

/**
 * Country comparison entry
 */
export interface CountryComparisonEntry {
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
}

/**
 * Comparison result for users
 */
export interface UserComparisonResult {
  type: 'users';
  entities: UserComparisonEntry[];
}

/**
 * Comparison result for countries
 */
export interface CountryComparisonResult {
  type: 'countries';
  entities: CountryComparisonEntry[];
}

/**
 * Union type for comparison results
 */
export type ComparisonResult = UserComparisonResult | CountryComparisonResult;

/**
 * Trend entry for a specific year
 */
export interface TrendEntry {
  year: string;
  open: number;
  closed: number;
}

/**
 * Trends query parameters
 */
export interface TrendsParams {
  type: 'users' | 'countries' | 'global';
  user_id?: number;
  country_id?: number;
}

/**
 * Trends result
 */
export interface TrendsResult {
  type: 'users' | 'countries' | 'global';
  entity_id?: number;
  entity_name?: string | null;
  trends: TrendEntry[];
  working_hours?: number[]; // Array of 168 numbers (24 hours * 7 days)
}
