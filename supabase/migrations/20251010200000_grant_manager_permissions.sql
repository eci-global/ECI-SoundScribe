-- Grant Manager Role Permissions for All Recordings and BDR Training
-- Migration: 20251010200000_grant_manager_permissions.sql
--
-- This migration grants managers access to:
-- 1. /admin/all-recordings page (view team recordings)
-- 2. /admin/bdr-training pages (BDR training settings, upload history, feedback analytics)

-- First, ensure the admin_pages resources exist in resource_permissions table
INSERT INTO public.resource_permissions (resource_name, permission_type, resource_description, permission_description)
VALUES
  ('admin_pages', 'admin.library.view', 'Admin dashboard pages', 'View library and recordings pages'),
  ('admin_pages', 'admin.bdr.manage', 'Admin dashboard pages', 'Manage BDR training and feedback')
ON CONFLICT (resource_name, permission_type) DO NOTHING;

-- Grant admin.library.view permission to managers (for /admin/all-recordings)
INSERT INTO public.role_permissions (role, resource_name, permissions)
VALUES ('manager', 'admin_pages', ARRAY['admin.library.view'])
ON CONFLICT (role, resource_name)
DO UPDATE SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      public.role_permissions.permissions || EXCLUDED.permissions
    )
  )
);

-- Grant admin.bdr.manage permission to managers (for BDR training pages)
UPDATE public.role_permissions
SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      permissions || ARRAY['admin.bdr.manage']
    )
  )
)
WHERE role = 'manager' AND resource_name = 'admin_pages';

-- If the row doesn't exist, insert it
INSERT INTO public.role_permissions (role, resource_name, permissions)
SELECT 'manager', 'admin_pages', ARRAY['admin.bdr.manage']
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions
  WHERE role = 'manager' AND resource_name = 'admin_pages'
);

-- Add comment for documentation
COMMENT ON TABLE public.role_permissions IS 'Role-based permissions mapping. Managers have been granted admin.library.view and admin.bdr.manage permissions.';
