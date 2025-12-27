-- Database Schema Creation Script for OSM Notes API
-- Creates all required tables for the API to function
-- 
-- Usage:
--   # For local testing (osm_notes_api_test):
--   psql -U $(whoami) -d osm_notes_api_test -f scripts/create_schema.sql
--
--   # For production (osm_notes_dwh):
--   psql -h $DB_HOST -U $DB_USER -d osm_notes_dwh -f scripts/create_schema.sql
--
-- Note: This script creates the table structure. You need to populate it with data separately.

\echo '================================================================================'
\echo 'Creating OSM Notes API Database Schema'
\echo '================================================================================'
\echo ''

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

-- Table: note_comments
CREATE TABLE IF NOT EXISTS public.note_comments (
  comment_id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  user_id INTEGER NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('opened', 'closed', 'commented', 'reopened', 'hidden')),
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (note_id) REFERENCES public.notes(note_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.note_comments IS 'Comments on OSM notes';
COMMENT ON COLUMN public.note_comments.comment_id IS 'Primary key, unique comment identifier';
COMMENT ON COLUMN public.note_comments.note_id IS 'Foreign key to notes.note_id';
COMMENT ON COLUMN public.note_comments.user_id IS 'OSM user ID who made the comment';
COMMENT ON COLUMN public.note_comments.action IS 'Type of action: opened, closed, commented, reopened, hidden';
COMMENT ON COLUMN public.note_comments.created_at IS 'When the comment was created';

\echo '  ✓ Created table: public.note_comments'

-- Table: note_comments_text
CREATE TABLE IF NOT EXISTS public.note_comments_text (
  comment_id INTEGER PRIMARY KEY,
  text TEXT NULL,
  FOREIGN KEY (comment_id) REFERENCES public.note_comments(comment_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.note_comments_text IS 'Text content of note comments';
COMMENT ON COLUMN public.note_comments_text.comment_id IS 'Primary key, foreign key to note_comments.comment_id';
COMMENT ON COLUMN public.note_comments_text.text IS 'Comment text content';

\echo '  ✓ Created table: public.note_comments_text'

-- Table: users (optional but recommended)
CREATE TABLE IF NOT EXISTS public.users (
  user_id INTEGER PRIMARY KEY,
  username VARCHAR(255) NULL
);

COMMENT ON TABLE public.users IS 'OSM user information (optional, improves JOIN performance)';
COMMENT ON COLUMN public.users.user_id IS 'Primary key, OSM user ID';
COMMENT ON COLUMN public.users.username IS 'OSM username';

\echo '  ✓ Created table: public.users (optional)'
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
  activity_by_year JSONB NULL
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
  activity_by_year JSONB NULL,
  working_hours_of_week_opening JSONB NULL
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
  top_countries JSONB NULL
);

COMMENT ON TABLE dwh.datamartGlobal IS 'Pre-aggregated global analytics (typically 1 row)';

\echo '  ✓ Created table: dwh.datamartGlobal'
\echo ''

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

