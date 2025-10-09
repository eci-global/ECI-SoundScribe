-- =============================================================================
-- Link Andrew Sherley to Recording b983a9f3-ca13-4ba1-a877-d35489dda124
-- =============================================================================
-- Andrew Sherley Employee ID: f625947d-aa0d-4e1f-8daa-33ac30ec1d46
-- Recording ID (from path): b983a9f3-ca13-4ba1-a877-d35489dda124
--
-- This script will:
-- 1. Verify Andrew Sherley exists in database ✅ (confirmed: f625947d-aa0d-4e1f-8daa-33ac30ec1d46)
-- 2. Verify the recording exists and has a transcript
-- 3. Clean up any incorrect existing participation records
-- 4. Link the recording to Andrew Sherley
-- 5. Verify the link was successful
--
-- INSTRUCTIONS:
-- Run this entire script in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Constants
DO $$
DECLARE
  andrew_employee_id UUID := 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46';
  recording_id UUID := 'b983a9f3-ca13-4ba1-a877-d35489dda124';
  rec RECORD;
  part_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 ===================================================================';
  RAISE NOTICE '🔧 Linking Andrew Sherley to Recording';
  RAISE NOTICE '🔧 ===================================================================';
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 1: Verify Andrew Sherley Exists
  -- ============================================================================
  RAISE NOTICE '📋 STEP 1: Verifying Andrew Sherley in database...';
  RAISE NOTICE '   Employee ID: %', andrew_employee_id;

  SELECT
    first_name,
    last_name,
    email,
    status,
    department,
    role
  INTO rec
  FROM employees
  WHERE id = andrew_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '❌ ERROR: Andrew Sherley not found with ID %', andrew_employee_id;
  END IF;

  RAISE NOTICE '✅ Found: % % (%, %, status: %)',
    rec.first_name, rec.last_name, rec.email, rec.department, rec.status;

  IF rec.status != 'active' THEN
    RAISE WARNING '⚠️  Employee status is not "active": %', rec.status;
    RAISE NOTICE '   Updating status to "active"...';
    UPDATE employees SET status = 'active' WHERE id = andrew_employee_id;
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 2: Verify Recording Exists
  -- ============================================================================
  RAISE NOTICE '📋 STEP 2: Verifying recording exists...';
  RAISE NOTICE '   Recording ID: %', recording_id;

  SELECT
    title,
    status,
    employee_name,
    LENGTH(transcript) as transcript_length,
    user_id,
    created_at
  INTO rec
  FROM recordings
  WHERE id = recording_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '❌ ERROR: Recording % not found! The ID might be incorrect or the recording was deleted.', recording_id;
  END IF;

  RAISE NOTICE '✅ Found recording: "%"', rec.title;
  RAISE NOTICE '   Status: %', rec.status;
  RAISE NOTICE '   Current employee_name field: %', COALESCE(rec.employee_name, '(none)');
  RAISE NOTICE '   Transcript length: % characters', COALESCE(rec.transcript_length, 0);
  RAISE NOTICE '   Created: %', rec.created_at;

  IF rec.transcript_length IS NULL OR rec.transcript_length = 0 THEN
    RAISE WARNING '⚠️  WARNING: Recording has no transcript!';
    RAISE NOTICE '   Employee detection works best with transcripts.';
    RAISE NOTICE '   Proceeding anyway with manual link...';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 3: Check Existing Participation Records
  -- ============================================================================
  RAISE NOTICE '📋 STEP 3: Checking existing participation records...';

  SELECT COUNT(*) INTO part_count
  FROM employee_call_participation
  WHERE recording_id = recording_id;

  IF part_count > 0 THEN
    RAISE NOTICE '⚠️  Found % existing participation record(s):', part_count;

    -- Show details
    FOR rec IN
      SELECT
        ecp.id as participation_id,
        ecp.employee_id,
        e.first_name,
        e.last_name,
        ecp.confidence_score,
        ecp.manually_tagged,
        ecp.speaker_segments->>'detection_method' as detection_method,
        ecp.speaker_segments->>'detected_name' as detected_name
      FROM employee_call_participation ecp
      LEFT JOIN employees e ON e.id = ecp.employee_id
      WHERE ecp.recording_id = recording_id
    LOOP
      RAISE NOTICE '   - % % (employee_id: %)', rec.first_name, rec.last_name, rec.employee_id;
      RAISE NOTICE '     Participation ID: %', rec.participation_id;
      RAISE NOTICE '     Confidence: %, Manual: %, Method: %',
        rec.confidence_score, rec.manually_tagged, COALESCE(rec.detection_method, 'unknown');
      RAISE NOTICE '     Detected name: %', COALESCE(rec.detected_name, 'none');

      -- Check if this is already Andrew
      IF rec.employee_id = andrew_employee_id THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅✅✅ Recording is ALREADY linked to Andrew Sherley! ✅✅✅';
        RAISE NOTICE '';
        RAISE NOTICE '   The participation record exists in the database.';
        RAISE NOTICE '   Participation ID: %', rec.participation_id;
        RAISE NOTICE '';
        RAISE NOTICE '💡 If the recording is not showing on Andrew''s profile page:';
        RAISE NOTICE '';
        RAISE NOTICE '   1. Check the URL is correct: /employees/%', andrew_employee_id;
        RAISE NOTICE '   2. Clear browser cache and refresh the page (Ctrl+Shift+R)';
        RAISE NOTICE '   3. Check browser console (F12) for JavaScript errors';
        RAISE NOTICE '   4. Verify the frontend is querying the correct employee ID';
        RAISE NOTICE '   5. Check employeeService.ts getEmployeeRecentRecordingsAny() function';
        RAISE NOTICE '';
        RAISE NOTICE '🔍 Debug: Run this query in your frontend to check:';
        RAISE NOTICE '   SELECT * FROM employee_call_participation WHERE employee_id = ''%''', andrew_employee_id;
        RAISE NOTICE '';
        RETURN;  -- Exit early, no changes needed
      END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '⚠️  These participation records are for OTHER employees, not Andrew.';
    RAISE NOTICE '   This might be incorrect if this recording should be Andrew''s.';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Cleaning up incorrect participation records...';

    -- Delete non-Andrew records
    DELETE FROM employee_call_participation
    WHERE recording_id = recording_id
      AND employee_id != andrew_employee_id;

    GET DIAGNOSTICS part_count = ROW_COUNT;
    RAISE NOTICE '✅ Removed % incorrect participation record(s)', part_count;

  ELSE
    RAISE NOTICE '✅ No existing participation records (clean state)';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 4: Create Participation Record
  -- ============================================================================
  RAISE NOTICE '📋 STEP 4: Creating participation record to link recording...';

  INSERT INTO employee_call_participation (
    recording_id,
    employee_id,
    participation_type,
    talk_time_seconds,
    talk_time_percentage,
    confidence_score,
    manually_tagged,
    speaker_segments,
    created_at
  ) VALUES (
    recording_id,
    andrew_employee_id,
    'primary',
    0,
    0,
    1.0,
    true,
    jsonb_build_object(
      'detection_method', 'manual',
      'detected_name', 'Andrew Sherley',
      'name_type', 'full_name',
      'reasoning', 'Manually linked by administrator to fix profile not showing recording',
      'linked_at', NOW()
    ),
    NOW()
  )
  ON CONFLICT (recording_id, employee_id) DO UPDATE SET
    manually_tagged = true,
    confidence_score = 1.0,
    speaker_segments = jsonb_build_object(
      'detection_method', 'manual',
      'detected_name', 'Andrew Sherley',
      'name_type', 'full_name',
      'reasoning', 'Manually re-linked by administrator',
      'updated_at', NOW()
    ),
    updated_at = NOW()
  RETURNING id;

  GET DIAGNOSTICS part_count = ROW_COUNT;

  IF part_count > 0 THEN
    RAISE NOTICE '✅ Successfully created participation record!';
  ELSE
    RAISE NOTICE '✅ Participation record already existed (updated)';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 5: Update Recording Employee Name Field (Optional)
  -- ============================================================================
  RAISE NOTICE '📋 STEP 5: Updating recording.employee_name field...';

  UPDATE recordings
  SET
    employee_name = 'Andrew Sherley',
    updated_at = NOW()
  WHERE id = recording_id;

  RAISE NOTICE '✅ Set recording.employee_name = "Andrew Sherley"';
  RAISE NOTICE '';

  -- ============================================================================
  -- STEP 6: Verify Success
  -- ============================================================================
  RAISE NOTICE '📋 STEP 6: Final verification...';
  RAISE NOTICE '';

  -- Count Andrew's total linked recordings
  SELECT COUNT(*) INTO part_count
  FROM employee_call_participation
  WHERE employee_id = andrew_employee_id;

  RAISE NOTICE '✅ Andrew Sherley now has % linked recording(s) total', part_count;

  -- Verify this specific recording is linked
  IF EXISTS (
    SELECT 1
    FROM employee_call_participation
    WHERE recording_id = recording_id
      AND employee_id = andrew_employee_id
  ) THEN
    RAISE NOTICE '✅ This recording is confirmed linked to Andrew Sherley!';
  ELSE
    RAISE EXCEPTION '❌ UNEXPECTED: Participation record was not found after creation!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ===================================================================';
  RAISE NOTICE '🎉 SUCCESS! Recording is now linked to Andrew Sherley!';
  RAISE NOTICE '🎉 ===================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   Employee: Andrew Sherley';
  RAISE NOTICE '   Employee ID: %', andrew_employee_id;
  RAISE NOTICE '   Recording ID: %', recording_id;
  RAISE NOTICE '   Total linked recordings: %', part_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Next Steps:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Open Andrew Sherley''s profile page:';
  RAISE NOTICE '      /employees/%', andrew_employee_id;
  RAISE NOTICE '';
  RAISE NOTICE '   2. Navigate to the "Recordings" tab';
  RAISE NOTICE '';
  RAISE NOTICE '   3. You should see the recording listed!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 If you STILL don''t see it on the profile page:';
  RAISE NOTICE '';
  RAISE NOTICE '   Problem 1: Frontend not querying correctly';
  RAISE NOTICE '   → Check browser console (F12) for errors';
  RAISE NOTICE '   → Verify the URL contains: /employees/f625947d-aa0d-4e1f-8daa-33ac30ec1d46';
  RAISE NOTICE '   → Check src/services/employeeService.ts line 1017-1175';
  RAISE NOTICE '';
  RAISE NOTICE '   Problem 2: Cache issue';
  RAISE NOTICE '   → Clear browser cache (Ctrl+Shift+Delete)';
  RAISE NOTICE '   → Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)';
  RAISE NOTICE '';
  RAISE NOTICE '   Problem 3: RLS Policy blocking frontend';
  RAISE NOTICE '   → Check that SELECT policy on employee_call_participation allows access';
  RAISE NOTICE '   → Run the verification query below';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY - Run this to confirm link exists
-- ============================================================================

SELECT '✅ VERIFICATION: Andrew Sherley''s Linked Recordings' as info;

SELECT
  e.id as employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  r.id as recording_id,
  r.title as recording_title,
  r.status as recording_status,
  r.employee_name as recording_employee_field,
  ecp.id as participation_id,
  ecp.participation_type,
  ecp.confidence_score,
  ecp.manually_tagged,
  ecp.speaker_segments->>'detection_method' as detection_method,
  ecp.speaker_segments->>'detected_name' as detected_name,
  ecp.created_at as linked_at
FROM employee_call_participation ecp
JOIN employees e ON e.id = ecp.employee_id
JOIN recordings r ON r.id = ecp.recording_id
WHERE e.id = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46'  -- Andrew Sherley
ORDER BY ecp.created_at DESC;

-- ============================================================================
-- ALTERNATIVE: Check for RLS Policy Issues
-- ============================================================================

SELECT '🔒 RLS Policies on employee_call_participation' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employee_call_participation'
ORDER BY policyname;
