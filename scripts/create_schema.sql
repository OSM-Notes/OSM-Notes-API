-- Database Schema Creation Script for OSM Notes API
-- Creates all required tables for the API to function.
--
-- SCOPE: Testing and CI. Core `public` tables (notes, note_comments, note_comments_text, users)
-- follow OSM-Notes-Ingestion base DDL (processPlanetNotes_20/21/22_*.sql). In production, data
-- usually lives in the Ingestion-backed database; keep this script aligned to avoid API/DB drift.
--
-- Usage:
--   # Local testing (osm_notes_api_test):
--   psql -U $(whoami) -d osm_notes_api_test -f scripts/create_schema.sql
--
--   # CI (GitHub Actions): run automatically before integration tests.
--
-- Note: This script creates the table structure. Populate data separately
-- (e.g. scripts/insert_sample_data.sql or osm_notes_analytics pipelines).

\echo '================================================================================'
\echo 'Creating OSM Notes API Database Schema'
\echo '================================================================================'
\echo ''

-- ============================================================================
-- INSTALL EXTENSIONS
-- ============================================================================

\echo 'Installing required PostgreSQL extensions...'

-- pg_trgm extension (required for optimized text search)
-- Enables GIN index on note_comments_text.body for faster ILIKE in advancedSearchService
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enumerators aligned with OSM-Notes-Ingestion (processPlanetNotes_20_createBaseTables_enum.sql)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_event_enum') THEN
    CREATE TYPE note_event_enum AS ENUM (
      'opened',
      'closed',
      'reopened',
      'commented',
      'hidden'
    );
  END IF;
END $$;

-- ============================================================================
-- SCHEMA: public
-- ============================================================================

\echo 'Creating public schema tables...'

-- Table: notes
CREATE TABLE IF NOT EXISTS public.notes (
  note_id INTEGER PRIMARY KEY,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed', 'hidden')),
  created_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP NULL,
  id_user INTEGER NULL,
  id_country INTEGER NULL
);

COMMENT ON TABLE public.notes IS 'OSM notes data';
COMMENT ON COLUMN public.notes.note_id IS 'Primary key, unique note identifier';
COMMENT ON COLUMN public.notes.latitude IS 'Note latitude (-90 to 90)';
COMMENT ON COLUMN public.notes.longitude IS 'Note longitude (-180 to 180)';
COMMENT ON COLUMN public.notes.status IS 'Note status: open, closed, or hidden';
COMMENT ON COLUMN public.notes.created_at IS 'When the note was created';
COMMENT ON COLUMN public.notes.closed_at IS 'When the note was closed (NULL if still open)';
COMMENT ON COLUMN public.notes.id_user IS 'OSM user ID who created the note';
COMMENT ON COLUMN public.notes.id_country IS 'Country ID where the note is located';

\echo '  ✓ Created table: public.notes'

-- Table: users (before note_comments when using FK from id_user; matches Ingestion ordering of dependencies)
CREATE TABLE IF NOT EXISTS public.users (
  user_id INTEGER PRIMARY KEY,
  username VARCHAR(255) NOT NULL
);

COMMENT ON TABLE public.users IS 'OSM user information (optional, improves JOIN performance)';
COMMENT ON COLUMN public.users.user_id IS 'Primary key, OSM user ID';
COMMENT ON COLUMN public.users.username IS 'OSM username';

\echo '  ✓ Created table: public.users (optional)'

-- Table: note_comments (OSM-Notes-Ingestion processPlanetNotes_21_createBaseTables_tables.sql + pk in _22)
CREATE TABLE IF NOT EXISTS public.note_comments (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL,
  sequence_action INTEGER,
  event note_event_enum NOT NULL,
  processing_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  id_user INTEGER,
  FOREIGN KEY (note_id) REFERENCES public.notes(note_id) ON DELETE CASCADE,
  FOREIGN KEY (id_user) REFERENCES public.users(user_id)
);

COMMENT ON TABLE public.note_comments IS 'Comments on OSM notes (Ingestion base table)';
COMMENT ON COLUMN public.note_comments.id IS 'Surrogate PK; links to note_comments_text.id';
COMMENT ON COLUMN public.note_comments.note_id IS 'OSM note id';
COMMENT ON COLUMN public.note_comments.sequence_action IS 'Comment sequence for ordering';
COMMENT ON COLUMN public.note_comments.event IS 'Action type';
COMMENT ON COLUMN public.note_comments.id_user IS 'OSM user who performed the action';

\echo '  ✓ Created table: public.note_comments'

-- Table: note_comments_text (Ingestion: join to note_comments via note_id + sequence_action, or matching id)
CREATE TABLE IF NOT EXISTS public.note_comments_text (
  id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL,
  sequence_action INTEGER,
  processing_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  body TEXT,
  FOREIGN KEY (note_id) REFERENCES public.notes(note_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.note_comments_text IS 'Text of note comments (Ingestion base table)';
COMMENT ON COLUMN public.note_comments_text.id IS 'Same value as note_comments.id for that row';
COMMENT ON COLUMN public.note_comments_text.body IS 'Comment text';

\echo '  ✓ Created table: public.note_comments_text'
\echo ''

-- ============================================================================
-- SCHEMA: dwh (production only)
-- ============================================================================

\echo 'Creating dwh schema (if needed for production)...'

-- Create dwh schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS dwh;

-- Table: datamartUsers
CREATE TABLE IF NOT EXISTS dwh.datamartUsers (
  dimension_user_id INTEGER PRIMARY KEY,
  dimension_country_id INTEGER NULL,
  user_id INTEGER NOT NULL UNIQUE,
  username VARCHAR(255) NULL,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  history_whole_commented INTEGER DEFAULT 0,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  user_response_time NUMERIC(10, 2) NULL,
  days_since_last_action INTEGER NULL,
  applications_used JSONB NULL,
  collaboration_patterns JSONB NULL,
  countries_open_notes JSONB NULL,
  hashtags JSONB NULL,
  date_starting_creating_notes DATE NULL,
  date_starting_solving_notes DATE NULL,
  last_year_activity TEXT NULL,
  working_hours_of_week_opening JSONB NULL,
  history_2020_open INTEGER NULL,
  history_2020_closed INTEGER NULL,
  history_2021_open INTEGER NULL,
  history_2021_closed INTEGER NULL,
  history_year_open INTEGER NULL,
  history_year_closed INTEGER NULL
);

COMMENT ON TABLE dwh.datamartUsers IS 'Pre-aggregated user analytics';
COMMENT ON COLUMN dwh.datamartUsers.user_id IS 'OSM user ID (unique)';

\echo '  ✓ Created table: dwh.datamartUsers'

-- Table: datamartCountries
CREATE TABLE IF NOT EXISTS dwh.datamartCountries (
  dimension_country_id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL UNIQUE,
  country_name VARCHAR(255) NULL,
  country_name_en VARCHAR(255) NULL,
  country_name_es VARCHAR(255) NULL,
  iso_alpha2 CHAR(2) NULL,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  notes_health_score NUMERIC(5, 2) NULL,
  new_vs_resolved_ratio NUMERIC(10, 4) NULL,
  notes_backlog_size INTEGER NULL,
  notes_created_last_30_days INTEGER NULL,
  notes_resolved_last_30_days INTEGER NULL,
  users_open_notes JSONB NULL,
  applications_used JSONB NULL,
  hashtags JSONB NULL,
  working_hours_of_week_opening JSONB NULL,
  history_2020_open INTEGER NULL,
  history_2020_closed INTEGER NULL,
  history_2021_open INTEGER NULL,
  history_2021_closed INTEGER NULL,
  history_year_open INTEGER NULL,
  history_year_closed INTEGER NULL
);

COMMENT ON TABLE dwh.datamartCountries IS 'Pre-aggregated country analytics';
COMMENT ON COLUMN dwh.datamartCountries.country_id IS 'Country ID (unique)';

\echo '  ✓ Created table: dwh.datamartCountries'

-- Table: datamartGlobal
CREATE TABLE IF NOT EXISTS dwh.datamartGlobal (
  dimension_global_id INTEGER PRIMARY KEY,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  currently_open_count INTEGER NULL,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  notes_created_last_30_days INTEGER NULL,
  notes_resolved_last_30_days INTEGER NULL,
  active_users_count INTEGER NULL,
  notes_backlog_size INTEGER NULL,
  applications_used JSONB NULL,
  top_countries JSONB NULL,
  history_2020_open INTEGER NULL,
  history_2020_closed INTEGER NULL,
  history_2021_open INTEGER NULL,
  history_2021_closed INTEGER NULL,
  history_year_open INTEGER NULL,
  history_year_closed INTEGER NULL
);

COMMENT ON TABLE dwh.datamartGlobal IS 'Pre-aggregated global analytics (typically 1 row)';

\echo '  ✓ Created table: dwh.datamartGlobal'
\echo ''

-- ============================================================================
-- PUBLIC SCHEMA VERSION (aligns with OSM-Notes-Analytics ensure_dwh_schema_version.sql)
-- ============================================================================

\echo 'Ensuring public.schema_version (component dwh) for API / DWH contract checks...'

CREATE TABLE IF NOT EXISTS public.schema_version (
  component VARCHAR(64) PRIMARY KEY,
  version VARCHAR(16) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.schema_version (component, version)
VALUES ('dwh', '1.0.0')
ON CONFLICT (component) DO UPDATE
  SET
    version = EXCLUDED.version,
    updated_at = CASE
      WHEN public.schema_version.version IS DISTINCT FROM EXCLUDED.version
        THEN CURRENT_TIMESTAMP
      ELSE public.schema_version.updated_at
    END;

\echo '  ✓ public.schema_version (dwh)'

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

\echo 'Creating indexes...'
\echo 'Run scripts/create_indexes.sql after populating tables with data.'
\echo ''

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '================================================================================'
\echo 'Schema Creation Complete'
\echo '================================================================================'
\echo ''
\echo 'Created tables:'
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname IN ('public', 'dwh')
  AND tablename IN ('notes', 'note_comments', 'note_comments_text', 'users', 
                    'datamartUsers', 'datamartCountries', 'datamartGlobal')
ORDER BY schemaname, tablename;

\echo ''
\echo 'Next steps:'
\echo '1. Populate tables with data (see docs/DATABASE_SCHEMA.md)'
\echo '2. Create indexes: psql -U $(whoami) -d osm_notes_api_test -f scripts/create_indexes.sql'
\echo '3. Verify: psql -U $(whoami) -d osm_notes_api_test -f scripts/check_db_requirements.sql'
\echo ''

