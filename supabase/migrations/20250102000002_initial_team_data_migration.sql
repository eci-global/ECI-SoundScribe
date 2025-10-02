-- Initial Team Setup and Data Migration
-- Populates teams, migrates existing recording data, and sets up initial team assignments

-- =============================================================================
-- TEAM SETUP
-- =============================================================================

-- Insert default teams if they don't exist
DO $$
BEGIN
  -- Insert Sales Team if not exists
  IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Sales Team') THEN
    INSERT INTO teams (name, department, description, is_active)
    VALUES ('Sales Team', 'sales', 'Sales department for sales call recordings and BDR coaching', true);
  END IF;

  -- Insert Support Team if not exists
  IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Support Team') THEN
    INSERT INTO teams (name, department, description, is_active)
    VALUES ('Support Team', 'support', 'Customer support team for support call recordings', true);
  END IF;
END $$;

-- =============================================================================
-- MIGRATE EXISTING RECORDINGS DATA
-- =============================================================================

-- Update employee_name from user profiles for existing recordings
UPDATE recordings
SET employee_name = COALESCE(
  au.raw_user_meta_data->>'full_name',
  SPLIT_PART(au.email, '@', 1),
  'Unknown Employee'
)
FROM auth.users au
WHERE recordings.user_id = au.id
AND recordings.employee_name IS NULL;

-- Auto-assign team_id based on content_type patterns
DO $$
DECLARE
  sales_team_id UUID;
  support_team_id UUID;
BEGIN
  -- Get team IDs
  SELECT id INTO sales_team_id FROM teams WHERE department = 'sales' LIMIT 1;
  SELECT id INTO support_team_id FROM teams WHERE department = 'support' LIMIT 1;

  -- Update recordings with team assignments based on content type
  UPDATE recordings
  SET team_id = sales_team_id
  WHERE content_type = 'sales_call' AND team_id IS NULL;

  UPDATE recordings
  SET team_id = support_team_id
  WHERE content_type = 'customer_support' AND team_id IS NULL;

  -- For team meetings, assign to sales team by default (can be changed later)
  UPDATE recordings
  SET team_id = sales_team_id
  WHERE content_type = 'team_meeting' AND team_id IS NULL;
END $$;

-- =============================================================================
-- AUTO-ASSIGN USERS TO TEAMS BASED ON RECORDING PATTERNS
-- =============================================================================

-- Function to analyze user recording patterns and suggest team assignment
CREATE OR REPLACE FUNCTION analyze_user_recording_patterns()
RETURNS TABLE (
  user_id UUID,
  suggested_team_id UUID,
  suggested_team_name TEXT,
  total_recordings BIGINT,
  sales_recordings BIGINT,
  support_recordings BIGINT,
  confidence_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_patterns AS (
    SELECT
      r.user_id,
      COUNT(*) as total_recordings,
      COUNT(*) FILTER (WHERE r.content_type = 'sales_call') as sales_recordings,
      COUNT(*) FILTER (WHERE r.content_type = 'customer_support') as support_recordings
    FROM recordings r
    WHERE r.user_id IS NOT NULL
    GROUP BY r.user_id
    HAVING COUNT(*) >= 2 -- Only consider users with at least 2 recordings
  ),
  team_suggestions AS (
    SELECT
      up.*,
      CASE
        WHEN up.sales_recordings > up.support_recordings THEN
          (SELECT id FROM teams WHERE department = 'sales' LIMIT 1)
        WHEN up.support_recordings > up.sales_recordings THEN
          (SELECT id FROM teams WHERE department = 'support' LIMIT 1)
        ELSE
          (SELECT id FROM teams WHERE department = 'sales' LIMIT 1) -- Default to sales
      END as suggested_team_id,
      CASE
        WHEN up.sales_recordings > up.support_recordings THEN 'Sales Team'
        WHEN up.support_recordings > up.sales_recordings THEN 'Support Team'
        ELSE 'Sales Team'
      END as suggested_team_name,
      CASE
        WHEN up.sales_recordings > up.support_recordings THEN
          ROUND((up.sales_recordings::NUMERIC / up.total_recordings) * 100, 2)
        WHEN up.support_recordings > up.sales_recordings THEN
          ROUND((up.support_recordings::NUMERIC / up.total_recordings) * 100, 2)
        ELSE 50.00
      END as confidence_score
    FROM user_patterns up
  )
  SELECT
    ts.user_id,
    ts.suggested_team_id,
    ts.suggested_team_name,
    ts.total_recordings,
    ts.sales_recordings,
    ts.support_recordings,
    ts.confidence_score
  FROM team_suggestions ts
  ORDER BY ts.confidence_score DESC, ts.total_recordings DESC;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign users to teams based on their recording patterns
-- Only assign if they don't already have a team assignment
INSERT INTO team_members (user_id, team_id, employee_name, role, email)
SELECT DISTINCT
  patterns.user_id,
  patterns.suggested_team_id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'Unknown Employee'
  ) as employee_name,
  'member' as role,
  au.email
FROM analyze_user_recording_patterns() patterns
JOIN auth.users au ON au.id = patterns.user_id
LEFT JOIN team_members tm_existing ON tm_existing.user_id = patterns.user_id
WHERE tm_existing.user_id IS NULL  -- Only assign if not already in a team
AND patterns.confidence_score >= 60  -- Only assign if confidence is high
AND patterns.total_recordings >= 3;  -- Only assign users with significant activity

-- =============================================================================
-- SAMPLE DATA FOR TESTING (if no existing users found)
-- =============================================================================

-- Create sample team members for testing if no real users exist
DO $$
DECLARE
  team_member_count INT;
  sales_team_id UUID;
  support_team_id UUID;
BEGIN
  SELECT COUNT(*) INTO team_member_count FROM team_members;

  -- If no team members exist, create some sample data
  IF team_member_count = 0 THEN
    SELECT id INTO sales_team_id FROM teams WHERE department = 'sales' LIMIT 1;
    SELECT id INTO support_team_id FROM teams WHERE department = 'support' LIMIT 1;

    -- Insert sample team members (these will be overwritten by real data)
    INSERT INTO team_members (team_id, user_id, employee_name, role, email)
    SELECT * FROM (VALUES
      (sales_team_id, gen_random_uuid(), 'John Sales Manager', 'manager', 'john.manager@company.com'),
      (sales_team_id, gen_random_uuid(), 'Sarah Sales Rep', 'member', 'sarah.rep@company.com'),
      (sales_team_id, gen_random_uuid(), 'Mike BDR', 'member', 'mike.bdr@company.com'),
      (support_team_id, gen_random_uuid(), 'Lisa Support Manager', 'manager', 'lisa.support@company.com'),
      (support_team_id, gen_random_uuid(), 'David Support Agent', 'member', 'david.agent@company.com'),
      (support_team_id, gen_random_uuid(), 'Emma Customer Success', 'member', 'emma.cs@company.com')
    ) AS sample_data(team_id, user_id, employee_name, role, email);

    -- Update teams to have managers
    UPDATE teams SET manager_user_id = (
      SELECT user_id FROM team_members
      WHERE team_id = teams.id AND role = 'manager'
      LIMIT 1
    );
  END IF;
END $$;

-- =============================================================================
-- POPULATE CUSTOMER NAMES FROM EXISTING DATA
-- =============================================================================

-- Extract potential customer names from titles and transcripts
UPDATE recordings
SET customer_name =
  CASE
    -- Try to extract from title patterns like "Call with Company ABC"
    WHEN title ~* 'call with (.+)' THEN
      TRIM(substring(title from 'call with (.+)'))
    -- Try to extract from title patterns like "Company ABC - Discovery Call"
    WHEN title ~* '^([^-]+) - ' THEN
      TRIM(substring(title from '^([^-]+) - '))
    -- Try to extract company names from transcript (first occurrence)
    WHEN transcript ~* '\b([A-Z][a-zA-Z\s&]{2,30})\b' THEN
      substring(transcript from '\b([A-Z][a-zA-Z\s&]{2,30})\b')
    -- Default fallback
    ELSE NULL
  END
WHERE customer_name IS NULL
AND (title IS NOT NULL OR transcript IS NOT NULL);

-- Clean up customer names (remove common false positives)
UPDATE recordings
SET customer_name = NULL
WHERE customer_name IN (
  'Sales Call', 'Support Call', 'Team Meeting', 'Discovery Call', 'Follow Up',
  'Demo Call', 'Check In', 'Outreach', 'Prospecting', 'Cold Call',
  'The', 'And', 'Call', 'Meeting', 'Demo', 'Sales', 'Support'
)
OR LENGTH(customer_name) < 3
OR LENGTH(customer_name) > 50;

-- =============================================================================
-- CREATE ANALYTICS VIEWS FOR TEAM MANAGEMENT
-- =============================================================================

-- View for team performance analytics
CREATE OR REPLACE VIEW team_performance_analytics AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.department,
  COUNT(DISTINCT tm.user_id) as team_size,
  COUNT(DISTINCT CASE WHEN tm.role = 'manager' THEN tm.user_id END) as manager_count,
  COUNT(r.id) as total_recordings,
  COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_recordings,
  COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') as recent_recordings,
  AVG(bse.overall_score) FILTER (WHERE bse.overall_score IS NOT NULL) as avg_bdr_score,
  AVG(r.duration) FILTER (WHERE r.duration IS NOT NULL) as avg_call_duration
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = true
LEFT JOIN recordings r ON r.team_id = t.id
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = r.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.department
ORDER BY t.name;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  tm.user_id,
  tm.employee_name,
  tm.email,
  t.name as team_name,
  t.department,
  tm.role as team_role,
  COUNT(r.id) as total_recordings,
  COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_recordings,
  COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days') as weekly_recordings,
  COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') as monthly_recordings,
  AVG(bse.overall_score) FILTER (WHERE bse.overall_score IS NOT NULL) as avg_bdr_score,
  MAX(r.created_at) as last_recording_date
FROM team_members tm
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN recordings r ON r.user_id = tm.user_id
LEFT JOIN bdr_scorecard_evaluations bse ON bse.recording_id = r.id
WHERE tm.is_active = true
GROUP BY tm.user_id, tm.employee_name, tm.email, t.name, t.department, tm.role
ORDER BY total_recordings DESC;

-- =============================================================================
-- GRANT PERMISSIONS AND CLEANUP
-- =============================================================================

-- Grant access to new views
GRANT SELECT ON team_performance_analytics TO authenticated, service_role;
GRANT SELECT ON user_activity_summary TO authenticated, service_role;

-- Grant execute permission on analysis function
GRANT EXECUTE ON FUNCTION analyze_user_recording_patterns() TO authenticated, service_role;

-- Create indexes for the new analytics views
CREATE INDEX IF NOT EXISTS idx_recordings_team_date_status
  ON recordings(team_id, created_at, status)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_active
  ON team_members(team_id, is_active, role)
  WHERE is_active = true;

-- =============================================================================
-- SUMMARY AND DOCUMENTATION
-- =============================================================================

-- Log migration completion
DO $$
DECLARE
  teams_count INT;
  members_count INT;
  recordings_with_teams INT;
  recordings_with_employee_names INT;
BEGIN
  SELECT COUNT(*) INTO teams_count FROM teams WHERE is_active = true;
  SELECT COUNT(*) INTO members_count FROM team_members WHERE is_active = true;
  SELECT COUNT(*) INTO recordings_with_teams FROM recordings WHERE team_id IS NOT NULL;
  SELECT COUNT(*) INTO recordings_with_employee_names FROM recordings WHERE employee_name IS NOT NULL;

  RAISE NOTICE 'Team Migration Summary:';
  RAISE NOTICE '- Active teams created: %', teams_count;
  RAISE NOTICE '- Team members assigned: %', members_count;
  RAISE NOTICE '- Recordings assigned to teams: %', recordings_with_teams;
  RAISE NOTICE '- Recordings with employee names: %', recordings_with_employee_names;
END $$;

COMMENT ON FUNCTION analyze_user_recording_patterns IS 'Analyzes user recording patterns to suggest optimal team assignments based on content types';
COMMENT ON VIEW team_performance_analytics IS 'Provides team-level performance metrics for management dashboards';
COMMENT ON VIEW user_activity_summary IS 'Provides user-level activity summary for team management and performance tracking';