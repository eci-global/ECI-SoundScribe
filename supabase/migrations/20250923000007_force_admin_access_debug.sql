-- Emergency fix: Force admin access with very permissive RLS policies for debugging
-- This ensures the frontend can read user roles properly

-- Temporarily disable RLS to ensure we can insert/update
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Ensure the admin user has admin role in the table (force delete/insert)
DELETE FROM user_roles WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid;

INSERT INTO user_roles (user_id, role, granted_by, granted_at, created_at)
VALUES (
    '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid,
    'admin',
    '1fd13984-3457-40ea-9220-20447a1ff9ae'::uuid,
    NOW(),
    NOW()
);

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow anon read for validation" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Allow all authenticated access" ON user_roles;
DROP POLICY IF EXISTS "Allow anon read access" ON user_roles;
DROP POLICY IF EXISTS "Allow service role access" ON user_roles;

-- Create very permissive policies for debugging (we'll tighten these later)
CREATE POLICY "Allow all authenticated access" ON user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read access" ON user_roles
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service role access" ON user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);