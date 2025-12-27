-- Query Performance Analysis Script
-- Execute EXPLAIN ANALYZE on all API queries to identify performance issues
-- 
-- Usage:
--   # For local testing (osm_notes_api_test):
--   psql -U $(whoami) -d osm_notes_api_test -f scripts/analyze_queries.sql
--
--   # For production (osm_notes_dwh):
--   psql -h $DB_HOST -U $DB_USER -d osm_notes_dwh -f scripts/analyze_queries.sql
--
-- Note: This script checks for table existence before running EXPLAIN ANALYZE.
--       Queries will be skipped if required tables don't exist.

\echo '================================================================================'
\echo 'OSM Notes API - Query Performance Analysis'
\echo '================================================================================'
\echo 'Database: ' :DBNAME
\echo 'User: ' :USER
\echo ''

-- Check if required tables exist
\set has_notes false
\set has_note_comments false
\set has_dwh_schema false

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'notes'
) AS has_notes \gset

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'note_comments'
) AS has_note_comments \gset

SELECT EXISTS (
  SELECT 1 FROM information_schema.schemata 
  WHERE schema_name = 'dwh'
) AS has_dwh_schema \gset

\echo 'Table availability check:'
\echo '  - public.notes: ' :has_notes
\echo '  - public.note_comments: ' :has_note_comments
\echo '  - dwh schema: ' :has_dwh_schema
\echo ''

-- ============================================================================
-- 1. ANALYZE getNoteById Query
-- ============================================================================

\if :has_notes
  \echo '1. Analyzing getNoteById query...'
  \echo '--------------------------------------------------------------------------------'
  
  \set ON_ERROR_STOP off
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
  \set ON_ERROR_STOP on
  
  \echo ''
  \echo 'Check: Look for "Index Scan" on notes.note_id (should use primary key)'
  \echo 'Check: Look for "Index Scan" on note_comments.note_id (should use index)'
  \echo 'Check: Execution time should be < 100ms'
  \echo ''
\else
  \echo '1. Skipping getNoteById query (public.notes table does not exist)'
  \echo ''
\endif

-- ============================================================================
-- 2. ANALYZE getNoteComments Query
-- ============================================================================

\if :has_note_comments
  \echo '2. Analyzing getNoteComments query...'
  \echo '--------------------------------------------------------------------------------'
  
  \set ON_ERROR_STOP off
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
  \set ON_ERROR_STOP on
  
  \echo ''
  \echo 'Check: Look for "Index Scan" on note_comments.note_id'
  \echo 'Check: Look for "Index Scan" on note_comments.created_at for ORDER BY'
  \echo 'Check: Execution time should be < 200ms'
  \echo ''
\else
  \echo '2. Skipping getNoteComments query (public.note_comments table does not exist)'
  \echo ''
\endif

-- ============================================================================
-- 3. ANALYZE searchNotes Query (with country filter)
-- ============================================================================

\if :has_notes
  \echo '3. Analyzing searchNotes query (with country filter)...'
  \echo '--------------------------------------------------------------------------------'
  
  \set ON_ERROR_STOP off
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
  \set ON_ERROR_STOP on
  
  \echo ''
  \echo 'Check: Look for "Index Scan" on notes.id_country'
  \echo 'Check: Look for "Index Scan" on notes.created_at for ORDER BY'
  \echo 'Check: Execution time should be < 500ms'
  \echo ''
\else
  \echo '3. Skipping searchNotes query (public.notes table does not exist)'
  \echo ''
\endif

-- ============================================================================
-- 4. ANALYZE searchNotes Query (with status filter)
-- ============================================================================

\if :has_notes
  \echo '4. Analyzing searchNotes query (with status filter)...'
  \echo '--------------------------------------------------------------------------------'
  
  \set ON_ERROR_STOP off
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
  \set ON_ERROR_STOP on
  
  \echo ''
  \echo 'Check: Look for "Index Scan" on notes.status'
  \echo 'Check: Look for composite index on (status, created_at)'
  \echo 'Check: Execution time should be < 500ms'
  \echo ''
\else
  \echo '4. Skipping searchNotes query (public.notes table does not exist)'
  \echo ''
\endif

-- ============================================================================
-- 5. ANALYZE searchNotes COUNT Query
-- ============================================================================

\if :has_notes
  \echo '5. Analyzing searchNotes COUNT query...'
  \echo '--------------------------------------------------------------------------------'
  
  \set ON_ERROR_STOP off
  EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
  SELECT COUNT(DISTINCT n.note_id) as count
  FROM public.notes n
  WHERE n.id_country = (
    SELECT id_country FROM public.notes WHERE id_country IS NOT NULL LIMIT 1
  );
  \set ON_ERROR_STOP on
  
  \echo ''
  \echo 'Check: COUNT should use index if possible'
  \echo 'Check: Execution time should be < 300ms'
  \echo ''
\else
  \echo '5. Skipping searchNotes COUNT query (public.notes table does not exist)'
  \echo ''
\endif

-- ============================================================================
-- 6-8. ANALYZE Datamart Queries (only if dwh schema exists)
-- ============================================================================

\if :has_dwh_schema
  \echo '6-8. Analyzing datamart queries (dwh schema available)...'
  \echo 'Note: These queries are typically only available in production (osm_notes_dwh)'
  \echo 'For local testing, these will show what would be analyzed in production.'
  \echo ''
\else
  \echo '6-8. Skipping datamart queries (dwh schema not available in test database)'
  \echo 'These queries are only available in production (osm_notes_dwh)'
  \echo ''
\endif

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
\echo 'Note: For production analysis, use osm_notes_dwh database'
\echo '      For local testing, use osm_notes_api_test database'
\echo ''
