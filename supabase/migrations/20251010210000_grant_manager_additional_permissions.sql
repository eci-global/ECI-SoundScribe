-- Grant Manager Additional Permissions
-- Migration: 20251010210000_grant_manager_additional_permissions.sql
--
-- This migration grants managers access to:
-- 1. /admin/support-settings (admin.support.manage)
-- 2. /employees (admin.employees.view)
--
-- These permissions are added to the existing manager permissions:
-- - admin.library.view (already granted)
-- - admin.bdr.manage (already granted)

-- First, ensure the permissions exist in resource_permissions table
INSERT INTO public.resource_permissions (resource_name, permission_type, resource_description, permission_description)
VALUES
  ('admin_pages', 'admin.support.manage', 'Admin dashboard pages', 'Manage support settings and configuration'),
  ('admin_pages', 'admin.employees.view', 'Admin dashboard pages', 'View and manage employee information')
ON CONFLICT (resource_name, permission_type) DO NOTHING;

-- Grant admin.support.manage to managers (for /admin/support-settings)
-- This uses an upsert pattern to add the permission to the existing permissions array
INSERT INTO public.role_permissions (role, resource_name, permissions)
VALUES ('manager', 'admin_pages', ARRAY['admin.support.manage'])
ON CONFLICT (role, resource_name)
DO UPDATE SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      public.role_permissions.permissions || EXCLUDED.permissions
    )
  )
);

-- Grant admin.employees.view to managers (for /employees)
-- This adds another permission to the manager's permissions array
UPDATE public.role_permissions
SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      permissions || ARRAY['admin.employees.view']
    )
  )
)
WHERE role = 'manager' AND resource_name = 'admin_pages';

-- Verify the manager now has all 4 required permissions
-- Expected result: {admin.library.view, admin.bdr.manage, admin.support.manage, admin.employees.view}

-- Add comment for documentation
COMMENT ON TABLE public.role_permissions IS 'Role-based permissions mapping. Managers have been granted: admin.library.view, admin.bdr.manage, admin.support.manage, and admin.employees.view permissions.';
