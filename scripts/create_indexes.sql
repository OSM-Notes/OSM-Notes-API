-- Performance Optimization Indexes for OSM Notes API
-- Run this script to create recommended indexes for optimal query performance
-- 
-- Usage:
--   # For local testing (osm_notes_api_test):
--   psql -U $(whoami) -d osm_notes_api_test -f scripts/create_indexes.sql
--
--   # For production (osm_notes_dwh):
--   psql -h $DB_HOST -U $DB_USER -d osm_notes_dwh -f scripts/create_indexes.sql
--
-- Note: 
--   - Some indexes may already exist. The script uses IF NOT EXISTS to avoid errors.
--   - Indexes for dwh schema are only created if the schema exists (production only).
--   - For local testing with osm_notes_api_test, only public schema indexes are created.

-- ============================================================================
-- CRITICAL INDEXES - Required for basic query performance
-- ============================================================================

-- Notes table indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    CREATE INDEX IF NOT EXISTS idx_notes_note_id ON public.notes(note_id);
    CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
    CREATE INDEX IF NOT EXISTS idx_notes_id_country ON public.notes(id_country);
    CREATE INDEX IF NOT EXISTS idx_notes_id_user ON public.notes(id_user);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
    RAISE NOTICE 'Created indexes on public.notes';
  ELSE
    RAISE NOTICE 'Skipping public.notes indexes (table does not exist)';
  END IF;
END $$;

-- Note comments table indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments') THEN
    CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_comments_created_at ON public.note_comments(created_at);
    CREATE INDEX IF NOT EXISTS idx_note_comments_user_id ON public.note_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_note_comments_note_created ON public.note_comments(note_id, created_at);
    RAISE NOTICE 'Created indexes on public.note_comments';
  ELSE
    RAISE NOTICE 'Skipping public.note_comments indexes (table does not exist)';
  END IF;
END $$;

-- Note comments text table index (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments_text') THEN
    CREATE INDEX IF NOT EXISTS idx_note_comments_text_comment_id ON public.note_comments_text(comment_id);
    RAISE NOTICE 'Created index on public.note_comments_text';
  ELSE
    RAISE NOTICE 'Skipping public.note_comments_text index (table does not exist)';
  END IF;
END $$;

-- Users table index (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
    RAISE NOTICE 'Created index on public.users';
  ELSE
    RAISE NOTICE 'Skipping public.users index (table does not exist - optional)';
  END IF;
END $$;

-- ============================================================================
-- COMPOSITE INDEXES - For common filter combinations
-- ============================================================================

-- Notes composite indexes for search queries (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    CREATE INDEX IF NOT EXISTS idx_notes_country_status ON public.notes(id_country, status);
    CREATE INDEX IF NOT EXISTS idx_notes_user_status ON public.notes(id_user, status);
    CREATE INDEX IF NOT EXISTS idx_notes_country_created ON public.notes(id_country, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_status_created ON public.notes(status, created_at DESC);
    RAISE NOTICE 'Created composite indexes on public.notes';
  ELSE
    RAISE NOTICE 'Skipping composite indexes on public.notes (table does not exist)';
  END IF;
END $$;

-- ============================================================================
-- DATAMART INDEXES - For analytics queries (production only)
-- ============================================================================

-- These indexes are only created if the dwh schema exists
-- For local testing (osm_notes_api_test), these will be skipped

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dwh') THEN
    -- Datamart Users index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartusers') THEN
      CREATE INDEX IF NOT EXISTS idx_datamart_users_user_id ON dwh.datamartUsers(user_id);
      RAISE NOTICE 'Created index: idx_datamart_users_user_id';
    END IF;
    
    -- Datamart Countries index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartcountries') THEN
      CREATE INDEX IF NOT EXISTS idx_datamart_countries_country_id ON dwh.datamartCountries(country_id);
      RAISE NOTICE 'Created index: idx_datamart_countries_country_id';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping dwh schema indexes (schema not available in test database)';
  END IF;
END $$;

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

