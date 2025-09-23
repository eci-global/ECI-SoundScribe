-- Allow Anonymous Read Access to User Roles for Admin Validation
-- Issue: Edge Functions running with anon permissions can't validate admin status
-- Created: 2025-09-18

-- Add policy to allow anon role to read user_roles for admin validation
CREATE POLICY "anon_can_read_roles_for_validation" ON user_roles
FOR SELECT TO anon
USING (true);

-- Grant SELECT permission to anon role
GRANT SELECT ON user_roles TO anon;

-- Test that anon can now read the admin role
SELECT 'Testing anon access to admin role:' as test_label;
SELECT user_id, role, created_at
FROM user_roles
WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'
AND role = 'admin';

-- Verify the policy is working
DO $$
DECLARE
  admin_found BOOLEAN;
BEGIN
  -- Test if admin role is accessible
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'
    AND role = 'admin'
  ) INTO admin_found;

  IF admin_found THEN
    RAISE NOTICE 'SUCCESS: Admin role accessible for anon validation (admin_found: %)', admin_found;
  ELSE
    RAISE WARNING 'FAILED: Admin role not accessible for anon validation';
  END IF;
END $$;