-- Grant Manager Role Permissions for All Recordings and BDR Training
-- Run this script to give managers access to:
-- 1. /admin/all-recordings page (view team recordings)
-- 2. /admin/bdr-training pages (BDR training settings, upload history, feedback analytics)

-- First, ensure the admin_pages resource exists
INSERT INTO public.resource_permissions (resource_name, resource_type, description)
VALUES ('admin_pages', 'feature', 'Admin dashboard pages and sections')
ON CONFLICT (resource_name) DO NOTHING;

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
INSERT INTO public.role_permissions (role, resource_name, permissions)
VALUES ('manager', 'admin_pages', ARRAY['admin.bdr.manage'])
ON CONFLICT (role, resource_name)
DO UPDATE SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      public.role_permissions.permissions || EXCLUDED.permissions
    )
  )
);

-- Verify the permissions were granted
SELECT role, resource_name, permissions
FROM public.role_permissions
WHERE role = 'manager' AND resource_name = 'admin_pages';

-- Expected result should include:
-- role: 'manager'
-- resource_name: 'admin_pages'
-- permissions: ['admin.library.view', 'admin.bdr.manage']
