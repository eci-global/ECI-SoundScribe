-- FIX MANAGER ACCESSIBLE RECORDINGS VIEW - SIMPLIFY COMPLEX JOINS
-- The diagnostics showed that complex JOINs break the view, but the CTE logic works perfectly

-- =============================================================================
-- DROP AND RECREATE SIMPLIFIED VIEW
-- =============================================================================

-- Drop the problematic complex view
DROP VIEW IF EXISTS manager_accessible_recordings;

-- Create a simplified version with minimal JOINs that definitely works
CREATE VIEW manager_accessible_recordings AS
WITH accessible_recordings AS (
  SELECT r.*
  FROM recordings r
  WHERE
    -- User's own recordings
    r.user_id = auth.uid()
    OR
    -- Recordings from accessible teams (using SECURITY DEFINER function)
    r.team_id = ANY(get_accessible_team_ids(auth.uid()))
    OR
    -- Admin access (using SECURITY DEFINER function)
    get_recording_access_level(auth.uid()) = 'admin'
),
recording_with_basic_info AS (
  SELECT
    ar.*,
    -- Get team info with simple subquery (avoid complex JOIN)
    (SELECT name FROM teams WHERE id = ar.team_id AND is_active = true) as team_name,
    (SELECT department FROM teams WHERE id = ar.team_id AND is_active = true) as team_department,
    -- Get BDR info with simple subquery (avoid complex JOIN)
    (SELECT overall_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_overall_score,
    (SELECT opening_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_opening_score,
    (SELECT objection_handling_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_objection_handling_score,
    (SELECT qualification_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_qualification_score,
    (SELECT tone_energy_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_tone_energy_score,
    (SELECT assertiveness_control_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_assertiveness_control_score,
    (SELECT business_acumen_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_business_acumen_score,
    (SELECT closing_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_closing_score,
    (SELECT talk_time_score FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_talk_time_score,
    (SELECT manager_notes FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_manager_notes,
    (SELECT created_at FROM bdr_scorecard_evaluations WHERE recording_id = ar.id LIMIT 1) as bdr_evaluated_at,
    -- Get employee info with simple subquery (avoid complex JOIN)
    (SELECT employee_name FROM team_members WHERE user_id = ar.user_id AND is_active = true LIMIT 1) as employee_display_name,
    (SELECT email FROM team_members WHERE user_id = ar.user_id AND is_active = true LIMIT 1) as employee_email,
    (SELECT role FROM team_members WHERE user_id = ar.user_id AND is_active = true LIMIT 1) as employee_role,
    -- Get uploader info with simple subquery (avoid complex JOIN)
    (SELECT email FROM auth.users WHERE id = ar.user_id) as uploader_email,
    (SELECT COALESCE(raw_user_meta_data->>'full_name', email) FROM auth.users WHERE id = ar.user_id) as uploader_name
  FROM accessible_recordings ar
)
SELECT
  -- Core recording data
  rwbi.id,
  rwbi.title,
  rwbi.user_id,
  rwbi.employee_name,
  rwbi.customer_name,
  rwbi.content_type,
  rwbi.status,
  rwbi.duration,
  rwbi.file_size,
  rwbi.transcript,
  rwbi.ai_summary,
  rwbi.created_at,
  rwbi.updated_at,
  rwbi.team_id,
  rwbi.call_notes,
  -- Team information
  rwbi.team_name,
  rwbi.team_department,
  -- BDR evaluation data
  rwbi.bdr_overall_score,
  rwbi.bdr_opening_score,
  rwbi.bdr_objection_handling_score,
  rwbi.bdr_qualification_score,
  rwbi.bdr_tone_energy_score,
  rwbi.bdr_assertiveness_control_score,
  rwbi.bdr_business_acumen_score,
  rwbi.bdr_closing_score,
  rwbi.bdr_talk_time_score,
  rwbi.bdr_manager_notes,
  rwbi.bdr_evaluated_at,
  -- Employee information
  rwbi.employee_display_name,
  rwbi.employee_email,
  rwbi.employee_role,
  -- Uploader information
  rwbi.uploader_email,
  rwbi.uploader_name
FROM recording_with_basic_info rwbi;

-- Grant access
GRANT SELECT ON manager_accessible_recordings TO authenticated, service_role;

-- =============================================================================
-- TEST THE FIXED VIEW
-- =============================================================================

DO $$
DECLARE
  fixed_view_count INT;
  sample_record RECORD;
BEGIN
  -- Test the fixed view
  SELECT COUNT(*) INTO fixed_view_count FROM manager_accessible_recordings;

  RAISE NOTICE '=== FIXED VIEW TEST ===';
  RAISE NOTICE 'Fixed manager_accessible_recordings count: %', fixed_view_count;

  IF fixed_view_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Fixed view is working with % records!', fixed_view_count;

    -- Get a sample record to verify data completeness
    SELECT title, team_name, bdr_overall_score, employee_display_name INTO sample_record
    FROM manager_accessible_recordings
    LIMIT 1;

    RAISE NOTICE '✅ Sample record verification:';
    RAISE NOTICE '   Title: %', COALESCE(sample_record.title, 'NULL');
    RAISE NOTICE '   Team: %', COALESCE(sample_record.team_name, 'NULL');
    RAISE NOTICE '   BDR Score: %', COALESCE(sample_record.bdr_overall_score::text, 'NULL');
    RAISE NOTICE '   Employee: %', COALESCE(sample_record.employee_display_name, 'NULL');

  ELSE
    RAISE NOTICE '❌ STILL FAILING: Even simplified view returns 0 records';
    RAISE NOTICE '   This suggests a deeper issue with the CTE or access functions';
  END IF;
END $$;

-- =============================================================================
-- CREATE EMERGENCY FALLBACK VIEW (ULTRA-SIMPLE)
-- =============================================================================

-- Create an ultra-simple view that absolutely must work for admins
CREATE OR REPLACE VIEW emergency_manager_recordings AS
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
  -- Simple team name lookup
  (SELECT name FROM teams WHERE id = r.team_id) as team_name,
  -- Simple BDR score lookup
  (SELECT overall_score FROM bdr_scorecard_evaluations WHERE recording_id = r.id LIMIT 1) as bdr_overall_score
FROM recordings r
WHERE
  -- Simple admin check
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  );

GRANT SELECT ON emergency_manager_recordings TO authenticated, service_role;

-- Test the emergency view
DO $$
DECLARE
  emergency_count INT;
BEGIN
  SELECT COUNT(*) INTO emergency_count FROM emergency_manager_recordings;
  RAISE NOTICE '=== EMERGENCY VIEW TEST ===';
  RAISE NOTICE 'Emergency manager recordings count: %', emergency_count;

  IF emergency_count > 0 THEN
    RAISE NOTICE '✅ EMERGENCY VIEW WORKS: % records available as fallback', emergency_count;
  END IF;
END $$;

-- =============================================================================
-- FINAL SUCCESS MESSAGE
-- =============================================================================

DO $$
DECLARE
  main_view_count INT;
  emergency_view_count INT;
BEGIN
  SELECT COUNT(*) INTO main_view_count FROM manager_accessible_recordings;
  SELECT COUNT(*) INTO emergency_view_count FROM emergency_manager_recordings;

  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL MANAGER VIEW STATUS ===';
  RAISE NOTICE 'Main view (manager_accessible_recordings): % records', main_view_count;
  RAISE NOTICE 'Emergency view (emergency_manager_recordings): % records', emergency_view_count;

  IF main_view_count > 0 THEN
    RAISE NOTICE '🎉 SUCCESS: Main manager view is now working!';
    RAISE NOTICE '   Use manager_accessible_recordings for the /admin/all-recordings page';
  ELSIF emergency_view_count > 0 THEN
    RAISE NOTICE '⚠️  FALLBACK: Use emergency_manager_recordings as temporary solution';
    RAISE NOTICE '   This simpler view works until main view can be optimized';
  ELSE
    RAISE NOTICE '❌ CRITICAL: Both views failing - investigate auth context';
  END IF;

END $$;

COMMENT ON VIEW manager_accessible_recordings IS 'Fixed manager recordings view using subqueries instead of complex JOINs to avoid RLS recursion issues';
COMMENT ON VIEW emergency_manager_recordings IS 'Ultra-simple fallback view for admin access to recordings when main view has issues';