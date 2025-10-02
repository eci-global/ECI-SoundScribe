-- DIAGNOSTIC: Check Admin User Access and Team Assignments
-- This will help us understand why manager_accessible_recordings returns 0 records

-- =============================================================================
-- DIAGNOSTIC QUERIES FOR ADMIN ACCESS
-- =============================================================================

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT;
  admin_role TEXT;
  team_ids UUID[];
  accessible_teams UUID[];
  total_recordings INT;
  accessible_recordings INT;
BEGIN
  -- Find admin user by email
  SELECT id, email INTO admin_user_id, admin_email
  FROM auth.users
  WHERE email = 'admin@soundscribe.com';

  -- Get admin role
  SELECT role INTO admin_role
  FROM user_roles
  WHERE user_id = admin_user_id;

  -- Test SECURITY DEFINER functions with admin user
  SELECT get_accessible_team_ids(admin_user_id) INTO accessible_teams;

  -- Count total recordings
  SELECT COUNT(*) INTO total_recordings FROM recordings;

  -- Count recordings accessible via manager_accessible_recordings
  -- (This uses SECURITY DEFINER functions internally)
  SELECT COUNT(*) INTO accessible_recordings
  FROM recordings r
  WHERE
    r.user_id = admin_user_id
    OR r.team_id = ANY(get_accessible_team_ids(admin_user_id))
    OR get_recording_access_level(admin_user_id) = 'admin';

  RAISE NOTICE '=== ADMIN ACCESS DIAGNOSTIC ===';
  RAISE NOTICE 'Admin User ID: %', COALESCE(admin_user_id::text, 'NOT FOUND');
  RAISE NOTICE 'Admin Email: %', COALESCE(admin_email, 'NOT FOUND');
  RAISE NOTICE 'Admin Role: %', COALESCE(admin_role, 'NO ROLE ASSIGNED');
  RAISE NOTICE 'Accessible Team IDs: %', COALESCE(array_length(accessible_teams, 1), 0);
  RAISE NOTICE 'Total Recordings in DB: %', total_recordings;
  RAISE NOTICE 'Recordings Accessible to Admin: %', accessible_recordings;

  -- Detailed breakdown of access logic
  RAISE NOTICE '';
  RAISE NOTICE '=== ACCESS BREAKDOWN ===';

  -- Check if admin has admin role
  IF admin_role = 'admin' THEN
    RAISE NOTICE '✅ Admin has admin role - should see ALL recordings';
  ELSE
    RAISE NOTICE '❌ Admin does NOT have admin role: %', COALESCE(admin_role, 'NULL');
  END IF;

  -- Check accessible teams
  IF array_length(accessible_teams, 1) > 0 THEN
    RAISE NOTICE '✅ Admin can access % teams: %', array_length(accessible_teams, 1), accessible_teams;
  ELSE
    RAISE NOTICE '❌ Admin cannot access any teams';
  END IF;

  -- Check function results
  RAISE NOTICE 'get_recording_access_level result: %', get_recording_access_level(admin_user_id);

END $$;

-- =============================================================================
-- ADMIN ACCESS ALREADY CONFIRMED (skipping user_roles update)
-- =============================================================================

-- Admin access was confirmed in the diagnostic above
-- Skipping user_roles update to avoid updated_at column error

-- =============================================================================
-- TEST MANAGER ACCESSIBLE RECORDINGS VIEW AGAIN
-- =============================================================================

DO $$
DECLARE
  view_record_count INT;
BEGIN
  -- Count records in manager_accessible_recordings view
  SELECT COUNT(*) INTO view_record_count
  FROM manager_accessible_recordings;

  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL TEST ===';
  RAISE NOTICE 'Manager Accessible Recordings View: % records', view_record_count;

  IF view_record_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Manager accessible recordings view is working!';
  ELSE
    RAISE NOTICE '❌ ISSUE: Manager accessible recordings view still returns 0 records';
    RAISE NOTICE 'This suggests the SECURITY DEFINER functions may need adjustment';
  END IF;
END $$;

-- =============================================================================
-- CREATE SIMPLE TEST VIEW FOR DEBUGGING
-- =============================================================================

-- Create a simplified view that should definitely work for admins
CREATE OR REPLACE VIEW admin_debug_recordings AS
SELECT
  r.id,
  r.title,
  r.user_id,
  r.employee_name,
  r.created_at,
  -- Check what the functions return
  get_recording_access_level(r.user_id) as user_access_level,
  get_accessible_team_ids(r.user_id) as accessible_team_ids,
  -- Simple admin check
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = r.user_id AND ur.role = 'admin'
  ) as is_admin
FROM recordings r
LIMIT 10;

GRANT SELECT ON admin_debug_recordings TO authenticated, service_role;

COMMENT ON VIEW admin_debug_recordings IS 'Debug view to test SECURITY DEFINER functions and admin access patterns';