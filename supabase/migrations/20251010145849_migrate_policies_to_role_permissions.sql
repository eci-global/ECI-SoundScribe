-- Migration: Migrate resource-based role permissions to consolidated admin_portal permission keys
-- Safe to run multiple times (upserts via delete+insert per role/resource_name)

-- Helper: map resource_name + permission_type to registry keys used by the admin portal
CREATE OR REPLACE FUNCTION public._map_admin_permission(resource_name TEXT, perm TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalize
  resource_name := LOWER(COALESCE(resource_name,''));
  perm := LOWER(COALESCE(perm,''));

  -- Organization
  IF resource_name = 'organization' THEN
    IF perm IN ('read') THEN RETURN 'admin.org.view'; END IF;
    IF perm IN ('write','manage','admin') THEN RETURN 'admin.org.manage'; END IF;
  END IF;

  -- Recordings/File management
  IF resource_name IN ('recordings','file_management') THEN
    IF perm IN ('read','export') THEN RETURN 'admin.library.view'; END IF;
  END IF;

  -- Storage analytics / files
  IF resource_name = 'file_management' AND perm IN ('read') THEN RETURN 'admin.files.view'; END IF;

  -- Analytics
  IF resource_name = 'analytics' AND perm IN ('read','export') THEN RETURN 'admin.analytics.view'; END IF;

  -- Admin tools
  IF resource_name = 'admin_tools' AND perm IN ('read','write','admin') THEN RETURN 'admin.tools.view'; END IF;

  -- Integrations / Outreach
  IF resource_name = 'integrations' THEN
    IF perm IN ('read') THEN RETURN 'admin.integrations.view'; END IF;
    IF perm IN ('write','manage','admin') THEN RETURN 'admin.outreach.manage'; END IF;
  END IF;

  -- Audit/activity
  IF resource_name IN ('audit_logs','system_activity') AND perm = 'read' THEN RETURN 'admin.audit.view'; END IF;

  -- BDR training
  IF resource_name = 'bdr_training' THEN
    IF perm IN ('read','write','export') THEN RETURN 'admin.bdr.manage'; END IF;
  END IF;

  -- Fallback: NULL (no mapping)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Build consolidated permissions per role from existing role_permissions rows
WITH mapped AS (
  SELECT
    rp.role,
    public._map_admin_permission(rp.resource_name, p.perm) AS key
  FROM public.role_permissions rp,
  LATERAL UNNEST(rp.permissions) AS p(perm)
), agg AS (
  SELECT role, ARRAY_AGG(DISTINCT key) AS keys
  FROM mapped
  WHERE key IS NOT NULL
  GROUP BY role
)
-- Replace consolidated row for admin_portal
DELETE FROM public.role_permissions WHERE resource_name = 'admin_portal';

INSERT INTO public.role_permissions (role, resource_name, permissions)
SELECT role, 'admin_portal' AS resource_name, keys FROM agg;

-- Note: legacy access_policies/resource_permissions are deprecated for the admin portal.
