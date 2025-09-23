-- Fix RLS policies for user_roles table to allow frontend access
-- This ensures authenticated users can read their own roles for useUserRole hook

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow anon read for validation" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to see their own roles (critical for frontend useUserRole hook)
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow anonymous read for validation functions (for Edge Functions)
CREATE POLICY "Allow anon read for validation" ON user_roles
  FOR SELECT USING (true);

-- Policy 3: Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Policy 4: Service role can manage all roles (for Edge Functions)
CREATE POLICY "Service role can manage roles" ON user_roles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Ensure admin role assignment exists for admin@soundscribe.com
DO $$
DECLARE
    admin_user_id UUID := '1fd13984-3457-40ea-9220-20447a1ff9ae';
    existing_role TEXT;
BEGIN
    -- Check if admin role exists for this user
    SELECT role INTO existing_role
    FROM user_roles
    WHERE user_id = admin_user_id
    LIMIT 1;

    -- If no role or not admin, ensure admin role is assigned
    IF existing_role IS NULL OR existing_role != 'admin' THEN
        INSERT INTO user_roles (user_id, role, granted_by, granted_at, created_at)
        VALUES (admin_user_id, 'admin', admin_user_id, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            role = 'admin',
            granted_by = admin_user_id,
            granted_at = NOW(),
            updated_at = NOW();

        RAISE NOTICE 'Ensured admin role for user ID: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Admin role already exists for user ID: %', admin_user_id;
    END IF;
END $$;