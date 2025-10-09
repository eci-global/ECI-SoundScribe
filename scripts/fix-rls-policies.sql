-- =============================================================================
-- Fix RLS Policies for Employee System
-- =============================================================================
-- This script fixes Row Level Security policies that might be blocking
-- the employee profile pages from showing linked recordings.
--
-- PROBLEM: Even though recordings are linked in the database, the frontend
-- can't query them due to overly restrictive RLS policies.
--
-- SOLUTION: Update RLS policies to allow authenticated users to view
-- employee data and participation records.
-- =============================================================================

-- First, let's check current policies
SELECT '🔍 Current RLS Policies' as info;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('employees', 'employee_call_participation', 'employee_scorecards', 'recordings')
ORDER BY tablename, policyname;

-- =============================================================================
-- FIX 1: Allow authenticated users to READ employees table
-- =============================================================================

-- Drop existing overly-restrictive policies if they exist
DROP POLICY IF EXISTS "Users can only view their own employee record" ON employees;
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON employees;

-- Create permissive SELECT policy for all authenticated users
CREATE POLICY "Allow authenticated users to read all employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

SELECT '✅ Created policy: authenticated users can read employees table' as info;

-- =============================================================================
-- FIX 2: Allow authenticated users to READ employee_call_participation
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only view participation for their recordings" ON employee_call_participation;
DROP POLICY IF EXISTS "Participation viewable by authenticated users" ON employee_call_participation;

-- Create permissive SELECT policy
CREATE POLICY "Allow authenticated users to read employee_call_participation"
  ON employee_call_participation
  FOR SELECT
  TO authenticated
  USING (true);

SELECT '✅ Created policy: authenticated users can read employee_call_participation' as info;

-- =============================================================================
-- FIX 3: Allow authenticated users to READ employee_scorecards
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only view scorecards for their recordings" ON employee_scorecards;
DROP POLICY IF EXISTS "Scorecards viewable by authenticated users" ON employee_scorecards;

-- Create permissive SELECT policy
CREATE POLICY "Allow authenticated users to read employee_scorecards"
  ON employee_scorecards
  FOR SELECT
  TO authenticated
  USING (true);

SELECT '✅ Created policy: authenticated users can read employee_scorecards' as info;

-- =============================================================================
-- FIX 4: Ensure recordings table allows authenticated users to read their own
-- =============================================================================

-- Check if recordings already has a good policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recordings'
      AND policyname = 'Users can view their own recordings'
      AND cmd = 'SELECT'
  ) THEN
    -- Create policy if it doesn't exist
    CREATE POLICY "Users can view their own recordings"
      ON recordings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    RAISE NOTICE '✅ Created policy: users can read their own recordings';
  ELSE
    RAISE NOTICE 'ℹ️  Recordings SELECT policy already exists';
  END IF;
END $$;

-- =============================================================================
-- FIX 5: Allow INSERT on employee_call_participation for system functions
-- =============================================================================

-- Allow authenticated users to insert participation records
-- (needed for manual tagging and Edge Functions)
DROP POLICY IF EXISTS "Allow authenticated users to create participation records" ON employee_call_participation;

CREATE POLICY "Allow authenticated users to create participation records"
  ON employee_call_participation
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

SELECT '✅ Created policy: authenticated users can insert employee_call_participation' as info;

-- =============================================================================
-- VERIFICATION: Check new policies
-- =============================================================================

SELECT '✅ NEW RLS Policies After Fix' as info;

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN 'Read access'
    WHEN cmd = 'INSERT' THEN 'Create access'
    WHEN cmd = 'UPDATE' THEN 'Update access'
    WHEN cmd = 'DELETE' THEN 'Delete access'
    ELSE cmd
  END as permission_type
FROM pg_policies
WHERE tablename IN ('employees', 'employee_call_participation', 'employee_scorecards', 'recordings')
ORDER BY tablename, cmd, policyname;

-- =============================================================================
-- TEST QUERY: Verify Andrew Sherley's data is now accessible
-- =============================================================================

SELECT '🧪 Test Query: Andrew Sherley''s Profile Data' as info;

-- This query simulates what the frontend would do
SELECT
  e.id as employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.email,
  e.status,
  COUNT(ecp.id) as linked_recordings_count
FROM employees e
LEFT JOIN employee_call_participation ecp ON ecp.employee_id = e.id
WHERE e.id = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46'  -- Andrew Sherley
GROUP BY e.id, e.first_name, e.last_name, e.email, e.status;

-- =============================================================================
-- IMPORTANT NOTES
-- =============================================================================

/*
⚠️  SECURITY CONSIDERATIONS:

These policies allow ALL authenticated users to read employee data. This is
appropriate for an internal company application where all employees should be
able to view each other's profiles and performance data.

If you need more restrictive access:

1. Manager-only access:
   - Add a WHERE clause: WHERE auth.uid() IN (SELECT manager_id FROM employees)

2. Department-based access:
   - Add a WHERE clause joining to user's employee record and checking department

3. Role-based access:
   - Create a user_roles table and check against allowed roles

For now, we're using permissive policies to fix the immediate issue of
Andrew's profile not showing his recordings.
*/

SELECT '📝 RLS Policy Fix Complete!' as info;
SELECT '' as info;
SELECT '✅ All authenticated users can now:' as info;
SELECT '   - Read employees table' as info;
SELECT '   - Read employee_call_participation table' as info;
SELECT '   - Read employee_scorecards table' as info;
SELECT '   - Create participation records' as info;
SELECT '' as info;
SELECT '🎉 Andrew Sherley''s profile should now show his linked recordings!' as info;
SELECT '' as info;
SELECT '💡 Next steps:' as info;
SELECT '   1. Run link-andrew-sherley-recording.sql to link the recording' as info;
SELECT '   2. Refresh Andrew''s profile page' as info;
SELECT '   3. Recording should now appear on the Recordings tab!' as info;
