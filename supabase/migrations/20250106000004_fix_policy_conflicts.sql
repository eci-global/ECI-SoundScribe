-- Fix Access Control Policy Conflicts
-- This migration handles existing policy conflicts that prevent clean deployment

-- Drop existing conflicting policies if they exist
DO $$
BEGIN
    -- Resource Permissions policies
    DROP POLICY IF EXISTS "Anyone can view resource permissions" ON public.resource_permissions;
    DROP POLICY IF EXISTS "Admins can manage resource permissions" ON public.resource_permissions;
    DROP POLICY IF EXISTS "Service role can manage resource permissions" ON public.resource_permissions;

    -- Access Policies policies
    DROP POLICY IF EXISTS "Anyone can view access policies" ON public.access_policies;
    DROP POLICY IF EXISTS "Admins can manage access policies" ON public.access_policies;
    DROP POLICY IF EXISTS "Service role can manage access policies" ON public.access_policies;

    -- Role Permissions policies
    DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
    DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
    DROP POLICY IF EXISTS "Service role can manage role permissions" ON public.role_permissions;

    -- User Policy Assignments policies
    DROP POLICY IF EXISTS "Users can view own policy assignments" ON public.user_policy_assignments;
    DROP POLICY IF EXISTS "Admins can view all policy assignments" ON public.user_policy_assignments;
    DROP POLICY IF EXISTS "Managers can view policy assignments" ON public.user_policy_assignments;
    DROP POLICY IF EXISTS "Admins can manage policy assignments" ON public.user_policy_assignments;
    DROP POLICY IF EXISTS "Service role can manage policy assignments" ON public.user_policy_assignments;

    RAISE NOTICE 'Existing policies dropped successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Recreate all RLS policies with proper structure

-- Resource Permissions: Readable by all authenticated users, manageable by admins
CREATE POLICY "Anyone can view resource permissions" ON public.resource_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage resource permissions" ON public.resource_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Access Policies: Readable by all, manageable by admins
CREATE POLICY "Anyone can view access policies" ON public.access_policies
  FOR SELECT USING (enabled = true);

CREATE POLICY "Admins can manage access policies" ON public.access_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Role Permissions: Readable by all, manageable by admins
CREATE POLICY "Anyone can view role permissions" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Policy Assignments: Users can view their own, admins/managers can view all
CREATE POLICY "Users can view own policy assignments" ON public.user_policy_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all policy assignments" ON public.user_policy_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Managers can view policy assignments" ON public.user_policy_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage policy assignments" ON public.user_policy_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass policies
CREATE POLICY "Service role can manage resource permissions" ON public.resource_permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage access policies" ON public.access_policies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage role permissions" ON public.role_permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage policy assignments" ON public.user_policy_assignments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Re-grant permissions to ensure they're properly set
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_policies TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_policy_assignments TO authenticated, service_role;

-- Ensure helper functions have proper permissions
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT, TEXT, UUID) TO authenticated, service_role, anon;

COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Returns all effective permissions for a user from both roles and policies';
COMMENT ON FUNCTION public.user_has_permission IS 'Checks if user has a specific permission on a resource';