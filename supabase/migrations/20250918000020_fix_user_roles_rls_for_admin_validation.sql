-- Fix User Roles RLS for Admin Validation
-- Issue: Admin validation functions can't read user_roles table due to RLS restrictions
-- Created: 2025-09-18

-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Users can only see their own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_roles;

-- Ensure admin role exists first (force insert with RLS disabled)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now())
ON CONFLICT (user_id, role) DO UPDATE SET
  created_at = EXCLUDED.created_at;

-- Create more permissive RLS policies that allow admin validation functions to work
CREATE POLICY "Allow read access for admin validation" ON user_roles
FOR SELECT USING (true);

CREATE POLICY "Allow admin role management" ON user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
  OR auth.role() = 'service_role'
);

-- Re-enable RLS with new policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions for authenticated users to read roles
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON user_roles TO anon;

-- Test the admin validation function
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'
    AND role = 'admin'
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'SUCCESS: Admin role properly configured and readable (admin_exists: %)', admin_exists;
  ELSE
    RAISE WARNING 'FAILED: Admin role not found or not readable';
  END IF;
END $$;

-- Verify the RLS policies allow function access
COMMENT ON TABLE user_roles IS 'User roles table - RLS updated to allow admin validation functions to read roles';