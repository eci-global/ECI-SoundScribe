-- Fix infinite recursion in RLS policies
-- The issue is that admin policies are checking user_roles table which creates circular dependency

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Admins can view all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can insert any recording" ON public.recordings;
DROP POLICY IF EXISTS "Admins can update all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can delete all recordings" ON public.recordings;

-- Step 2: Create a security definer function to check admin status (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- This function runs with elevated privileges, bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all recordings" ON public.recordings
    FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can insert any recording" ON public.recordings
    FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update all recordings" ON public.recordings
    FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete all recordings" ON public.recordings
    FOR DELETE USING (public.is_admin_user());

-- Step 4: Also fix any user_roles policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Simple policies for user_roles (no recursion)
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- For admin management of roles, use the security definer function
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
    FOR ALL USING (public.is_admin_user());

-- Step 5: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated, anon;

SELECT 'Infinite recursion fix completed successfully' as status; 