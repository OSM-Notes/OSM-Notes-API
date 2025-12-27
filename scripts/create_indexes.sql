-- Performance Optimization Indexes for OSM Notes API
-- Run this script to create recommended indexes for optimal query performance
-- 
-- Usage:
--   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/create_indexes.sql
--
-- Note: Some indexes may already exist. The script uses IF NOT EXISTS to avoid errors.

-- ============================================================================
-- CRITICAL INDEXES - Required for basic query performance
-- ============================================================================

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_note_id ON public.notes(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_id_country ON public.notes(id_country);
CREATE INDEX IF NOT EXISTS idx_notes_id_user ON public.notes(id_user);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);

-- Note comments table indexes
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_created_at ON public.note_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_note_comments_user_id ON public.note_comments(user_id);

-- Composite index for note comments queries (note_id + created_at for ORDER BY)
CREATE INDEX IF NOT EXISTS idx_note_comments_note_created ON public.note_comments(note_id, created_at);

-- Note comments text table index
CREATE INDEX IF NOT EXISTS idx_note_comments_text_comment_id ON public.note_comments_text(comment_id);

-- Users table index (if exists in public schema)
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);

-- ============================================================================
-- COMPOSITE INDEXES - For common filter combinations
-- ============================================================================

-- Notes composite indexes for search queries
CREATE INDEX IF NOT EXISTS idx_notes_country_status ON public.notes(id_country, status);
CREATE INDEX IF NOT EXISTS idx_notes_user_status ON public.notes(id_user, status);
CREATE INDEX IF NOT EXISTS idx_notes_country_created ON public.notes(id_country, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_status_created ON public.notes(status, created_at DESC);

-- ============================================================================
-- DATAMART INDEXES - For analytics queries
-- ============================================================================

-- Datamart Users index
CREATE INDEX IF NOT EXISTS idx_datamart_users_user_id ON dwh.datamartUsers(user_id);

-- Datamart Countries index
CREATE INDEX IF NOT EXISTS idx_datamart_countries_country_id ON dwh.datamartCountries(country_id);

-- ============================================================================
-- SPATIAL INDEXES - For bounding box queries (optional, requires PostGIS)
-- ============================================================================

-- Uncomment if PostGIS is available and you want spatial indexing
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- 
-- -- Add geometry column if not exists
-- ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
-- UPDATE public.notes SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;
-- 
-- -- Create spatial index
-- CREATE INDEX IF NOT EXISTS idx_notes_geom ON public.notes USING GIST (geom);

-- ============================================================================
-- ANALYZE TABLES - Update statistics for query planner
-- ============================================================================

ANALYZE public.notes;
ANALYZE public.note_comments;
ANALYZE public.note_comments_text;
ANALYZE dwh.datamartUsers;
ANALYZE dwh.datamartCountries;
ANALYZE dwh.datamartGlobal;

-- ============================================================================
-- VERIFICATION QUERIES - Check index usage
-- ============================================================================

-- View all indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname IN ('public', 'dwh')
  AND indexname LIKE 'idx_%'
ORDER BY schemaname, tablename, indexname;

-- Check index usage statistics (run after some usage)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname IN ('public', 'dwh')
--   AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

