-- Seed Default Access Policies and Resource Permissions
-- This migration populates the access control system with default data
-- that matches the current role-based system to ensure backward compatibility

-- 1. POPULATE RESOURCE PERMISSIONS
-- Define all the resources and permissions available in the ECI SoundScribe system
-- Use INSERT ... ON CONFLICT DO NOTHING to handle existing data gracefully
INSERT INTO public.resource_permissions (resource_name, resource_description, permission_type, permission_description) VALUES
-- Core system resources
('*', 'All system resources (admin only)', 'admin', 'Full administrative access to entire system'),
('recordings', 'Audio/video recordings and transcripts', 'read', 'View recordings and transcripts'),
('recordings', 'Audio/video recordings and transcripts', 'write', 'Create and edit recordings'),
('recordings', 'Audio/video recordings and transcripts', 'delete', 'Delete recordings'),
('recordings', 'Audio/video recordings and transcripts', 'export', 'Export recordings and data'),

-- Analytics and reporting
('analytics', 'System analytics and reports', 'read', 'View analytics dashboards'),
('analytics', 'System analytics and reports', 'write', 'Create custom reports'),
('analytics', 'System analytics and reports', 'export', 'Export analytics data'),

-- User management
('users', 'User accounts and profiles', 'read', 'View user information'),
('users', 'User accounts and profiles', 'write', 'Create and edit users'),
('users', 'User accounts and profiles', 'delete', 'Delete user accounts'),

-- BDR training system
('bdr_training', 'BDR training programs and data', 'read', 'View BDR training data'),
('bdr_training', 'BDR training programs and data', 'write', 'Manage BDR training programs'),
('bdr_training', 'BDR training programs and data', 'export', 'Export training data'),

-- AI and coaching
('ai_coaching', 'AI-generated coaching and insights', 'read', 'View AI coaching results'),
('ai_coaching', 'AI-generated coaching and insights', 'write', 'Generate and edit AI coaching'),

-- Integrations
('integrations', 'External integrations (Outreach, etc.)', 'read', 'View integration status'),
('integrations', 'External integrations (Outreach, etc.)', 'write', 'Configure integrations'),

-- Admin tools
('admin_tools', 'Administrative tools and settings', 'read', 'View admin tools'),
('admin_tools', 'Administrative tools and settings', 'write', 'Use admin tools and modify settings'),

-- System activity and auditing
('audit_logs', 'System audit logs and activity', 'read', 'View audit logs'),
('system_activity', 'Real-time system activity', 'read', 'View system activity'),

-- File management
('file_management', 'File storage and management', 'read', 'View files'),
('file_management', 'File storage and management', 'write', 'Upload and manage files'),
('file_management', 'File storage and management', 'delete', 'Delete files'),

-- Organization management
('organization', 'Organization settings and overview', 'read', 'View organization data'),
('organization', 'Organization settings and overview', 'write', 'Manage organization settings')

ON CONFLICT (resource_name, permission_type) DO NOTHING;

-- 2. POPULATE ROLE PERMISSIONS
-- Map existing roles to appropriate resource permissions to maintain current access levels

-- ADMIN ROLE - Full access to everything (matches current admin capabilities)
INSERT INTO public.role_permissions (role, resource_name, permissions) VALUES
('admin', '*', ARRAY['admin']),
('admin', 'recordings', ARRAY['read', 'write', 'delete', 'export']),
('admin', 'analytics', ARRAY['read', 'write', 'export']),
('admin', 'users', ARRAY['read', 'write', 'delete']),
('admin', 'bdr_training', ARRAY['read', 'write', 'export']),
('admin', 'ai_coaching', ARRAY['read', 'write']),
('admin', 'integrations', ARRAY['read', 'write']),
('admin', 'admin_tools', ARRAY['read', 'write']),
('admin', 'audit_logs', ARRAY['read']),
('admin', 'system_activity', ARRAY['read']),
('admin', 'file_management', ARRAY['read', 'write', 'delete']),
('admin', 'organization', ARRAY['read', 'write'])

ON CONFLICT (role, resource_name) DO NOTHING;

-- MANAGER ROLE - Extended access for BDR training and team management
INSERT INTO public.role_permissions (role, resource_name, permissions) VALUES
('manager', 'recordings', ARRAY['read', 'write', 'export']),
('manager', 'analytics', ARRAY['read', 'export']),
('manager', 'users', ARRAY['read']), -- Can view users but not manage them
('manager', 'bdr_training', ARRAY['read', 'write', 'export']), -- Full BDR access
('manager', 'ai_coaching', ARRAY['read', 'write']),
('manager', 'integrations', ARRAY['read']),
('manager', 'file_management', ARRAY['read', 'write']),
('manager', 'organization', ARRAY['read'])

ON CONFLICT (role, resource_name) DO NOTHING;

-- USER ROLE - Standard user access (matches current user capabilities)
INSERT INTO public.role_permissions (role, resource_name, permissions) VALUES
('user', 'recordings', ARRAY['read', 'write']), -- Can view and create own recordings
('user', 'analytics', ARRAY['read']), -- Can view basic analytics
('user', 'bdr_training', ARRAY['read']), -- Can view training programs they're part of
('user', 'ai_coaching', ARRAY['read']), -- Can view AI coaching for their recordings
('user', 'integrations', ARRAY['read']), -- Can view integration status
('user', 'file_management', ARRAY['read', 'write']) -- Can manage their own files

ON CONFLICT (role, resource_name) DO NOTHING;

-- 3. CREATE DEFAULT ACCESS POLICIES
-- These policies mirror the role-based access but can be customized independently

-- Admin Full Access Policy
INSERT INTO public.access_policies (name, description, resource_name, permissions, groups, enabled) VALUES
('Admin Full Access', 'Complete system access for administrators', '*', ARRAY['admin'], ARRAY['Administrators'], true),
('Admin Recordings Management', 'Full recordings access for administrators', 'recordings', ARRAY['read', 'write', 'delete', 'export'], ARRAY['Administrators'], true),
('Admin User Management', 'User management capabilities for administrators', 'users', ARRAY['read', 'write', 'delete'], ARRAY['Administrators'], true),
('Admin Analytics Access', 'Full analytics access for administrators', 'analytics', ARRAY['read', 'write', 'export'], ARRAY['Administrators'], true),
('Admin BDR Training Management', 'BDR training management for administrators', 'bdr_training', ARRAY['read', 'write', 'export'], ARRAY['Administrators'], true)

ON CONFLICT (name) DO NOTHING;

-- Manager BDR Access Policy
INSERT INTO public.access_policies (name, description, resource_name, permissions, groups, enabled) VALUES
('Manager Recordings Access', 'Extended recordings access for managers', 'recordings', ARRAY['read', 'write', 'export'], ARRAY['Managers'], true),
('Manager BDR Training Access', 'Full BDR training access for managers', 'bdr_training', ARRAY['read', 'write', 'export'], ARRAY['Managers'], true),
('Manager Analytics Access', 'Analytics viewing and export for managers', 'analytics', ARRAY['read', 'export'], ARRAY['Managers'], true),
('Manager Team Overview', 'Team and organization overview for managers', 'users', ARRAY['read'], ARRAY['Managers'], true)

ON CONFLICT (name) DO NOTHING;

-- User Standard Access Policy
INSERT INTO public.access_policies (name, description, resource_name, permissions, groups, enabled) VALUES
('User Recordings Access', 'Standard recordings access for users', 'recordings', ARRAY['read', 'write'], ARRAY['Users'], true),
('User Analytics View', 'Basic analytics viewing for users', 'analytics', ARRAY['read'], ARRAY['Users'], true),
('User BDR Training View', 'BDR training program viewing for users', 'bdr_training', ARRAY['read'], ARRAY['Users'], true),
('User AI Coaching Access', 'AI coaching access for users', 'ai_coaching', ARRAY['read'], ARRAY['Users'], true)

ON CONFLICT (name) DO NOTHING;

-- 4. CREATE HELPER FUNCTIONS FOR POLICY MANAGEMENT

-- Function to automatically assign policies based on user roles
CREATE OR REPLACE FUNCTION public.assign_default_policies_for_user(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_role_record RECORD;
  policy_record RECORD;
  assignments_made INTEGER := 0;
BEGIN
  -- Loop through user's roles and assign corresponding default policies
  FOR user_role_record IN
    SELECT DISTINCT role FROM public.user_roles WHERE user_id = p_user_id
  LOOP
    -- Assign policies based on role
    IF user_role_record.role = 'admin' THEN
      -- Assign all admin policies
      FOR policy_record IN
        SELECT id FROM public.access_policies
        WHERE name LIKE 'Admin%' AND enabled = true
      LOOP
        INSERT INTO public.user_policy_assignments (user_id, policy_id, assigned_by, assigned_at)
        VALUES (p_user_id, policy_record.id, p_user_id, NOW())
        ON CONFLICT (user_id, policy_id) DO NOTHING;

        GET DIAGNOSTICS assignments_made = assignments_made + ROW_COUNT;
      END LOOP;

    ELSIF user_role_record.role = 'manager' THEN
      -- Assign all manager policies
      FOR policy_record IN
        SELECT id FROM public.access_policies
        WHERE name LIKE 'Manager%' AND enabled = true
      LOOP
        INSERT INTO public.user_policy_assignments (user_id, policy_id, assigned_by, assigned_at)
        VALUES (p_user_id, policy_record.id, p_user_id, NOW())
        ON CONFLICT (user_id, policy_id) DO NOTHING;

        GET DIAGNOSTICS assignments_made = assignments_made + ROW_COUNT;
      END LOOP;

    ELSIF user_role_record.role = 'user' THEN
      -- Assign all user policies
      FOR policy_record IN
        SELECT id FROM public.access_policies
        WHERE name LIKE 'User%' AND enabled = true
      LOOP
        INSERT INTO public.user_policy_assignments (user_id, policy_id, assigned_by, assigned_at)
        VALUES (p_user_id, policy_record.id, p_user_id, NOW())
        ON CONFLICT (user_id, policy_id) DO NOTHING;

        GET DIAGNOSTICS assignments_made = assignments_made + ROW_COUNT;
      END LOOP;
    END IF;
  END LOOP;

  RETURN assignments_made;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk assign default policies to all existing users
CREATE OR REPLACE FUNCTION public.migrate_all_users_to_policy_system()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  roles TEXT[],
  policies_assigned INTEGER
) AS $$
DECLARE
  user_record RECORD;
  assignments_made INTEGER;
BEGIN
  -- Loop through all users with roles
  FOR user_record IN
    SELECT
      p.id,
      p.email,
      array_agg(DISTINCT ur.role) as user_roles
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    GROUP BY p.id, p.email
  LOOP
    -- Assign default policies for this user
    SELECT public.assign_default_policies_for_user(user_record.id) INTO assignments_made;

    -- Return the results
    user_id := user_record.id;
    email := user_record.email;
    roles := user_record.user_roles;
    policies_assigned := assignments_made;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.assign_default_policies_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.migrate_all_users_to_policy_system() TO authenticated, service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.assign_default_policies_for_user IS 'Automatically assigns default policies to a user based on their current roles';
COMMENT ON FUNCTION public.migrate_all_users_to_policy_system IS 'Bulk migration function to assign default policies to all existing users';

-- Log successful completion
DO $$
BEGIN
  RAISE NOTICE 'Access control system seeded successfully with default policies and permissions';
  RAISE NOTICE 'Run SELECT * FROM public.migrate_all_users_to_policy_system() to migrate existing users';
END $$;