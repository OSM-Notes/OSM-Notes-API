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
    -- REMOVED: idx_notes_note_id - Redundant with PRIMARY KEY on note_id
    -- The PK already provides an index for note_id lookups and JOINs
    
    -- Index: idx_notes_status (status)
    -- Benefits: API (noteService.ts:197-200 - filters by status: n.status = $status, :79 - queries status in getNoteById)
    -- Used by: Queries filtering notes by status (open/closed), status-based searches
    CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
    
    -- Index: idx_notes_id_country (id_country)
    -- Benefits: API (noteService.ts:191-194 - filters by country: n.id_country = $country, analyze_queries.sql:145 - performance analysis)
    -- Used by: Country-based note filtering, country search queries
    CREATE INDEX IF NOT EXISTS idx_notes_id_country ON public.notes(id_country);
    
    -- Index: idx_notes_id_user (id_user)
    -- Benefits: API (noteService.ts:203-206 - filters by user: n.id_user = $user_id)
    --           Analytics (queries grouping notes by user)
    -- Used by: User-based note filtering, user activity queries
    CREATE INDEX IF NOT EXISTS idx_notes_id_user ON public.notes(id_user);
    
    -- REMOVED: idx_notes_created_at - Consolidated with notes_created DESC in Ingestion base
    -- The base index notes_created now uses DESC order, making this duplicate unnecessary
    RAISE NOTICE 'Created indexes on public.notes';
  ELSE
    RAISE NOTICE 'Skipping public.notes indexes (table does not exist)';
  END IF;
END $$;

-- Note comments table indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments') THEN
    -- REMOVED: idx_note_comments_note_id - Consolidated with note_comments_id in Ingestion base
    -- The base index note_comments_id covers this need
    
    -- REMOVED: idx_note_comments_created_at - Consolidated with note_comments_created in Ingestion base
    -- The base index note_comments_created covers this need
    
    -- Index: idx_note_comments_user_id (user_id)
    -- Benefits: API (queries filtering comments by user)
    --           Similar to note_comments_users but uses user_id column name
    -- Used by: Queries filtering comments by user
    CREATE INDEX IF NOT EXISTS idx_note_comments_user_id ON public.note_comments(user_id);
    
    -- REMOVED: idx_note_comments_note_created - Consolidated with note_comments_id_created DESC in Ingestion base
    -- The base index note_comments_id_created now uses DESC order, covering this need
    RAISE NOTICE 'Created indexes on public.note_comments';
  ELSE
    RAISE NOTICE 'Skipping public.note_comments indexes (table does not exist)';
  END IF;
END $$;

-- Note comments text table indexes (only if table exists)
DO $$
DECLARE
  has_pg_trgm BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments_text') THEN
    -- Index: idx_note_comments_text_comment_id (comment_id)
    -- Benefits: API (noteService.ts:137 - LEFT JOIN: LEFT JOIN note_comments_text nct ON nc.comment_id = nct.comment_id)
    --           Similar to idx_note_comment_texts_comment_id
    -- Used by: JOINs between note_comments and note_comments_text using comment_id
    CREATE INDEX IF NOT EXISTS idx_note_comments_text_comment_id ON public.note_comments_text(comment_id);
    
    -- Check if pg_trgm extension is available for optimized text search
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
    ) INTO has_pg_trgm;
    
    IF has_pg_trgm THEN
      -- Index: idx_note_comments_text_text_search_gin (text) - GIN with pg_trgm for ILIKE text search
      -- Benefits: API (advancedSearchService.ts:108 - text search: nc_search.text ILIKE $pattern)
      --           Optimizes text search queries in note comments using trigram matching
      --           Much faster than B-tree for ILIKE pattern searches
      -- Used by: Text search queries with ILIKE patterns (e.g., '%search term%')
      -- Note: Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE INDEX IF NOT EXISTS idx_note_comments_text_text_search_gin 
      ON public.note_comments_text USING GIN (text gin_trgm_ops);
      RAISE NOTICE 'Created GIN index for text search (pg_trgm extension available)';
    ELSE
      -- Index: idx_note_comments_text_text_search (text) - B-tree fallback for ILIKE text search
      -- Benefits: API (advancedSearchService.ts:108 - text search: nc_search.text ILIKE $pattern)
      --           Basic optimization for text search queries
      --           Works for prefix searches but slower than GIN for pattern searches
      -- Used by: Text search queries with ILIKE patterns
      -- Note: For better performance, install pg_trgm extension and recreate index:
      --       CREATE EXTENSION IF NOT EXISTS pg_trgm;
      --       DROP INDEX IF EXISTS idx_note_comments_text_text_search;
      --       CREATE INDEX ... USING GIN (text gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_note_comments_text_text_search ON public.note_comments_text(text);
      RAISE NOTICE 'Created B-tree index for text search (pg_trgm not available - consider installing for better performance)';
    END IF;
    
    RAISE NOTICE 'Created indexes on public.note_comments_text';
  ELSE
    RAISE NOTICE 'Skipping public.note_comments_text indexes (table does not exist)';
  END IF;
END $$;

-- Users table index (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Index: idx_users_user_id (user_id)
    -- Benefits: API (noteService.ts:136 - JOIN with users: LEFT JOIN public.users u ON nc.user_id = u.user_id)
    --           Analytics (JOINs with users table)
    -- Used by: JOINs with users table using user_id
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
    -- Index: idx_notes_country_status (id_country, status)
    -- Benefits: API (noteService.ts:191-200 - queries filtering by country AND status simultaneously)
    -- Used by: Queries filtering notes by both country and status (e.g., open notes in a specific country)
    CREATE INDEX IF NOT EXISTS idx_notes_country_status ON public.notes(id_country, status);
    
    -- Index: idx_notes_user_status (id_user, status)
    -- Benefits: API (noteService.ts:203-200 - queries filtering by user AND status),
    --           Analytics (user activity analysis by status)
    -- Used by: Queries filtering notes by both user and status (e.g., user's open notes)
    CREATE INDEX IF NOT EXISTS idx_notes_user_status ON public.notes(id_user, status);
    
    -- Index: idx_notes_country_created (id_country, created_at DESC)
    -- Benefits: API (noteService.ts:191-251 - filters by country and orders by creation date descending)
    -- Used by: Queries for "most recent notes by country" (country filter + ORDER BY created_at DESC)
    CREATE INDEX IF NOT EXISTS idx_notes_country_created ON public.notes(id_country, created_at DESC);
    
    -- Index: idx_notes_status_created (status, created_at DESC)
    -- Benefits: API (noteService.ts:197-251 - filters by status and orders by creation date descending)
    -- Used by: Queries for "most recent open/closed notes" (status filter + ORDER BY created_at DESC)
    CREATE INDEX IF NOT EXISTS idx_notes_status_created ON public.notes(status, created_at DESC);
    
    -- Index: idx_notes_country_status_created (id_country, status, created_at DESC)
    -- Benefits: API (noteService.ts - common query pattern: filter by country AND status, order by created_at DESC)
    --           Optimizes the most common combined filter pattern in searchNotes
    -- Used by: Queries filtering by country + status and ordering by creation date (very common pattern)
    CREATE INDEX IF NOT EXISTS idx_notes_country_status_created ON public.notes(id_country, status, created_at DESC);
    
    -- Index: idx_notes_user_status_created (id_user, status, created_at DESC)
    -- Benefits: API (noteService.ts - common query pattern: filter by user AND status, order by created_at DESC)
    --           Optimizes user-specific searches with status filter
    -- Used by: Queries filtering by user + status and ordering by creation date
    CREATE INDEX IF NOT EXISTS idx_notes_user_status_created ON public.notes(id_user, status, created_at DESC);
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

-- Analyze tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ANALYZE public.notes;
    RAISE NOTICE 'Analyzed: public.notes';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments') THEN
    ANALYZE public.note_comments;
    RAISE NOTICE 'Analyzed: public.note_comments';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments_text') THEN
    ANALYZE public.note_comments_text;
    RAISE NOTICE 'Analyzed: public.note_comments_text';
  END IF;
  
  -- Analyze dwh tables if schema exists (production only)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dwh') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartusers') THEN
      ANALYZE dwh.datamartUsers;
      RAISE NOTICE 'Analyzed: dwh.datamartUsers';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartcountries') THEN
      ANALYZE dwh.datamartCountries;
      RAISE NOTICE 'Analyzed: dwh.datamartCountries';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartglobal') THEN
      ANALYZE dwh.datamartGlobal;
      RAISE NOTICE 'Analyzed: dwh.datamartGlobal';
    END IF;
  END IF;
END $$;

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

