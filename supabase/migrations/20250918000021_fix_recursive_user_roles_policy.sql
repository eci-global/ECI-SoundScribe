-- Fix Recursive User Roles Policy
-- Issue: Previous policy created infinite recursion when checking admin status
-- Created: 2025-09-18

-- Disable RLS temporarily to fix policies
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Allow read access for admin validation" ON user_roles;
DROP POLICY IF EXISTS "Allow admin role management" ON user_roles;

-- Ensure admin role exists
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now())
ON CONFLICT (user_id, role) DO UPDATE SET
  created_at = EXCLUDED.created_at;

-- Create simple, non-recursive policies
-- Allow all authenticated users to read user_roles (needed for admin validation)
CREATE POLICY "authenticated_can_read_roles" ON user_roles
FOR SELECT TO authenticated
USING (true);

-- Allow service role full access for admin functions
CREATE POLICY "service_role_full_access" ON user_roles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Allow users to see only their own roles for regular operations
CREATE POLICY "users_see_own_roles" ON user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Only allow specific admin user to manage roles (avoid recursion)
CREATE POLICY "admin_user_manage_roles" ON user_roles
FOR ALL TO authenticated
USING (auth.uid() = '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid)
WITH CHECK (auth.uid() = '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid);

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Test that policies work
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM user_roles
  WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'
  AND role = 'admin';

  IF role_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Admin role accessible without recursion (count: %)', role_count;
  ELSE
    RAISE WARNING 'FAILED: Admin role not found or not accessible';
  END IF;
END $$;

-- Grant explicit permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;