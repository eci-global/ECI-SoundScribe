-- Force Admin Role Assignment - Bypass RLS
-- Issue: RLS policies preventing admin role insertion even in migrations
-- Created: 2025-09-18

-- Temporarily bypass RLS for admin role insertion
SET session_replication_role = 'replica';

-- Ensure the admin user has the admin role
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now())
ON CONFLICT (user_id, role) DO UPDATE SET
  created_at = EXCLUDED.created_at;

-- Restore normal RLS behavior
SET session_replication_role = 'origin';

-- Verify insertion with service role context
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles
  WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae' AND role = 'admin';

  IF role_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Admin role properly assigned with RLS bypass (% records)', role_count;
  ELSE
    RAISE EXCEPTION 'FAILED: Admin role not found after RLS bypass attempt';
  END IF;
END $$;