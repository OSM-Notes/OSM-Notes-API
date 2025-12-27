-- Query Performance Analysis Script
-- Execute EXPLAIN ANALYZE on all API queries to identify performance issues
-- 
-- Usage:
--   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/analyze_queries.sql
--
-- This script analyzes the actual query execution plans and provides
-- recommendations based on real database statistics.

\echo '================================================================================'
\echo 'OSM Notes API - Query Performance Analysis'
\echo '================================================================================'
\echo ''

-- ============================================================================
-- 1. ANALYZE getNoteById Query
-- ============================================================================

\echo '1. Analyzing getNoteById query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE n.note_id = (
  SELECT note_id FROM public.notes LIMIT 1
)
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country;

\echo ''
\echo 'Check: Look for "Index Scan" on notes.note_id (should use primary key)'
\echo 'Check: Look for "Index Scan" on note_comments.note_id (should use index)'
\echo 'Check: Execution time should be < 100ms'
\echo ''

-- ============================================================================
-- 2. ANALYZE getNoteComments Query
-- ============================================================================

\echo '2. Analyzing getNoteComments query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  nc.comment_id,
  nc.note_id,
  nc.user_id,
  u.username,
  nc.action,
  nc.created_at,
  nct.text
FROM public.note_comments nc
LEFT JOIN public.users u ON nc.user_id = u.user_id
LEFT JOIN public.note_comments_text nct ON nc.comment_id = nct.comment_id
WHERE nc.note_id = (
  SELECT note_id FROM public.notes LIMIT 1
)
ORDER BY nc.created_at ASC
LIMIT 100;

\echo ''
\echo 'Check: Look for "Index Scan" on note_comments.note_id'
\echo 'Check: Look for "Index Scan" on note_comments.created_at for ORDER BY'
\echo 'Check: Execution time should be < 200ms'
\echo ''

-- ============================================================================
-- 3. ANALYZE searchNotes Query (with country filter)
-- ============================================================================

\echo '3. Analyzing searchNotes query (with country filter)...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE n.id_country = (
  SELECT id_country FROM public.notes WHERE id_country IS NOT NULL LIMIT 1
)
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
ORDER BY n.created_at DESC
LIMIT 20 OFFSET 0;

\echo ''
\echo 'Check: Look for "Index Scan" on notes.id_country'
\echo 'Check: Look for "Index Scan" on notes.created_at for ORDER BY'
\echo 'Check: Execution time should be < 500ms'
\echo ''

-- ============================================================================
-- 4. ANALYZE searchNotes Query (with status filter)
-- ============================================================================

\echo '4. Analyzing searchNotes query (with status filter)...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE n.status = 'open'
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
ORDER BY n.created_at DESC
LIMIT 20 OFFSET 0;

\echo ''
\echo 'Check: Look for "Index Scan" on notes.status'
\echo 'Check: Look for composite index on (status, created_at)'
\echo 'Check: Execution time should be < 500ms'
\echo ''

-- ============================================================================
-- 5. ANALYZE searchNotes COUNT Query
-- ============================================================================

\echo '5. Analyzing searchNotes COUNT query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(DISTINCT n.note_id) as count
FROM public.notes n
WHERE n.id_country = (
  SELECT id_country FROM public.notes WHERE id_country IS NOT NULL LIMIT 1
);

\echo ''
\echo 'Check: COUNT should use index if possible'
\echo 'Check: Execution time should be < 300ms'
\echo ''

-- ============================================================================
-- 6. ANALYZE getUserProfile Query
-- ============================================================================

\echo '6. Analyzing getUserProfile query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  dimension_user_id,
  user_id,
  username,
  history_whole_open,
  history_whole_closed,
  history_whole_commented,
  avg_days_to_resolution,
  resolution_rate,
  user_response_time,
  days_since_last_action,
  applications_used,
  collaboration_patterns,
  countries_open_notes,
  hashtags,
  date_starting_creating_notes,
  date_starting_solving_notes,
  last_year_activity,
  working_hours_of_week_opening,
  activity_by_year
FROM dwh.datamartUsers
WHERE user_id = (
  SELECT user_id FROM dwh.datamartUsers LIMIT 1
);

\echo ''
\echo 'Check: Look for "Index Scan" on datamartUsers.user_id'
\echo 'Check: Execution time should be < 50ms'
\echo ''

-- ============================================================================
-- 7. ANALYZE getCountryProfile Query
-- ============================================================================

\echo '7. Analyzing getCountryProfile query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  dimension_country_id,
  country_id,
  country_name,
  country_name_en,
  country_name_es,
  iso_alpha2,
  history_whole_open,
  history_whole_closed,
  avg_days_to_resolution,
  resolution_rate,
  notes_health_score,
  new_vs_resolved_ratio,
  notes_backlog_size,
  notes_created_last_30_days,
  notes_resolved_last_30_days,
  users_open_notes,
  applications_used,
  hashtags,
  activity_by_year,
  working_hours_of_week_opening
FROM dwh.datamartCountries
WHERE country_id = (
  SELECT country_id FROM dwh.datamartCountries LIMIT 1
);

\echo ''
\echo 'Check: Look for "Index Scan" on datamartCountries.country_id'
\echo 'Check: Execution time should be < 50ms'
\echo ''

-- ============================================================================
-- 8. ANALYZE getGlobalAnalytics Query
-- ============================================================================

\echo '8. Analyzing getGlobalAnalytics query...'
\echo '--------------------------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  dimension_global_id,
  history_whole_open,
  history_whole_closed,
  currently_open_count,
  avg_days_to_resolution,
  resolution_rate,
  notes_created_last_30_days,
  notes_resolved_last_30_days,
  active_users_count,
  notes_backlog_size,
  applications_used,
  top_countries
FROM dwh.datamartGlobal
LIMIT 1;

\echo ''
\echo 'Check: Should use sequential scan (only 1 row expected)'
\echo 'Check: Execution time should be < 10ms'
\echo ''

-- ============================================================================
-- 9. CHECK EXISTING INDEXES
-- ============================================================================

\echo '================================================================================'
\echo '9. Checking existing indexes...'
\echo '================================================================================'

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname IN ('public', 'dwh')
  AND tablename IN ('notes', 'note_comments', 'note_comments_text', 'datamartUsers', 'datamartCountries', 'datamartGlobal')
ORDER BY schemaname, tablename, indexname;

\echo ''
\echo 'Check: Verify that recommended indexes exist'
\echo ''

-- ============================================================================
-- 10. CHECK INDEX USAGE STATISTICS
-- ============================================================================

\echo '================================================================================'
\echo '10. Checking index usage statistics...'
\echo '================================================================================'

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'dwh')
  AND tablename IN ('notes', 'note_comments', 'note_comments_text', 'datamartUsers', 'datamartCountries', 'datamartGlobal')
ORDER BY idx_scan DESC;

\echo ''
\echo 'Check: Indexes with 0 scans may be unused and can be dropped'
\echo ''

-- ============================================================================
-- 11. CHECK TABLE SIZES
-- ============================================================================

\echo '================================================================================'
\echo '11. Checking table sizes...'
\echo '================================================================================'

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes
FROM pg_tables
WHERE schemaname IN ('public', 'dwh')
  AND tablename IN ('notes', 'note_comments', 'note_comments_text', 'datamartUsers', 'datamartCountries', 'datamartGlobal')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo 'Check: Large tables may need more aggressive indexing'
\echo ''

-- ============================================================================
-- 12. CHECK TABLE STATISTICS
-- ============================================================================

\echo '================================================================================'
\echo '12. Checking table statistics (row counts)...'
\echo '================================================================================'

SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'dwh')
  AND tablename IN ('notes', 'note_comments', 'note_comments_text', 'datamartUsers', 'datamartCountries', 'datamartGlobal')
ORDER BY n_live_tup DESC;

\echo ''
\echo 'Check: Tables with many dead rows may need VACUUM'
\echo 'Check: Tables without recent ANALYZE may have stale statistics'
\echo ''

-- ============================================================================
-- SUMMARY AND RECOMMENDATIONS
-- ============================================================================

\echo '================================================================================'
\echo 'ANALYSIS COMPLETE'
\echo '================================================================================'
\echo ''
\echo 'Next Steps:'
\echo '1. Review EXPLAIN ANALYZE output above'
\echo '2. Identify queries using "Seq Scan" instead of "Index Scan"'
\echo '3. Check execution times - flag queries > 500ms'
\echo '4. Create missing indexes using: scripts/create_indexes.sql'
\echo '5. Run ANALYZE on tables with stale statistics'
\echo '6. Consider VACUUM on tables with many dead rows'
\echo ''

