-- Sample Data Insertion Script for OSM Notes API
-- Inserts minimal test data to make the API functional
-- 
-- Usage:
--   psql -U $(whoami) -d osm_notes_api_test -f scripts/insert_sample_data.sql
--
-- Note: This script inserts sample data for testing. Replace with real data for production.

\echo '================================================================================'
\echo 'Inserting Sample Data for OSM Notes API'
\echo '================================================================================'
\echo ''

-- Check if tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    RAISE EXCEPTION 'Table public.notes does not exist. Run scripts/create_schema.sql first.';
  END IF;
END $$;

\echo 'Inserting sample notes...'

-- Insert sample notes
INSERT INTO public.notes (note_id, latitude, longitude, status, created_at, closed_at, id_user, id_country)
VALUES
  (1, 40.7128, -74.0060, 'open', NOW() - INTERVAL '10 days', NULL, 1001, 1),
  (2, 34.0522, -118.2437, 'closed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 1002, 2),
  (3, 51.5074, -0.1278, 'open', NOW() - INTERVAL '5 days', NULL, 1003, 3),
  (4, 48.8566, 2.3522, 'open', NOW() - INTERVAL '3 days', NULL, 1001, 4),
  (5, 52.5200, 13.4050, 'closed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', 1002, 5),
  (6, 35.6762, 139.6503, 'open', NOW() - INTERVAL '1 day', NULL, 1003, 6),
  (7, -33.8688, 151.2093, 'open', NOW() - INTERVAL '7 days', NULL, 1001, 7),
  (8, 55.7558, 37.6173, 'closed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', 1002, 8),
  (9, 39.9042, 116.4074, 'open', NOW() - INTERVAL '2 days', NULL, 1003, 9),
  (10, -22.9068, -43.1729, 'open', NOW() - INTERVAL '4 days', NULL, 1001, 10)
ON CONFLICT (note_id) DO NOTHING;

\echo '  ✓ Inserted sample notes'

-- Insert sample comments
\echo 'Inserting sample comments...'

INSERT INTO public.note_comments (comment_id, note_id, user_id, action, created_at)
VALUES
  (1, 1, 1001, 'opened', NOW() - INTERVAL '10 days'),
  (2, 1, 1002, 'commented', NOW() - INTERVAL '9 days'),
  (3, 1, 1003, 'commented', NOW() - INTERVAL '8 days'),
  (4, 2, 1002, 'opened', NOW() - INTERVAL '20 days'),
  (5, 2, 1001, 'commented', NOW() - INTERVAL '15 days'),
  (6, 2, 1002, 'closed', NOW() - INTERVAL '5 days'),
  (7, 3, 1003, 'opened', NOW() - INTERVAL '5 days'),
  (8, 3, 1001, 'commented', NOW() - INTERVAL '4 days'),
  (9, 4, 1001, 'opened', NOW() - INTERVAL '3 days'),
  (10, 5, 1002, 'opened', NOW() - INTERVAL '15 days'),
  (11, 5, 1003, 'closed', NOW() - INTERVAL '2 days')
ON CONFLICT (comment_id) DO NOTHING;

\echo '  ✓ Inserted sample comments'

-- Insert sample comment text
\echo 'Inserting sample comment text...'

INSERT INTO public.note_comments_text (comment_id, text)
VALUES
  (2, 'This is a test comment on note 1'),
  (3, 'Another comment with more details'),
  (5, 'Comment on closed note'),
  (8, 'Comment on London note')
ON CONFLICT (comment_id) DO NOTHING;

\echo '  ✓ Inserted sample comment text'

-- Insert sample users (optional but recommended)
\echo 'Inserting sample users...'

INSERT INTO public.users (user_id, username)
VALUES
  (1001, 'test_user_1'),
  (1002, 'test_user_2'),
  (1003, 'test_user_3')
ON CONFLICT (user_id) DO NOTHING;

\echo '  ✓ Inserted sample users'
\echo ''

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '================================================================================'
\echo 'Sample Data Insertion Complete'
\echo '================================================================================'
\echo ''
\echo 'Data summary:'

SELECT 
  'public.notes' as table_name,
  COUNT(*) as row_count
FROM public.notes
UNION ALL
SELECT 
  'public.note_comments' as table_name,
  COUNT(*) as row_count
FROM public.note_comments
UNION ALL
SELECT 
  'public.note_comments_text' as table_name,
  COUNT(*) as row_count
FROM public.note_comments_text
UNION ALL
SELECT 
  'public.users' as table_name,
  COUNT(*) as row_count
FROM public.users;

\echo ''
\echo 'You can now test the API endpoints:'
\echo '  - GET /api/v1/notes/1'
\echo '  - GET /api/v1/notes/1/comments'
\echo '  - GET /api/v1/notes?status=open&limit=10'
\echo ''

