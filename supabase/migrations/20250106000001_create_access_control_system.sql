-- Create Access Control System
-- This migration creates a comprehensive access control system that works alongside existing roles
-- Ensures backward compatibility and preserves existing user access

-- 1. RESOURCE PERMISSIONS TABLE
-- Defines all available resources and permissions in the system
CREATE TABLE IF NOT EXISTS public.resource_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name TEXT NOT NULL, -- e.g., 'recordings', 'analytics', 'admin_tools'
  resource_description TEXT,
  permission_type TEXT NOT NULL, -- e.g., 'read', 'write', 'delete', 'export', 'admin'
  permission_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_name, permission_type)
);

-- 2. ACCESS POLICIES TABLE
-- Defines named permission policies that can be assigned to users
CREATE TABLE IF NOT EXISTS public.access_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource_name TEXT NOT NULL REFERENCES public.resource_permissions(resource_name) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}', -- Array of permission types for this resource
  groups TEXT[] DEFAULT '{}', -- Associated user groups (for compatibility with existing UI)
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. ROLE PERMISSIONS TABLE
-- Maps existing roles (admin, manager, user) to resource permissions
-- This ensures backward compatibility with current role system
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  resource_name TEXT NOT NULL REFERENCES public.resource_permissions(resource_name) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, resource_name)
);

-- 4. USER POLICY ASSIGNMENTS TABLE
-- Direct assignment of policies to specific users
CREATE TABLE IF NOT EXISTS public.user_policy_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.access_policies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, policy_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON public.resource_permissions(resource_name);
CREATE INDEX IF NOT EXISTS idx_access_policies_resource ON public.access_policies(resource_name);
CREATE INDEX IF NOT EXISTS idx_access_policies_enabled ON public.access_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_policy_assignments_user ON public.user_policy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_policy_assignments_policy ON public.user_policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_user_policy_assignments_active ON public.user_policy_assignments(is_active);

-- Enable RLS on all tables
ALTER TABLE public.resource_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_policy_assignments ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_policies TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_policy_assignments TO authenticated, service_role;

-- Create trigger for updating updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_resource_permissions_updated_at ON public.resource_permissions;
CREATE TRIGGER update_resource_permissions_updated_at
  BEFORE UPDATE ON public.resource_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_access_policies_updated_at ON public.access_policies;
CREATE TRIGGER update_access_policies_updated_at
  BEFORE UPDATE ON public.access_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- HELPER FUNCTIONS

-- Function to get effective permissions for a user (combines roles and policies)
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  resource_name TEXT,
  permissions TEXT[],
  source TEXT -- 'role' or 'policy' or 'both'
) AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT
      rp.resource_name,
      rp.permissions,
      'role'::TEXT as source
    FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = p_user_id
  ),
  policy_perms AS (
    SELECT
      ap.resource_name,
      ap.permissions,
      'policy'::TEXT as source
    FROM public.access_policies ap
    JOIN public.user_policy_assignments upa ON upa.policy_id = ap.id
    WHERE upa.user_id = p_user_id
      AND upa.is_active = true
      AND ap.enabled = true
      AND (upa.expires_at IS NULL OR upa.expires_at > NOW())
  ),
  combined AS (
    SELECT * FROM role_perms
    UNION ALL
    SELECT * FROM policy_perms
  )
  SELECT
    c.resource_name,
    array_agg(DISTINCT unnest_perms ORDER BY unnest_perms) as permissions,
    CASE
      WHEN COUNT(DISTINCT c.source) > 1 THEN 'both'
      ELSE MAX(c.source)
    END as source
  FROM combined c
  CROSS JOIN LATERAL unnest(c.permissions) AS unnest_perms
  GROUP BY c.resource_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_resource_name TEXT,
  p_permission TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.get_user_effective_permissions(p_user_id)
    WHERE resource_name = p_resource_name
      AND p_permission = ANY(permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT, TEXT, UUID) TO authenticated, service_role, anon;

-- Add helpful comments
COMMENT ON TABLE public.resource_permissions IS 'Defines all available resources and permissions in the system';
COMMENT ON TABLE public.access_policies IS 'Named permission policies that can be assigned to users';
COMMENT ON TABLE public.role_permissions IS 'Maps existing roles to resource permissions for backward compatibility';
COMMENT ON TABLE public.user_policy_assignments IS 'Direct assignment of policies to specific users';
COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Returns all effective permissions for a user from both roles and policies';
COMMENT ON FUNCTION public.user_has_permission IS 'Checks if user has a specific permission on a resource';