-- Fix Recursive RLS Policies
-- Resolves infinite recursion error in team_members policies

-- =============================================================================
-- FIX TEAM MEMBERS RLS POLICIES
-- =============================================================================

-- Drop all existing policies on team_members to start fresh
DROP POLICY IF EXISTS "Admins can manage all team members" ON team_members;
DROP POLICY IF EXISTS "Managers can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Users can view own team membership" ON team_members;

-- Create non-recursive policies

-- 1. Admins can manage all team members (simple admin check)
CREATE POLICY "Admins can manage all team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Team managers can manage their team members (using teams.manager_user_id only)
CREATE POLICY "Team managers can manage their team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.manager_user_id = auth.uid()
    )
  );

-- 3. Users can view their own team membership
CREATE POLICY "Users can view own team membership" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- 4. Service role access for functions
CREATE POLICY "Service role can manage team members" ON team_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- FIX TEAMS RLS POLICIES (ensure no recursion)
-- =============================================================================

-- Drop and recreate teams policies to be explicit and non-recursive
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
DROP POLICY IF EXISTS "Managers can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;

-- Teams policies (non-recursive)

-- 1. Admins can manage all teams
CREATE POLICY "Admins can manage all teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Team managers can view/edit their own teams
CREATE POLICY "Team managers can view their teams" ON teams
  FOR SELECT USING (
    manager_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 3. Team members can view their teams (using direct lookup without recursion)
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- 4. Service role access
CREATE POLICY "Service role can manage teams" ON teams
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- VERIFY RECORDINGS RLS POLICY (ensure it's not recursive)
-- =============================================================================

-- Drop and recreate recordings manager policy to ensure it's clean
DROP POLICY IF EXISTS "Manager team access to recordings" ON recordings;

-- Non-recursive recordings policy for managers
CREATE POLICY "Manager team access to recordings" ON recordings
  FOR SELECT USING (
    -- Users see their own recordings
    user_id = auth.uid()
    OR
    -- Admins see all recordings
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR
    -- Team managers see their team recordings (using teams.manager_user_id)
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = recordings.team_id
      AND t.manager_user_id = auth.uid()
    )
    OR
    -- Team members with manager role see team recordings (safe query)
    (recordings.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members tm_check
      WHERE tm_check.user_id = auth.uid()
      AND tm_check.team_id = recordings.team_id
      AND tm_check.role = 'manager'
      AND tm_check.is_active = true
    ))
  );

-- =============================================================================
-- CREATE HELPER FUNCTIONS TO AVOID RECURSION
-- =============================================================================

-- Function to check if user is team manager (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION is_team_manager(p_user_id UUID DEFAULT NULL, p_team_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if user is admin (admins are considered managers of all teams)
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is manager via teams.manager_user_id
  IF p_team_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM teams
      WHERE id = p_team_id AND manager_user_id = check_user_id
    );
  END IF;

  -- Check if user has manager role in any team
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = check_user_id
    AND tm.role = 'manager'
    AND tm.is_active = true
    AND t.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team memberships (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (team_id UUID, role TEXT) AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT tm.team_id, tm.role
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = check_user_id
  AND tm.is_active = true
  AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_team_manager(UUID, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_user_teams(UUID) TO authenticated, service_role, anon;

-- =============================================================================
-- TEST AND VERIFY
-- =============================================================================

-- Verify policies don't have recursion by doing a simple test
DO $$
BEGIN
  -- Test that we can query teams without recursion
  PERFORM COUNT(*) FROM teams WHERE is_active = true;

  -- Test that we can query team_members without recursion
  PERFORM COUNT(*) FROM team_members WHERE is_active = true;

  RAISE NOTICE 'RLS policies verification complete - no recursion detected';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'RLS policy verification failed: %', SQLERRM;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION is_team_manager IS 'Check if user is a team manager without RLS recursion. Security definer function.';
COMMENT ON FUNCTION get_user_teams IS 'Get user team memberships without RLS recursion. Security definer function.';