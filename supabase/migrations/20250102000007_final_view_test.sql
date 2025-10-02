-- FINAL VIEW TEST - Test manager_accessible_recordings without user_roles updates

DO $$
DECLARE
  admin_user_id UUID := '1fd13984-3457-40ea-9220-20447a1ff9ae';
  accessible_recordings_count INT;
  own_recordings_count INT;
  team_recordings_count INT;
  admin_access_count INT;
  view_count INT;
  simple_view_count INT;
BEGIN
  -- Test each part of the view logic separately

  -- 1. Own recordings (should be few or none for admin)
  SELECT COUNT(*) INTO own_recordings_count
  FROM recordings r
  WHERE r.user_id = admin_user_id;

  -- 2. Team-based recordings (should be all recordings assigned to teams)
  SELECT COUNT(*) INTO team_recordings_count
  FROM recordings r
  WHERE r.team_id = ANY(get_accessible_team_ids(admin_user_id));

  -- 3. Admin access check (should be 102 since user has admin role)
  SELECT COUNT(*) INTO admin_access_count
  FROM recordings r
  WHERE get_recording_access_level(admin_user_id) = 'admin';

  -- 4. Test the full CTE logic from the manager_accessible_recordings view
  WITH accessible_recordings AS (
    SELECT r.*
    FROM recordings r
    WHERE
      r.user_id = admin_user_id
      OR r.team_id = ANY(get_accessible_team_ids(admin_user_id))
      OR get_recording_access_level(admin_user_id) = 'admin'
  )
  SELECT COUNT(*) INTO accessible_recordings_count FROM accessible_recordings;

  -- 5. Test the actual manager_accessible_recordings view
  SELECT COUNT(*) INTO view_count FROM manager_accessible_recordings;

  -- 6. Create and test simple view
  DROP VIEW IF EXISTS simple_test_view;
  CREATE VIEW simple_test_view AS
  SELECT r.id, r.title, r.created_at
  FROM recordings r
  WHERE get_recording_access_level('1fd13984-3457-40ea-9220-20447a1ff9ae') = 'admin';

  SELECT COUNT(*) INTO simple_view_count FROM simple_test_view;

  RAISE NOTICE '=== COMPREHENSIVE VIEW TESTING ===';
  RAISE NOTICE 'Admin User ID: %', admin_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '1. Own recordings: %', own_recordings_count;
  RAISE NOTICE '2. Team-based recordings: %', team_recordings_count;
  RAISE NOTICE '3. Admin access check: %', admin_access_count;
  RAISE NOTICE '4. Combined CTE logic: %', accessible_recordings_count;
  RAISE NOTICE '5. manager_accessible_recordings view: %', view_count;
  RAISE NOTICE '6. Simple test view: %', simple_view_count;
  RAISE NOTICE '';

  -- Analysis
  IF admin_access_count = 102 THEN
    RAISE NOTICE '✅ Admin access function works correctly (should see all 102 records)';
  ELSE
    RAISE NOTICE '❌ Admin access function issue: expected 102, got %', admin_access_count;
  END IF;

  IF simple_view_count = 102 THEN
    RAISE NOTICE '✅ Simple view works correctly';
  ELSE
    RAISE NOTICE '❌ Simple view issue: expected 102, got %', simple_view_count;
  END IF;

  IF view_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: manager_accessible_recordings is working! Count: %', view_count;
  ELSE
    RAISE NOTICE '❌ ISSUE: manager_accessible_recordings still returns 0';
    RAISE NOTICE 'This suggests an issue in the view''s CTE or JOIN logic';
  END IF;

  -- Provide solution
  IF view_count = 0 AND admin_access_count = 102 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SOLUTION: The issue is likely in the complex JOINs in manager_accessible_recordings';
    RAISE NOTICE 'Recommendation: Use the simpler view logic that works correctly';
  END IF;

END $$;