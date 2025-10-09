-- =============================================================================
-- SIMPLIFIED SCRIPT: Link Andrew Sherley to Recording NOW
-- =============================================================================
-- Copy this ENTIRE script and paste it into Supabase SQL Editor
-- Then click RUN
-- =============================================================================

DO $$
DECLARE
  andrew_id UUID := 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46';
  rec_id UUID := 'b983a9f3-ca13-4ba1-a877-d35489dda124';
  result RECORD;
BEGIN
  -- Step 1: Check if already linked
  IF EXISTS (
    SELECT 1 FROM employee_call_participation
    WHERE employee_id = andrew_id AND recording_id = rec_id
  ) THEN
    RAISE NOTICE '✅ Already linked! Updating...';

    UPDATE employee_call_participation
    SET
      manually_tagged = true,
      confidence_score = 1.0,
      speaker_segments = jsonb_build_object(
        'detection_method', 'manual',
        'detected_name', 'Andrew Sherley',
        'name_type', 'full_name',
        'reasoning', 'Manually linked/updated via SQL',
        'timestamp', NOW()
      ),
      updated_at = NOW()
    WHERE employee_id = andrew_id AND recording_id = rec_id;
  ELSE
    RAISE NOTICE '📝 Creating new link...';

    -- Delete any wrong existing links first
    DELETE FROM employee_call_participation
    WHERE recording_id = rec_id AND employee_id != andrew_id;

    -- Create the link
    INSERT INTO employee_call_participation (
      recording_id,
      employee_id,
      participation_type,
      talk_time_seconds,
      talk_time_percentage,
      confidence_score,
      manually_tagged,
      speaker_segments
    ) VALUES (
      rec_id,
      andrew_id,
      'primary',
      0,
      0,
      1.0,
      true,
      jsonb_build_object(
        'detection_method', 'manual',
        'detected_name', 'Andrew Sherley',
        'name_type', 'full_name',
        'reasoning', 'Manually linked via SQL Editor',
        'timestamp', NOW()
      )
    );
  END IF;

  -- Update recording employee_name
  UPDATE recordings
  SET employee_name = 'Andrew Sherley', updated_at = NOW()
  WHERE id = rec_id;

  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉 SUCCESS! 🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE 'Andrew Sherley is now linked to the recording!';
  RAISE NOTICE '';
  RAISE NOTICE 'Profile URL: /employees/f625947d-aa0d-4e1f-8daa-33ac30ec1d46';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Clear cache (Ctrl+Shift+R) and check the profile!';

END $$;

-- Verify it worked
SELECT
  e.first_name || ' ' || e.last_name as employee,
  r.title as recording,
  ecp.confidence_score,
  ecp.manually_tagged,
  ecp.created_at
FROM employee_call_participation ecp
JOIN employees e ON e.id = ecp.employee_id
JOIN recordings r ON r.id = ecp.recording_id
WHERE ecp.employee_id = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46'
  AND ecp.recording_id = 'b983a9f3-ca13-4ba1-a877-d35489dda124';
