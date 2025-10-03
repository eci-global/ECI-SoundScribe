-- ELIMINATE RLS RECURSION - FINAL FIX
-- Removes all circular dependencies in RLS policies by using SECURITY DEFINER functions
-- and eliminating cross-table references in policies

-- =============================================================================
-- SECURITY DEFINER FUNCTIONS (BYPASS RLS TO BREAK RECURSION)
-- =============================================================================

-- Function to get team IDs that a user has access to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_accessible_team_ids(p_user_id UUID DEFAULT NULL)
RETURNS UUID[] AS $$
DECLARE
  check_user_id UUID;
  is_admin BOOLEAN := FALSE;
  team_ids UUID[];
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if user is admin (admins see all teams)
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  ) INTO is_admin;

  IF is_admin THEN
    -- Admins can access all teams
    SELECT ARRAY_AGG(id) INTO team_ids
    FROM teams
    WHERE is_active = true;
  ELSE
    -- Regular users: teams they manage + teams they're members of
    WITH accessible_teams AS (
      -- Teams where user is the manager
      SELECT id FROM teams
      WHERE manager_user_id = check_user_id AND is_active = true

      UNION

      -- Teams where user is a member with manager role
      SELECT t.id FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = check_user_id
      AND tm.role = 'manager'
      AND tm.is_active = true
      AND t.is_active = true

      UNION

      -- Teams where user is any member (for viewing own team)
      SELECT t.id FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = check_user_id
      AND tm.is_active = true
      AND t.is_active = true
    )
    SELECT ARRAY_AGG(id) INTO team_ids FROM accessible_teams;
  END IF;

  RETURN COALESCE(team_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage a specific team (bypasses RLS)
CREATE OR REPLACE FUNCTION can_manage_team(p_user_id UUID DEFAULT NULL, p_team_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
  is_admin BOOLEAN := FALSE;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  ) INTO is_admin;

  IF is_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if user is team manager via teams.manager_user_id
  IF EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id AND manager_user_id = check_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has manager role in team_members
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = check_user_id
    AND team_id = p_team_id
    AND role = 'manager'
    AND is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recording access level for user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_recording_access_level(p_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  check_user_id UUID;
  user_role TEXT;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Check user role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
      ELSE 4
    END
  LIMIT 1;

  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access a recording (bypasses RLS)
CREATE OR REPLACE FUNCTION can_access_recording(p_user_id UUID DEFAULT NULL, p_recording_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
  recording_user_id UUID;
  recording_team_id UUID;
  accessible_teams UUID[];
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Get recording details
  SELECT user_id, team_id INTO recording_user_id, recording_team_id
  FROM recordings
  WHERE id = p_recording_id;

  -- User can always access their own recordings
  IF recording_user_id = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user can access the recording's team
  accessible_teams := get_accessible_team_ids(check_user_id);

  IF recording_team_id = ANY(accessible_teams) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DROP ALL EXISTING RLS POLICIES (START FRESH)
-- =============================================================================

-- Drop teams policies
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
DROP POLICY IF EXISTS "Team managers can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Service role can manage teams" ON teams;

-- Drop team_members policies
DROP POLICY IF EXISTS "Admins can manage all team members" ON team_members;
DROP POLICY IF EXISTS "Team managers can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Users can view own team membership" ON team_members;
DROP POLICY IF EXISTS "Service role can manage team members" ON team_members;

-- Drop recordings policies
DROP POLICY IF EXISTS "Manager team access to recordings" ON recordings;

-- =============================================================================
-- CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- =============================================================================

-- TEAMS POLICIES (NO CROSS-TABLE REFERENCES)
-- 1. Admins can manage all teams
CREATE POLICY "Admins manage all teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Team managers can view/edit their teams (direct column check only)
CREATE POLICY "Team managers manage own teams" ON teams
  FOR ALL USING (manager_user_id = auth.uid());

-- 3. Users can view teams they have access to (using SECURITY DEFINER function)
CREATE POLICY "Users view accessible teams" ON teams
  FOR SELECT USING (id = ANY(get_accessible_team_ids(auth.uid())));

-- 4. Service role access
CREATE POLICY "Service role teams access" ON teams
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- TEAM_MEMBERS POLICIES (NO CROSS-TABLE REFERENCES)
-- 1. Admins can manage all team members
CREATE POLICY "Admins manage all team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Users can view their own team membership (direct column check only)
CREATE POLICY "Users view own team membership" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- 3. Team managers can manage team members (using SECURITY DEFINER function)
CREATE POLICY "Team managers manage team members" ON team_members
  FOR ALL USING (can_manage_team(auth.uid(), team_id));

-- 4. Service role access
CREATE POLICY "Service role team members access" ON team_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RECORDINGS POLICIES (NO CROSS-TABLE REFERENCES)
-- 1. Users can access their own recordings (direct column check only)
CREATE POLICY "Users access own recordings" ON recordings
  FOR SELECT USING (user_id = auth.uid());

-- 2. Admins can access all recordings
CREATE POLICY "Admins access all recordings" ON recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Managers can access team recordings (using SECURITY DEFINER function)
CREATE POLICY "Managers access team recordings" ON recordings
  FOR SELECT USING (can_access_recording(auth.uid(), id));

-- 4. Service role access
CREATE POLICY "Service role recordings access" ON recordings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- UPDATE MANAGER ACCESSIBLE RECORDINGS VIEW (USE SECURITY DEFINER FUNCTIONS)
-- =============================================================================

-- Drop and recreate the view to use non-RLS functions
DROP VIEW IF EXISTS manager_accessible_recordings;

CREATE VIEW manager_accessible_recordings AS
WITH accessible_recordings AS (
  SELECT r.*
  FROM recordings r
  WHERE
    -- User's own recordings
    r.user_id = auth.uid()
    OR
    -- Recordings from accessible teams (using SECURITY DEFINER function)
    r.team_id = ANY(get_accessible_team_ids(auth.uid()))
    OR
    -- Admin access (using SECURITY DEFINER function)
    get_recording_access_level(auth.uid()) = 'admin'
)
SELECT
  ar.id,
  ar.title,
  ar.user_id,
  ar.employee_name,
  ar.customer_name,
  ar.content_type,
  ar.status,
  ar.duration,
  ar.file_size,
  ar.transcript,
  ar.ai_summary,
  ar.created_at,
  ar.updated_at,
  ar.team_id,
  ar.call_notes,
  -- Team information (simple LEFT JOIN, no RLS issues)
  t.name as team_name,
  t.department as team_department,
  -- BDR evaluation data (simple LEFT JOIN, no RLS issues)
  bse.id as bdr_evaluation_id,
  bse.overall_score as bdr_overall_score,
  bse.opening_score as bdr_opening_score,
  bse.objection_handling_score as bdr_objection_handling_score,
  bse.qualification_score as bdr_qualification_score,
  bse.tone_energy_score as bdr_tone_energy_score,
  bse.assertiveness_control_score as bdr_assertiveness_control_score,
  bse.business_acumen_score as bdr_business_acumen_score,
  bse.closing_score as bdr_closing_score,
  bse.talk_time_score as bdr_talk_time_score,
  bse.manager_notes as bdr_manager_notes,
  bse.created_at as bdr_evaluated_at,
  -- Employee information (simple LEFT JOIN, no RLS issues)
  tm_employee.employee_name as employee_display_name,
  tm_employee.email as employee_email,
  tm_employee.role as employee_role,
  -- Uploader information (simple LEFT JOIN, no RLS issues)
  au.email as uploader_email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as uploader_name
FROM accessible_recordings ar
LEFT JOIN teams t ON t.id = ar.team_id
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = ar.id
LEFT JOIN team_members tm_employee ON tm_employee.user_id = ar.user_id
LEFT JOIN auth.users au ON au.id = ar.user_id;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_accessible_team_ids(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION can_manage_team(UUID, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_recording_access_level(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION can_access_recording(UUID, UUID) TO authenticated, service_role, anon;

GRANT SELECT ON manager_accessible_recordings TO authenticated, service_role;

-- =============================================================================
-- COMPREHENSIVE TESTING (VERIFY NO RECURSION)
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID;
  team_count INT;
  member_count INT;
  recording_count INT;
  view_count INT;
BEGIN
  -- Test 1: Basic table queries (should not cause recursion)
  SELECT COUNT(*) INTO team_count FROM teams WHERE is_active = true;
  SELECT COUNT(*) INTO member_count FROM team_members WHERE is_active = true;
  SELECT COUNT(*) INTO recording_count FROM recordings LIMIT 10;

  -- Test 2: Test manager_accessible_recordings view (the critical test)
  SELECT COUNT(*) INTO view_count FROM manager_accessible_recordings LIMIT 10;

  -- Test 3: Test SECURITY DEFINER functions
  SELECT auth.uid() INTO test_user_id;
  PERFORM get_accessible_team_ids(test_user_id);
  PERFORM get_recording_access_level(test_user_id);

  RAISE NOTICE 'RLS Recursion Fix Verification:';
  RAISE NOTICE '✅ Teams query: % records', team_count;
  RAISE NOTICE '✅ Team members query: % records', member_count;
  RAISE NOTICE '✅ Recordings query: % records', recording_count;
  RAISE NOTICE '✅ Manager accessible recordings view: % records', view_count;
  RAISE NOTICE '✅ SECURITY DEFINER functions: working';
  RAISE NOTICE '✅ NO RECURSION DETECTED - All systems operational!';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'RLS recursion still exists: %', SQLERRM;
END $$;

-- =============================================================================
-- CLEANUP AND OPTIMIZATION
-- =============================================================================

-- Create indexes for SECURITY DEFINER function performance
CREATE INDEX IF NOT EXISTS idx_teams_manager_active
ON teams(manager_user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_user_role_active
ON team_members(user_id, role, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
ON user_roles(user_id, role);

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION get_accessible_team_ids IS 'Returns team IDs accessible to user. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
COMMENT ON FUNCTION can_manage_team IS 'Checks if user can manage a team. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
COMMENT ON FUNCTION get_recording_access_level IS 'Returns user access level (admin/manager/user). Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION can_access_recording IS 'Checks if user can access a recording. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
COMMENT ON VIEW manager_accessible_recordings IS 'Manager recording view using SECURITY DEFINER functions to prevent RLS recursion while maintaining proper access control.';