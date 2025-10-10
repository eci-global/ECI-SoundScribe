-- Migration: Auto-assign default 'user' role and create profile for new signups
-- Uses RPC function approach since we can't create triggers on auth.users directly

-- Create function to initialize new user (called from client after signup)
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  user_name TEXT;
  user_metadata JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user info from auth.users
  SELECT email, raw_user_meta_data
  INTO user_email, user_metadata
  FROM auth.users
  WHERE id = current_user_id;

  -- Extract full name from metadata
  user_name := COALESCE(
    user_metadata->>'full_name',
    user_metadata->>'name',
    user_metadata->>'firstName' || ' ' || user_metadata->>'lastName',
    SPLIT_PART(user_email, '@', 1)
  );

  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    current_user_id,
    user_email,
    user_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  -- Assign default 'user' role if no role exists
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (current_user_id, 'user', NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Initialized user: % (email: %)', current_user_id, user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.initialize_new_user() TO authenticated;

-- Create function to check if user is initialized
CREATE OR REPLACE FUNCTION public.is_user_initialized()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_initialized() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.initialize_new_user() IS
  'Initializes new user by creating profile and assigning default role. Call this after signup.';

COMMENT ON FUNCTION public.is_user_initialized() IS
  'Checks if current user has been initialized with profile and role.';
