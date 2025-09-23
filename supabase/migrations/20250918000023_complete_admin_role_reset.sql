-- Complete Admin Role Reset - Fix RLS and Admin Access
-- Issue: Admin validation still failing despite multiple fix attempts
-- Created: 2025-09-18

-- Step 1: Temporarily disable RLS to clean slate
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Remove all existing policies
DROP POLICY IF EXISTS "anon_can_read_roles_for_validation" ON user_roles;
DROP POLICY IF EXISTS "authenticated_can_read_roles" ON user_roles;
DROP POLICY IF EXISTS "service_role_full_access" ON user_roles;
DROP POLICY IF EXISTS "users_see_own_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_user_manage_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow read access for admin validation" ON user_roles;
DROP POLICY IF EXISTS "Allow admin role management" ON user_roles;

-- Step 3: Clean and ensure admin role exists
DELETE FROM public.user_roles WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae';

INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now());

-- Step 4: Create simplified policies that ALWAYS allow admin validation
-- Allow anon role to read for Edge Function validation (critical for admin validation)
CREATE POLICY "allow_anon_read_for_admin_validation" ON user_roles
FOR SELECT TO anon
USING (true);

-- Allow authenticated users to read (for UI components)
CREATE POLICY "allow_authenticated_read" ON user_roles
FOR SELECT TO authenticated
USING (true);

-- Allow service role full access (for admin functions)
CREATE POLICY "allow_service_role_full_access" ON user_roles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Allow specific admin user all operations
CREATE POLICY "allow_admin_user_full_access" ON user_roles
FOR ALL TO authenticated
USING (auth.uid() = '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid)
WITH CHECK (auth.uid() = '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid);

-- Step 5: Re-enable RLS with new policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant explicit permissions to all relevant roles
GRANT SELECT ON user_roles TO anon;
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

-- Step 7: Test admin validation function directly
DO $$
DECLARE
  admin_found BOOLEAN;
  validation_result BOOLEAN;
BEGIN
  -- Test 1: Direct table query
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'
    AND role = 'admin'
  ) INTO admin_found;

  RAISE NOTICE 'Direct query - Admin role found: %', admin_found;

  -- Test 2: Validation function
  SELECT is_admin_user_cached('1fd13984-3457-40ea-9220-20447a1ff9ae') INTO validation_result;

  RAISE NOTICE 'Validation function result: %', validation_result;

  -- Test 3: Full admin API access validation
  SELECT validate_admin_api_access('admin') INTO validation_result;

  RAISE NOTICE 'Admin API validation result: %', validation_result;

  IF admin_found AND validation_result THEN
    RAISE NOTICE 'SUCCESS: All admin validation tests passed';
  ELSE
    RAISE WARNING 'FAILED: Admin validation not working properly';
  END IF;
END $$;

-- Step 8: Show current user_roles state
SELECT 'Current user_roles table:' as info;
SELECT user_id, role, created_at FROM user_roles ORDER BY created_at DESC;

-- Add helpful comment
COMMENT ON TABLE user_roles IS 'User roles table - RLS completely rebuilt for admin validation compatibility';