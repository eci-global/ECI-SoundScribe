-- Comprehensive Manager Recording Monitoring System
-- Phase 1: Database Foundation - Teams, Enhanced Recordings, and Manager Access

-- =============================================================================
-- TEAMS AND TEAM MEMBERS STRUCTURE
-- =============================================================================

-- Create teams table for Sales and Support departments
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('sales', 'support')),
  description TEXT,
  manager_user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team_members table for manager-employee relationships
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One team per employee
);

-- =============================================================================
-- EXTEND RECORDINGS TABLE
-- =============================================================================

-- Add new columns to recordings table for enhanced functionality
DO $$ BEGIN
  -- Add employee_name column (call participant, not necessarily uploader)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'employee_name'
  ) THEN
    ALTER TABLE recordings ADD COLUMN employee_name TEXT;
  END IF;

  -- Add customer_name column for search functionality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE recordings ADD COLUMN customer_name TEXT;
  END IF;

  -- Add team_id column to link recordings to teams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE recordings ADD COLUMN team_id UUID REFERENCES teams(id);
  END IF;

  -- Add call_notes column for additional context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'call_notes'
  ) THEN
    ALTER TABLE recordings ADD COLUMN call_notes TEXT;
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Team-based access indexes
CREATE INDEX IF NOT EXISTS idx_recordings_team_employee
  ON recordings(team_id, employee_name) WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_content_type_team
  ON recordings(content_type, team_id) WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_team_date
  ON recordings(team_id, created_at DESC) WHERE team_id IS NOT NULL;

-- Search functionality indexes
CREATE INDEX IF NOT EXISTS idx_recordings_customer_search
  ON recordings USING gin(to_tsvector('english', COALESCE(customer_name, '')))
  WHERE customer_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_transcript_search
  ON recordings USING gin(to_tsvector('english', COALESCE(transcript, '')))
  WHERE transcript IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_employee_search
  ON recordings USING gin(to_tsvector('english', COALESCE(employee_name, '')))
  WHERE employee_name IS NOT NULL;

-- BDR score filtering index
CREATE INDEX IF NOT EXISTS idx_bdr_evaluations_score_range
  ON bdr_scorecard_evaluations(overall_score, recording_id)
  WHERE overall_score IS NOT NULL;

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_recordings_team_content_date
  ON recordings(team_id, content_type, created_at DESC)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_status_team
  ON recordings(status, team_id, created_at DESC)
  WHERE team_id IS NOT NULL;

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_teams_department_active ON teams(department, is_active);

-- =============================================================================
-- MANAGER ACCESSIBLE RECORDINGS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW manager_accessible_recordings AS
SELECT
  r.id,
  r.title,
  r.user_id,
  r.employee_name,
  r.customer_name,
  r.content_type,
  r.status,
  r.duration,
  r.file_size,
  r.transcript,
  r.ai_summary,
  r.created_at,
  r.updated_at,
  r.team_id,
  r.call_notes,
  -- Team information
  t.name as team_name,
  t.department as team_department,
  -- BDR evaluation data
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
  -- Employee information
  tm_employee.employee_name as employee_display_name,
  tm_employee.email as employee_email,
  tm_employee.role as employee_role,
  -- Uploader information
  au.email as uploader_email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as uploader_name
FROM recordings r
LEFT JOIN teams t ON t.id = r.team_id
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = r.id
LEFT JOIN team_members tm_employee ON tm_employee.user_id = r.user_id
LEFT JOIN auth.users au ON au.id = r.user_id
WHERE
  -- Admins see everything
  (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ))
  OR
  -- Managers see their team recordings
  (EXISTS (
    SELECT 1 FROM team_members tm_manager
    WHERE tm_manager.user_id = auth.uid()
    AND tm_manager.role = 'manager'
    AND tm_manager.team_id = r.team_id
    AND tm_manager.is_active = true
  ))
  OR
  -- Users see their own recordings
  (r.user_id = auth.uid());

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams RLS Policies
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
CREATE POLICY "Admins can manage all teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view their teams" ON teams;
CREATE POLICY "Managers can view their teams" ON teams
  FOR SELECT USING (
    manager_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
CREATE POLICY "Users can view teams they belong to" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

-- Team Members RLS Policies
DROP POLICY IF EXISTS "Admins can manage all team members" ON team_members;
CREATE POLICY "Admins can manage all team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can manage their team members" ON team_members;
CREATE POLICY "Managers can manage their team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'manager'
    )
  );

DROP POLICY IF EXISTS "Users can view own team membership" ON team_members;
CREATE POLICY "Users can view own team membership" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- Enhanced Recordings RLS Policy for Manager Team Access
DROP POLICY IF EXISTS "Manager team access to recordings" ON recordings;
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
    -- Managers see their team recordings
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'manager'
      AND tm.team_id = recordings.team_id
      AND tm.is_active = true
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's team information
CREATE OR REPLACE FUNCTION get_user_team_info(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  department TEXT,
  role TEXT,
  is_manager BOOLEAN
) AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    tm.team_id,
    t.name as team_name,
    t.department,
    tm.role,
    (tm.role = 'manager') as is_manager
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = check_user_id
  AND tm.is_active = true
  AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign user to team
CREATE OR REPLACE FUNCTION assign_user_to_team(
  p_user_id UUID,
  p_team_id UUID,
  p_employee_name TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin or manager of the target team
  SELECT role INTO current_user_role
  FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  LIMIT 1;

  IF current_user_role IS NULL THEN
    -- Check if current user is manager of the specific team
    IF NOT EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'manager'
      AND (tm.team_id = p_team_id OR t.manager_user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Only admins or team managers can assign users to teams';
    END IF;
  END IF;

  -- Get user email for reference
  INSERT INTO team_members (user_id, team_id, employee_name, role, email)
  SELECT
    p_user_id,
    p_team_id,
    p_employee_name,
    p_role,
    au.email
  FROM auth.users au
  WHERE au.id = p_user_id
  ON CONFLICT (user_id)
  DO UPDATE SET
    team_id = p_team_id,
    employee_name = p_employee_name,
    role = p_role,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recordings accessible by current user (with filters)
CREATE OR REPLACE FUNCTION get_accessible_recordings(
  p_team_id UUID DEFAULT NULL,
  p_content_type TEXT DEFAULT NULL,
  p_employee_name TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  employee_name TEXT,
  customer_name TEXT,
  content_type TEXT,
  status TEXT,
  duration INTEGER,
  bdr_overall_score NUMERIC,
  team_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mar.id,
    mar.title,
    mar.employee_name,
    mar.customer_name,
    mar.content_type,
    mar.status,
    mar.duration,
    mar.bdr_overall_score,
    mar.team_name,
    mar.created_at
  FROM manager_accessible_recordings mar
  WHERE
    (p_team_id IS NULL OR mar.team_id = p_team_id)
    AND (p_content_type IS NULL OR mar.content_type = p_content_type)
    AND (p_employee_name IS NULL OR mar.employee_name ILIKE '%' || p_employee_name || '%')
  ORDER BY mar.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_team_info(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION assign_user_to_team(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_accessible_recordings(UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;

-- Grant access to view
GRANT SELECT ON manager_accessible_recordings TO authenticated, service_role;

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Create default Sales and Support teams
INSERT INTO teams (name, department, description) VALUES
  ('Sales Team', 'sales', 'Sales department team for sales call recordings and BDR coaching'),
  ('Support Team', 'support', 'Customer support team for support call recordings and coaching')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE teams IS 'Teams structure for Sales and Support departments with manager assignments';
COMMENT ON TABLE team_members IS 'Manager-employee relationships with one team per employee constraint';
COMMENT ON VIEW manager_accessible_recordings IS 'Optimized view for manager access to team recordings with BDR data';
COMMENT ON FUNCTION get_user_team_info IS 'Returns team information for a user including role and manager status';
COMMENT ON FUNCTION assign_user_to_team IS 'Assigns a user to a team with proper permission checks';
COMMENT ON FUNCTION get_accessible_recordings IS 'Returns recordings accessible to current user with filtering support';