-- Check database requirements for query analysis
-- This script verifies that all required tables exist before running analysis

\echo '================================================================================'
\echo 'Checking Database Requirements'
\echo '================================================================================'
\echo ''

-- Check if required schemas exist
\echo '1. Checking schemas...'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'public') 
    THEN '✓ public schema exists'
    ELSE '✗ public schema missing'
  END as public_schema,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dwh') 
    THEN '✓ dwh schema exists'
    ELSE '✗ dwh schema missing'
  END as dwh_schema;

\echo ''

-- Check if required tables exist in public schema
\echo '2. Checking tables in public schema...'
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') 
    THEN '✓ notes table exists'
    ELSE '✗ notes table missing'
  END as notes_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments') 
    THEN '✓ note_comments table exists'
    ELSE '✗ note_comments table missing'
  END as note_comments_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments_text') 
    THEN '✓ note_comments_text table exists'
    ELSE '✗ note_comments_text table missing'
  END as note_comments_text_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') 
    THEN '✓ users table exists'
    ELSE '⚠ users table missing (optional)'
  END as users_table;

\echo ''

-- Check if required tables exist in dwh schema
\echo '3. Checking tables in dwh schema...'
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartusers') 
    THEN '✓ datamartUsers table exists'
    ELSE '✗ datamartUsers table missing'
  END as datamart_users_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartcountries') 
    THEN '✓ datamartCountries table exists'
    ELSE '✗ datamartCountries table missing'
  END as datamart_countries_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartglobal') 
    THEN '✓ datamartGlobal table exists'
    ELSE '✗ datamartGlobal table missing'
  END as datamart_global_table;

\echo ''

-- Check if tables have data
\echo '4. Checking if tables have data...'
DO $$
DECLARE
  notes_count INTEGER := 0;
  note_comments_count INTEGER := 0;
  datamart_users_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    SELECT COUNT(*) INTO notes_count FROM public.notes;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_comments') THEN
    SELECT COUNT(*) INTO note_comments_count FROM public.note_comments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dwh' AND table_name = 'datamartusers') THEN
    SELECT COUNT(*) INTO datamart_users_count FROM dwh.datamartUsers;
  END IF;
  
  RAISE NOTICE 'notes: % rows', notes_count;
  RAISE NOTICE 'note_comments: % rows', note_comments_count;
  RAISE NOTICE 'datamartUsers: % rows', datamart_users_count;
END $$;

\echo ''
\echo '================================================================================'
\echo 'Summary'
\echo '================================================================================'
\echo ''
\echo 'If all tables exist and have data, you can proceed with query analysis.'
\echo 'If tables are missing, please ensure the database is properly set up.'
\echo ''

