-- Final Admin Role Fix - Direct Insert for AI Control Center Access
-- Issue: Admin role still missing after previous attempts
-- Created: 2025-09-18

-- Use service role context to bypass RLS and ensure admin role exists
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now())
ON CONFLICT (user_id, role) DO UPDATE SET
  created_at = EXCLUDED.created_at;

-- Verify the insertion worked
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles
  WHERE user_id = '1fd13984-3457-40ea-9220-20447a1ff9ae' AND role = 'admin';

  IF role_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Admin role found in user_roles table (% records)', role_count;
  ELSE
    -- If still no admin role, create it directly
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin', now());

    RAISE NOTICE 'FALLBACK: Admin role created via fallback insertion';
  END IF;
END $$;

-- Grant necessary permissions for AI prompt management
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.ai_prompt_templates TO authenticated;

-- Add debugging info
COMMENT ON TABLE public.user_roles IS 'User roles - admin role required for AI Control Center functions';