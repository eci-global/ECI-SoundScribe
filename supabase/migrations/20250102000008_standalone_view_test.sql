-- STANDALONE VIEW TEST - Comprehensive testing without dependencies

DO $$
DECLARE
  admin_user_id UUID := '1fd13984-3457-40ea-9220-20447a1ff9ae';
  total_recordings INT;
  admin_access_recordings INT;
  view_count INT;
  cte_count INT;
  simple_admin_count INT;
BEGIN
  RAISE NOTICE '=== STANDALONE COMPREHENSIVE TESTING ===';

  -- 1. Total recordings in database
  SELECT COUNT(*) INTO total_recordings FROM recordings;
  RAISE NOTICE '1. Total recordings in database: %', total_recordings;

  -- 2. Test get_recording_access_level function
  IF get_recording_access_level(admin_user_id) = 'admin' THEN
    RAISE NOTICE '2. ✅ get_recording_access_level works: admin';
  ELSE
    RAISE NOTICE '2. ❌ get_recording_access_level failed: %', get_recording_access_level(admin_user_id);
  END IF;

  -- 3. Count recordings where admin check passes
  SELECT COUNT(*) INTO admin_access_recordings
  FROM recordings r
  WHERE get_recording_access_level(admin_user_id) = 'admin';
  RAISE NOTICE '3. Recordings passing admin check: %', admin_access_recordings;

  -- 4. Test the exact CTE logic from manager_accessible_recordings
  WITH accessible_recordings AS (
    SELECT r.*
    FROM recordings r
    WHERE
      r.user_id = admin_user_id
      OR r.team_id = ANY(get_accessible_team_ids(admin_user_id))
      OR get_recording_access_level(admin_user_id) = 'admin'
  )
  SELECT COUNT(*) INTO cte_count FROM accessible_recordings;
  RAISE NOTICE '4. CTE accessible_recordings count: %', cte_count;

  -- 5. Test manager_accessible_recordings view
  SELECT COUNT(*) INTO view_count FROM manager_accessible_recordings;
  RAISE NOTICE '5. manager_accessible_recordings view count: %', view_count;

  -- 6. Test simple admin query
  SELECT COUNT(*) INTO simple_admin_count
  FROM recordings r
  WHERE EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = admin_user_id AND ur.role = 'admin'
  );
  RAISE NOTICE '6. Simple admin query count: %', simple_admin_count;

  RAISE NOTICE '';
  RAISE NOTICE '=== ANALYSIS ===';

  IF admin_access_recordings = total_recordings THEN
    RAISE NOTICE '✅ SECURITY DEFINER function works perfectly';
  END IF;

  IF cte_count = total_recordings THEN
    RAISE NOTICE '✅ CTE logic works perfectly';
  END IF;

  IF simple_admin_count = total_recordings THEN
    RAISE NOTICE '✅ Simple admin check works perfectly';
  END IF;

  IF view_count = 0 AND cte_count > 0 THEN
    RAISE NOTICE '❌ ISSUE IDENTIFIED: View JOINs are causing problems';
    RAISE NOTICE '   The CTE works but the full view with JOINs fails';
    RAISE NOTICE '   Solution: Simplify the view to fix JOIN issues';
  ELSIF view_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: manager_accessible_recordings is working! (% records)', view_count;
  END IF;

END $$;

-- =============================================================================
-- CREATE WORKING REPLACEMENT VIEW
-- =============================================================================

-- If the complex view has issues, create a simpler working version
DROP VIEW IF EXISTS manager_recordings_working;

CREATE VIEW manager_recordings_working AS
SELECT
  r.id,
  r.title,
  r.user_id,
  r.employee_name,
  r.customer_name,
  r.content_type,
  r.status,
  r.duration,
  r.file_size,
  r.created_at,
  r.updated_at,
  r.team_id,
  -- Simplified team info (reduce JOIN complexity)
  COALESCE(t.name, 'No Team') as team_name,
  COALESCE(t.department, 'unassigned') as team_department,
  -- Simplified BDR info
  bse.overall_score as bdr_overall_score,
  -- Simple user info
  COALESCE(r.employee_name, 'Unknown') as employee_display_name
FROM recordings r
LEFT JOIN teams t ON t.id = r.team_id AND t.is_active = true
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = r.id
WHERE
  -- Admin access (simple check)
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  OR
  -- User's own recordings
  r.user_id = auth.uid()
  OR
  -- Team access via function
  r.team_id = ANY(get_accessible_team_ids(auth.uid()));

GRANT SELECT ON manager_recordings_working TO authenticated, service_role;

-- Test the working view
DO $$
DECLARE
  working_view_count INT;
BEGIN
  SELECT COUNT(*) INTO working_view_count FROM manager_recordings_working;
  RAISE NOTICE '';
  RAISE NOTICE '=== WORKING VIEW TEST ===';
  RAISE NOTICE 'manager_recordings_working count: %', working_view_count;

  IF working_view_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Working replacement view is functional!';
    RAISE NOTICE '   You can use this view until the complex view is fixed.';
  END IF;
END $$;

COMMENT ON VIEW manager_recordings_working IS 'Simplified manager recordings view with reduced JOIN complexity - use as replacement if main view has issues';