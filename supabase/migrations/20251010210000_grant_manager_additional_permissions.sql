-- Grant Manager Additional Permissions
-- Migration: 20251010210000_grant_manager_additional_permissions.sql
--
-- This migration grants managers access to exactly 6 admin pages:
-- 1. /admin/all-recordings (admin.library.view)
-- 2. /admin/bdr-training (admin.bdr.manage)
-- 3. /admin/bdr-scorecard-history (admin.bdr.manage)
-- 4. /admin/feedback-analytics (admin.bdr.manage)
-- 5. /admin/support-settings (admin.support.manage)
-- 6. /employees (admin.employees.view)

-- Step 1: Create the admin_pages resource in resource_permissions
INSERT INTO public.resource_permissions (resource_name, permission_type, resource_description, permission_description)
VALUES ('admin_pages', 'admin', 'Admin dashboard pages', 'Access to admin dashboard pages')
ON CONFLICT (resource_name) DO NOTHING;

-- Step 2: Grant all 4 required permissions to managers
-- This covers access to all 6 pages listed above
INSERT INTO public.role_permissions (role, resource_name, permissions)
VALUES (
  'manager',
  'admin_pages',
  ARRAY[
    'admin.library.view',
    'admin.bdr.manage',
    'admin.support.manage',
    'admin.employees.view'
  ]
)
ON CONFLICT (role, resource_name)
DO UPDATE SET permissions = EXCLUDED.permissions;

-- Add comment for documentation
COMMENT ON TABLE public.role_permissions IS 'Role-based permissions mapping. Managers have been granted: admin.library.view, admin.bdr.manage, admin.support.manage, and admin.employees.view permissions.';
