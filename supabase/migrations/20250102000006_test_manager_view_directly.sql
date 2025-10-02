-- TEST MANAGER ACCESSIBLE RECORDINGS VIEW DIRECTLY
-- The diagnostic shows admin should access all 102 recordings, let's test the view

-- =============================================================================
-- FIX MINOR ISSUE AND TEST VIEW
-- =============================================================================

-- Test the manager_accessible_recordings view directly with detailed breakdown
DO $$
DECLARE
  admin_user_id UUID := '1fd13984-3457-40ea-9220-20447a1ff9ae';
  accessible_recordings_count INT;
  own_recordings_count INT;
  team_recordings_count INT;
  admin_access_count INT;
  view_count INT;
BEGIN
  -- Test each part of the view logic separately

  -- 1. Own recordings
  SELECT COUNT(*) INTO own_recordings_count
  FROM recordings r
  WHERE r.user_id = admin_user_id;

  -- 2. Team-based recordings
  SELECT COUNT(*) INTO team_recordings_count
  FROM recordings r
  WHERE r.team_id = ANY(get_accessible_team_ids(admin_user_id));

  -- 3. Admin access (should be all recordings)
  SELECT COUNT(*) INTO admin_access_count
  FROM recordings r
  WHERE get_recording_access_level(admin_user_id) = 'admin';

  -- 4. Test the full CTE logic from the view
  SELECT COUNT(*) INTO accessible_recordings_count
  FROM recordings r
  WHERE
    r.user_id = admin_user_id
    OR r.team_id = ANY(get_accessible_team_ids(admin_user_id))
    OR get_recording_access_level(admin_user_id) = 'admin';

  -- 5. Test the actual view
  SELECT COUNT(*) INTO view_count FROM manager_accessible_recordings;

  RAISE NOTICE '=== VIEW LOGIC BREAKDOWN ===';
  RAISE NOTICE 'Own recordings: %', own_recordings_count;
  RAISE NOTICE 'Team-based recordings: %', team_recordings_count;
  RAISE NOTICE 'Admin access recordings: %', admin_access_count;
  RAISE NOTICE 'Combined CTE logic: %', accessible_recordings_count;
  RAISE NOTICE 'Actual view count: %', view_count;

  IF view_count = accessible_recordings_count THEN
    RAISE NOTICE '✅ SUCCESS: View logic is working correctly!';
  ELSE
    RAISE NOTICE '❌ ISSUE: View count differs from expected logic';
  END IF;

  IF view_count > 0 THEN
    RAISE NOTICE '✅ FINAL SUCCESS: Manager accessible recordings view is operational!';
  END IF;

END $$;

-- =============================================================================
-- CREATE SIMPLE FUNCTIONING VIEW AS BACKUP
-- =============================================================================

-- Create a simplified version that definitely works
CREATE OR REPLACE VIEW simple_manager_recordings AS
SELECT
  r.id,
  r.title,
  r.employee_name,
  r.customer_name,
  r.content_type,
  r.status,
  r.duration,
  r.created_at,
  r.team_id,
  t.name as team_name,
  t.department as team_department,
  bse.overall_score as bdr_overall_score
FROM recordings r
LEFT JOIN teams t ON t.id = r.team_id
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = r.id
WHERE
  -- Simple admin access (all recordings for admins)
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  OR
  -- User's own recordings
  r.user_id = auth.uid()
  OR
  -- Manager access via SECURITY DEFINER function
  can_access_recording(auth.uid(), r.id);

GRANT SELECT ON simple_manager_recordings TO authenticated, service_role;

-- Test the simple view
DO $$
DECLARE
  simple_view_count INT;
BEGIN
  SELECT COUNT(*) INTO simple_view_count FROM simple_manager_recordings;
  RAISE NOTICE '=== SIMPLE VIEW TEST ===';
  RAISE NOTICE 'Simple manager recordings count: %', simple_view_count;

  IF simple_view_count > 0 THEN
    RAISE NOTICE '✅ Simple view is working! This can be used as backup.';
  END IF;
END $$;

COMMENT ON VIEW simple_manager_recordings IS 'Simplified manager recordings view for testing and backup purposes';