-- Fix Admin Role Assignment for AI Control Center Access
-- Issue: Admin user exists but doesn't have admin role, causing "Admin access required" error
-- Created: 2025-09-18

-- Ensure admin email is properly inserted into user_roles table
-- Using service role context to bypass RLS policies

-- First check if user exists and get their information
DO $$
DECLARE
  admin_user_id UUID := '1fd13984-3457-40ea-9220-20447a1ff9ae';
  admin_email TEXT := 'admin@soundscribe.com';
  user_exists BOOLEAN := FALSE;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE id = admin_user_id
  ) INTO user_exists;

  IF user_exists THEN
    RAISE NOTICE 'Admin user % exists in auth.users', admin_user_id;

    -- Insert admin role with proper conflict handling
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (admin_user_id, 'admin', now())
    ON CONFLICT (user_id, role) DO UPDATE SET
      created_at = EXCLUDED.created_at;

    RAISE NOTICE 'Admin role assigned to user %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user % does not exist in auth.users - skipping role assignment', admin_user_id;
  END IF;
END $$;

-- Verify the role assignment worked
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles
  WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae' AND role = 'admin';

  IF role_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Admin role properly assigned (% records)', role_count;
  ELSE
    RAISE WARNING 'FAILED: Admin role not found after assignment attempt';
  END IF;
END $$;

-- Grant necessary permissions on user_roles table
GRANT SELECT, INSERT, UPDATE ON public.user_roles TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.user_roles IS 'User roles table - admin role required for AI Control Center access';