-- Migration: Automatically initialize SSO users with profile and role
-- This creates a trigger on auth.users to auto-create profiles and assign roles
-- when new users sign up via SSO (Okta, etc.)

-- Step 1: Create trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extract full name from metadata
  -- SSO providers (Okta) map firstName, lastName, and email to raw_user_meta_data
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    (NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName'),
    NEW.raw_user_meta_data->>'firstName',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Create profile entry
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
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
  VALUES (NEW.id, 'user', NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Log the initialization
  RAISE NOTICE 'Auto-initialized user: % (email: %, name: %)', NEW.id, NEW.email, user_name;

  RETURN NEW;
END;
$$;

-- Step 2: Create trigger on auth.users for new inserts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Backfill any existing users that don't have profiles or roles
DO $$
DECLARE
  user_record RECORD;
  user_name TEXT;
  user_metadata JSONB;
BEGIN
  FOR user_record IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- Cast to JSONB
    user_metadata := user_record.raw_user_meta_data::jsonb;

    -- Extract name with explicit text casts
    user_name := COALESCE(
      (user_metadata->>'full_name')::text,
      (user_metadata->>'name')::text,
      (COALESCE(user_metadata->>'firstName', '') || ' ' || COALESCE(user_metadata->>'lastName', ''))::text,
      (user_metadata->>'firstName')::text,
      SPLIT_PART(user_record.email, '@', 1)
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      user_name,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign default role if none exists
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (user_record.id, 'user', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Backfilled user: % (email: %)', user_record.id, user_record.email;
  END LOOP;
END $$;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates profile and assigns default role when new user signs up via SSO or email';
