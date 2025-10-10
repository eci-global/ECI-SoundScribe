-- Migration: Auto-assign default 'user' role and create profile for new signups
-- Handles both SSO and email/password authentication
-- Safe to run multiple times (idempotent)

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Extract user info from auth.users
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName',
    SPLIT_PART(user_email, '@', 1) -- fallback to email username
  );

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  -- Assign default 'user' role if user doesn't have any role yet
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, 'user', NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Log the action for debugging
  RAISE NOTICE 'Auto-assigned default role to user: % (email: %)', NEW.id, user_email;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and assigns default user role for new signups (SSO and email/password)';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Triggers profile and role creation when a new user signs up via any auth method';
