-- Create Read-Only User for OSM Notes API
-- This script creates a user with read-only permissions for the DWH database
-- 
-- Usage:
--   # Connect as superuser or database owner
--   psql -h $DB_HOST -U postgres -d osm_notes_dwh -f scripts/create_readonly_user.sql
--
--   # Or connect directly to database
--   psql -h $DB_HOST -U postgres -d osm_notes_dwh
--   \i scripts/create_readonly_user.sql
--
-- After running, set password:
--   ALTER USER osm_notes_api_user WITH PASSWORD 'your_secure_password_here';
--
-- Note: Replace 'your_secure_password_here' with a strong password

-- ============================================================================
-- CREATE READ-ONLY USER FOR DWH DATABASE
-- ============================================================================

-- Check if user already exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'osm_notes_api_user') THEN
    RAISE NOTICE 'User osm_notes_api_user already exists. Skipping creation.';
  ELSE
    -- Create user
    CREATE USER osm_notes_api_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
    RAISE NOTICE 'User osm_notes_api_user created successfully.';
    RAISE NOTICE 'IMPORTANT: Set a secure password with: ALTER USER osm_notes_api_user WITH PASSWORD ''your_password'';';
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS FOR DWH SCHEMA
-- ============================================================================

-- Grant usage on dwh schema
GRANT USAGE ON SCHEMA dwh TO osm_notes_api_user;

-- Grant SELECT on all existing tables in dwh schema
GRANT SELECT ON ALL TABLES IN SCHEMA dwh TO osm_notes_api_user;

-- Grant SELECT on all future tables in dwh schema (for tables created later)
ALTER DEFAULT PRIVILEGES IN SCHEMA dwh GRANT SELECT ON TABLES TO osm_notes_api_user;

-- ============================================================================
-- GRANT PERMISSIONS FOR PUBLIC SCHEMA (Foreign Tables via FDW)
-- ============================================================================

-- Grant usage on public schema (for foreign tables)
GRANT USAGE ON SCHEMA public TO osm_notes_api_user;

-- Grant SELECT on all existing tables in public schema
-- Note: These are typically foreign tables via Foreign Data Wrappers
GRANT SELECT ON ALL TABLES IN SCHEMA public TO osm_notes_api_user;

-- Grant SELECT on all future tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO osm_notes_api_user;

-- ============================================================================
-- VERIFY PERMISSIONS
-- ============================================================================

-- Display user information
SELECT 
  usename as username,
  usesuper as is_superuser,
  usecreatedb as can_create_db,
  usecreatereole as can_create_role
FROM pg_catalog.pg_user
WHERE usename = 'osm_notes_api_user';

-- Display schema permissions
SELECT 
  nspname as schema_name,
  nspacl as permissions
FROM pg_catalog.pg_namespace
WHERE nspname IN ('dwh', 'public')
ORDER BY nspname;

-- Display table permissions for dwh schema
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_catalog.pg_tables
WHERE schemaname = 'dwh'
ORDER BY tablename
LIMIT 10;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. This user has READ-ONLY access (SELECT only)
-- 2. No INSERT, UPDATE, DELETE, CREATE, ALTER, DROP permissions
-- 3. Can only query data from dwh.datamart* tables and public.* tables (via FDW)
-- 4. Cannot modify any data or schema
-- 5. Cannot create new tables, indexes, or other database objects
-- 6. Safe to use for API access - cannot cause data loss or corruption

-- ============================================================================
-- SECURITY BEST PRACTICES
-- ============================================================================

-- After creating user, verify permissions:
-- 
-- 1. Test connection:
--    psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh -c "SELECT 1;"
--
-- 2. Test SELECT permission:
--    psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
--         -c "SELECT COUNT(*) FROM dwh.datamartUsers LIMIT 1;"
--
-- 3. Test that INSERT is denied (should fail):
--    psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
--         -c "INSERT INTO dwh.datamartUsers (user_id) VALUES (999999);"
--    Expected: ERROR: permission denied for table datamartUsers
--
-- 4. Test that UPDATE is denied (should fail):
--    psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
--         -c "UPDATE dwh.datamartUsers SET username = 'test' WHERE user_id = 1;"
--    Expected: ERROR: permission denied for table datamartUsers
--
-- 5. Test that DELETE is denied (should fail):
--    psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
--         -c "DELETE FROM dwh.datamartUsers WHERE user_id = 1;"
--    Expected: ERROR: permission denied for table datamartUsers
