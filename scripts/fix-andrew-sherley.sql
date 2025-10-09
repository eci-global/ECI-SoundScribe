-- =============================================================================
-- Fix Script: Link Andrew Sherley Recording
-- =============================================================================
-- This script will:
-- 1. Add Andrew Sherley to employees table (if not exists)
-- 2. Find the recording b983a9f3-ca13-4ba1-a877-d35489dda124
-- 3. Link the recording to Andrew Sherley
-- 4. Verify the link was created successfully
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this entire script
-- 3. Update the email/department/role for Andrew (see Section 1 below)
-- 4. Click "Run"
-- 5. Check the output to confirm success
-- =============================================================================

-- Cleanup: Show current state
SELECT '=== STEP 0: Current State ===' as step;
SELECT 'Checking if Andrew Sherley exists...' as action;

SELECT
  id,
  first_name,
  last_name,
  email,
  status,
  employee_id
FROM employees
WHERE (first_name ILIKE 'Andrew' OR first_name ILIKE 'Andy')
  AND (last_name ILIKE 'Sherley' OR last_name ILIKE 'Shirley');

-- =============================================================================
-- SECTION 1: Add Andrew Sherley to Employees Table
-- =============================================================================
-- ⚠️  UPDATE THESE VALUES BEFORE RUNNING:
--     - email: Use Andrew's actual email
--     - department: Use his actual department
--     - role: Use his actual role
--     - employee_id: Use his employee code if you have one
-- =============================================================================

SELECT '=== STEP 1: Adding Andrew Sherley to employees table ===' as step;

INSERT INTO employees (
  first_name,
  last_name,
  email,
  status,
  department,
  role,
  employee_id,
  hire_date,
  created_at,
  updated_at
) VALUES (
  'Andrew',
  'Sherley',
  'asherley@ecisolutions.com',  -- ⚠️  UPDATE THIS EMAIL
  'active',
  'Sales',  -- ⚠️  UPDATE THIS DEPARTMENT
  'Sales Representative',  -- ⚠️  UPDATE THIS ROLE
  '140XXX',  -- ⚠️  UPDATE THIS EMPLOYEE CODE (or remove if unknown)
  CURRENT_DATE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  status = 'active',
  updated_at = NOW()
RETURNING id, first_name, last_name, email, employee_id;

-- Store Andrew's employee ID for later use
DO $$
DECLARE
  andrew_emp_id UUID;
  recording_uuid UUID := 'b983a9f3-ca13-4ba1-a877-d35489dda124';
BEGIN
  -- Get Andrew's employee UUID
  SELECT id INTO andrew_emp_id
  FROM employees
  WHERE first_name = 'Andrew'
    AND last_name = 'Sherley'
  LIMIT 1;

  IF andrew_emp_id IS NULL THEN
    RAISE NOTICE 'ERROR: Could not find Andrew Sherley in employees table!';
    RAISE NOTICE 'Please check the INSERT statement above and ensure it ran successfully.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Andrew Sherley employee record: %', andrew_emp_id;

  -- =============================================================================
  -- SECTION 2: Verify Recording Exists
  -- =============================================================================

  RAISE NOTICE '=== STEP 2: Verifying recording exists ===';

  IF NOT EXISTS (SELECT 1 FROM recordings WHERE id = recording_uuid) THEN
    RAISE NOTICE '⚠️  WARNING: Recording % not found!', recording_uuid;
    RAISE NOTICE 'This might be because:';
    RAISE NOTICE '- The ID is incorrect (not the actual recording ID)';
    RAISE NOTICE '- The recording was deleted';
    RAISE NOTICE '- RLS policies are blocking access';
    RAISE NOTICE '';
    RAISE NOTICE '💡 To find the correct recording, run:';
    RAISE NOTICE 'SELECT id, title, status, employee_name FROM recordings ORDER BY created_at DESC LIMIT 20;';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Recording exists: %', recording_uuid;

  -- Show recording details
  RAISE NOTICE '';
  RAISE NOTICE 'Recording details:';
  DECLARE
    rec RECORD;
  BEGIN
    SELECT title, status, employee_name, LENGTH(transcript) as transcript_len
    INTO rec
    FROM recordings
    WHERE id = recording_uuid;

    RAISE NOTICE '  Title: %', rec.title;
    RAISE NOTICE '  Status: %', rec.status;
    RAISE NOTICE '  Current Employee Name: %', COALESCE(rec.employee_name, 'none');
    RAISE NOTICE '  Transcript Length: % chars', COALESCE(rec.transcript_len, 0);
  END;

  -- =============================================================================
  -- SECTION 3: Clean Up Old Participation Records
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 3: Cleaning up old participation records ===';

  -- Check if there are existing participation records for this recording
  IF EXISTS (
    SELECT 1
    FROM employee_call_participation
    WHERE recording_id = recording_uuid
  ) THEN
    RAISE NOTICE '⚠️  Found existing participation records. Checking if any are for Andrew...';

    -- Show existing records
    DECLARE
      existing_rec RECORD;
    BEGIN
      FOR existing_rec IN
        SELECT
          ecp.id,
          ecp.employee_id,
          e.first_name,
          e.last_name,
          ecp.confidence_score,
          ecp.manually_tagged
        FROM employee_call_participation ecp
        LEFT JOIN employees e ON e.id = ecp.employee_id
        WHERE ecp.recording_id = recording_uuid
      LOOP
        RAISE NOTICE '  Found: % % (ID: %, confidence: %, manual: %)',
          existing_rec.first_name,
          existing_rec.last_name,
          existing_rec.employee_id,
          existing_rec.confidence_score,
          existing_rec.manually_tagged;
      END LOOP;
    END;

    -- If there's already a record for Andrew, skip creation
    IF EXISTS (
      SELECT 1
      FROM employee_call_participation
      WHERE recording_id = recording_uuid
        AND employee_id = andrew_emp_id
    ) THEN
      RAISE NOTICE '✅ Recording is already linked to Andrew Sherley!';
      RAISE NOTICE '   No changes needed.';
      RETURN;
    END IF;

    -- Delete non-Andrew participation records (assuming they're incorrect)
    DELETE FROM employee_call_participation
    WHERE recording_id = recording_uuid
      AND employee_id != andrew_emp_id;

    RAISE NOTICE '✅ Cleaned up incorrect participation records';
  ELSE
    RAISE NOTICE '✅ No existing participation records (clean state)';
  END IF;

  -- =============================================================================
  -- SECTION 4: Create Participation Record (Link Recording to Andrew)
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 4: Creating participation record to link recording to Andrew ===';

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
    recording_uuid,
    andrew_emp_id,
    'primary',
    0,  -- Unknown talk time
    0,  -- Unknown percentage
    1.0,  -- High confidence for manual tag
    true,  -- This is a manual tag
    jsonb_build_object(
      'detection_method', 'manual',
      'detected_name', 'Andrew Sherley',
      'name_type', 'full_name',
      'reasoning', 'Manually linked by administrator via SQL script',
      'timestamp', NOW()
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
      'reasoning', 'Manually linked by administrator via SQL script',
      'timestamp', NOW()
    ),
    updated_at = NOW()
  RETURNING id;

  RAISE NOTICE '✅ Successfully created participation record!';

  -- =============================================================================
  -- SECTION 5: Update Recording with Employee Name (Optional)
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 5: Updating recording.employee_name field ===';

  UPDATE recordings
  SET
    employee_name = 'Andrew Sherley',
    updated_at = NOW()
  WHERE id = recording_uuid;

  RAISE NOTICE '✅ Updated recording.employee_name to "Andrew Sherley"';

  -- =============================================================================
  -- SECTION 6: Verify Success
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 6: Verification ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ SUCCESS! Recording is now linked to Andrew Sherley! ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Details:';
  RAISE NOTICE '  Employee ID: %', andrew_emp_id;
  RAISE NOTICE '  Recording ID: %', recording_uuid;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Next Steps:';
  RAISE NOTICE '  1. Go to Andrew Sherley''s employee profile: /employees/%', andrew_emp_id;
  RAISE NOTICE '  2. Click on the "Recordings" tab';
  RAISE NOTICE '  3. You should now see the recording listed!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 If you still don''t see it:';
  RAISE NOTICE '  - Clear browser cache and refresh the page';
  RAISE NOTICE '  - Check browser console (F12) for errors';
  RAISE NOTICE '  - Run the verification query below';

END $$;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this separately to verify the link was created:

SELECT '=== VERIFICATION: Show Andrew Sherley''s linked recordings ===' as step;

SELECT
  e.first_name || ' ' || e.last_name as employee_name,
  e.id as employee_id,
  r.title as recording_title,
  r.id as recording_id,
  r.status,
  r.employee_name as recording_employee_field,
  ecp.participation_type,
  ecp.confidence_score,
  ecp.manually_tagged,
  ecp.speaker_segments->>'detection_method' as detection_method,
  ecp.created_at as linked_at
FROM employee_call_participation ecp
JOIN employees e ON e.id = ecp.employee_id
JOIN recordings r ON r.id = ecp.recording_id
WHERE e.first_name = 'Andrew'
  AND e.last_name = 'Sherley'
ORDER BY ecp.created_at DESC;

-- =============================================================================
-- ALTERNATIVE: Find recordings by searching for "Andrew" in transcript
-- =============================================================================
-- If the recording ID is wrong, use this to find the right one:

SELECT '=== ALTERNATIVE: Search for recordings with "Andrew" in transcript ===' as step;

SELECT
  id,
  title,
  status,
  employee_name,
  created_at,
  LENGTH(transcript) as transcript_length,
  -- Show a snippet of the transcript
  SUBSTRING(transcript FROM 1 FOR 200) as transcript_preview
FROM recordings
WHERE transcript ILIKE '%andrew%'
   OR transcript ILIKE '%sherley%'
   OR transcript ILIKE '%shirley%'
ORDER BY created_at DESC
LIMIT 10;
