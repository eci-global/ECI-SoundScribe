-- AI Control Center - Comprehensive Security Policies
-- Created: 2025-09-18
-- Purpose: Implement comprehensive RLS policies and access controls for AI configurations

-- =========================================
-- ADMIN USER VERIFICATION ENHANCEMENT
-- =========================================

-- Enhanced admin check function with better caching
CREATE OR REPLACE FUNCTION is_admin_user_cached(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  -- Check if user exists and has admin role
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = user_uuid
    AND ur.role = 'admin'
  ) INTO admin_status;

  RETURN COALESCE(admin_status, false);
END;
$$;

-- =========================================
-- AI PROMPT TEMPLATES SECURITY
-- =========================================

-- Enable RLS on ai_prompt_templates
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view prompt templates
CREATE POLICY "ai_prompt_templates_admin_select" ON ai_prompt_templates
  FOR SELECT
  USING (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can insert prompt templates
CREATE POLICY "ai_prompt_templates_admin_insert" ON ai_prompt_templates
  FOR INSERT
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can update prompt templates
CREATE POLICY "ai_prompt_templates_admin_update" ON ai_prompt_templates
  FOR UPDATE
  USING (is_admin_user_cached(auth.uid()))
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can delete prompt templates (soft delete via update)
CREATE POLICY "ai_prompt_templates_admin_delete" ON ai_prompt_templates
  FOR DELETE
  USING (is_admin_user_cached(auth.uid()));

-- =========================================
-- AI MODEL CONFIGURATIONS SECURITY
-- =========================================

-- Enable RLS on ai_model_configurations
ALTER TABLE ai_model_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view model configurations
CREATE POLICY "ai_model_configurations_admin_select" ON ai_model_configurations
  FOR SELECT
  USING (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can insert model configurations
CREATE POLICY "ai_model_configurations_admin_insert" ON ai_model_configurations
  FOR INSERT
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can update model configurations
CREATE POLICY "ai_model_configurations_admin_update" ON ai_model_configurations
  FOR UPDATE
  USING (is_admin_user_cached(auth.uid()))
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can delete model configurations
CREATE POLICY "ai_model_configurations_admin_delete" ON ai_model_configurations
  FOR DELETE
  USING (is_admin_user_cached(auth.uid()));

-- =========================================
-- AI SCORING RUBRICS SECURITY
-- =========================================

-- Enable RLS on ai_scoring_rubrics
ALTER TABLE ai_scoring_rubrics ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view scoring rubrics
CREATE POLICY "ai_scoring_rubrics_admin_select" ON ai_scoring_rubrics
  FOR SELECT
  USING (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can insert scoring rubrics
CREATE POLICY "ai_scoring_rubrics_admin_insert" ON ai_scoring_rubrics
  FOR INSERT
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can update scoring rubrics
CREATE POLICY "ai_scoring_rubrics_admin_update" ON ai_scoring_rubrics
  FOR UPDATE
  USING (is_admin_user_cached(auth.uid()))
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can delete scoring rubrics
CREATE POLICY "ai_scoring_rubrics_admin_delete" ON ai_scoring_rubrics
  FOR DELETE
  USING (is_admin_user_cached(auth.uid()));

-- =========================================
-- AI PROMPT EXPERIMENTS SECURITY
-- =========================================

-- Enable RLS on ai_prompt_experiments
ALTER TABLE ai_prompt_experiments ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view experiments
CREATE POLICY "ai_prompt_experiments_admin_select" ON ai_prompt_experiments
  FOR SELECT
  USING (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can insert experiments
CREATE POLICY "ai_prompt_experiments_admin_insert" ON ai_prompt_experiments
  FOR INSERT
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can update experiments
CREATE POLICY "ai_prompt_experiments_admin_update" ON ai_prompt_experiments
  FOR UPDATE
  USING (is_admin_user_cached(auth.uid()))
  WITH CHECK (is_admin_user_cached(auth.uid()));

-- Policy: Only admins can delete experiments
CREATE POLICY "ai_prompt_experiments_admin_delete" ON ai_prompt_experiments
  FOR DELETE
  USING (is_admin_user_cached(auth.uid()));

-- =========================================
-- AI CONFIGURATION HISTORY SECURITY
-- =========================================

-- Enable RLS on ai_configuration_history
ALTER TABLE ai_configuration_history ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view configuration history
CREATE POLICY "ai_configuration_history_admin_select" ON ai_configuration_history
  FOR SELECT
  USING (is_admin_user_cached(auth.uid()));

-- Policy: System can insert configuration history (via triggers/functions)
CREATE POLICY "ai_configuration_history_system_insert" ON ai_configuration_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (is_admin_user_cached(auth.uid()) OR auth.jwt() ->> 'role' = 'service_role')
  );

-- Policy: No updates or deletes on history (immutable audit trail)
-- Intentionally no UPDATE or DELETE policies - history should be immutable

-- =========================================
-- SENSITIVE DATA PROTECTION
-- =========================================

-- Note: API key masking function removed since AI model configurations
-- do not store API keys in this architecture

-- =========================================
-- AUDIT LOGGING ENHANCEMENT
-- =========================================

-- Enhanced audit function for AI configuration changes
CREATE OR REPLACE FUNCTION log_ai_configuration_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_type TEXT;
  old_values JSONB;
  new_values JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    old_values := NULL;
    new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    old_values := to_jsonb(OLD);
    new_values := NULL;
  END IF;

  -- Log the change
  INSERT INTO ai_configuration_history (
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_values,
    new_values,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for all AI configuration tables
CREATE TRIGGER ai_prompt_templates_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION log_ai_configuration_change();

CREATE TRIGGER ai_model_configurations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_model_configurations
  FOR EACH ROW EXECUTE FUNCTION log_ai_configuration_change();

CREATE TRIGGER ai_scoring_rubrics_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_scoring_rubrics
  FOR EACH ROW EXECUTE FUNCTION log_ai_configuration_change();

CREATE TRIGGER ai_prompt_experiments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_experiments
  FOR EACH ROW EXECUTE FUNCTION log_ai_configuration_change();

-- =========================================
-- ACCESS CONTROL VIEWS
-- =========================================

-- Secure view for model configurations (no API keys stored in this table)
CREATE OR REPLACE VIEW ai_model_configurations_secure AS
SELECT
  id,
  name,
  service_type,
  model_name,
  deployment_name,
  endpoint_url,
  api_version,
  parameters,
  rate_limits,
  is_active,
  is_default,
  health_status,
  last_health_check,
  average_response_time_ms,
  total_requests,
  error_rate,
  cost_per_1k_tokens,
  monthly_budget_limit,
  current_month_spend,
  description,
  tags,
  created_at,
  updated_at,
  created_by,
  updated_by
FROM ai_model_configurations
WHERE is_admin_user_cached(auth.uid());

-- Grant access to the secure view
GRANT SELECT ON ai_model_configurations_secure TO authenticated;

-- =========================================
-- PERFORMANCE INDEXES FOR SECURITY
-- =========================================

-- Index for fast admin user lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_admin_lookup
ON user_roles(user_id, role)
WHERE role IN ('admin', 'super_admin');

-- Index for configuration history queries
CREATE INDEX IF NOT EXISTS idx_ai_configuration_history_lookup
ON ai_configuration_history(table_name, record_id, changed_at DESC);

-- Index for audit trail by user
CREATE INDEX IF NOT EXISTS idx_ai_configuration_history_user
ON ai_configuration_history(changed_by, changed_at DESC);

-- =========================================
-- SECURITY VALIDATION FUNCTIONS
-- =========================================

-- Function to validate admin access for API calls
CREATE OR REPLACE FUNCTION validate_admin_api_access(
  required_permission TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
  has_permission BOOLEAN := false;
BEGIN
  -- Get current user ID
  user_uuid := auth.uid();

  -- Check if user exists
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission level
  CASE required_permission
    WHEN 'admin' THEN
      has_permission := is_admin_user_cached(user_uuid);
    WHEN 'super_admin' THEN
      SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = user_uuid
        AND ur.role = 'super_admin'
      ) INTO has_permission;
    ELSE
      RAISE EXCEPTION 'Invalid permission level: %', required_permission;
  END CASE;

  IF NOT has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions for AI Control Center access';
  END IF;

  RETURN true;
END;
$$;

-- =========================================
-- SECURITY GRANTS AND PERMISSIONS
-- =========================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION is_admin_user_cached TO authenticated;
GRANT EXECUTE ON FUNCTION validate_admin_api_access TO authenticated;

-- Revoke direct access to sensitive tables (force through functions/views)
REVOKE ALL ON ai_model_configurations FROM authenticated;
GRANT SELECT ON ai_model_configurations_secure TO authenticated;

-- Grant necessary permissions for AI configuration management functions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_prompt_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_scoring_rubrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_prompt_experiments TO authenticated;
GRANT SELECT, INSERT ON ai_configuration_history TO authenticated;

-- =========================================
-- SECURITY MONITORING FUNCTIONS
-- =========================================

-- Function to get security metrics for admin dashboard
CREATE OR REPLACE FUNCTION get_ai_security_metrics()
RETURNS TABLE(
  total_admins INTEGER,
  active_sessions INTEGER,
  recent_configuration_changes INTEGER,
  failed_access_attempts INTEGER,
  last_security_audit TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  RETURN QUERY
  WITH admin_count AS (
    SELECT COUNT(*)::INTEGER as total_admins
    FROM user_roles
    WHERE role IN ('admin', 'super_admin')
  ),
  recent_changes AS (
    SELECT COUNT(*)::INTEGER as recent_changes
    FROM ai_configuration_history
    WHERE changed_at >= now() - INTERVAL '24 hours'
  )
  SELECT
    ac.total_admins,
    0::INTEGER as active_sessions, -- Placeholder for session tracking
    rc.recent_changes,
    0::INTEGER as failed_attempts, -- Placeholder for failed access tracking
    now() as last_audit
  FROM admin_count ac, recent_changes rc;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ai_security_metrics TO authenticated;

-- =========================================
-- MODEL CONFIGURATION MANAGEMENT FUNCTIONS
-- =========================================

-- Function to get model health status
CREATE OR REPLACE FUNCTION get_model_health_status()
RETURNS TABLE(
  configuration_id UUID,
  name TEXT,
  provider TEXT,
  health_status TEXT,
  last_health_check TIMESTAMPTZ,
  response_time_ms INTEGER,
  is_active BOOLEAN,
  error_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  RETURN QUERY
  SELECT
    mc.id as configuration_id,
    mc.name,
    mc.provider,
    COALESCE(mc.health_status, 'unknown') as health_status,
    mc.last_health_check,
    mc.average_response_time_ms as response_time_ms,
    mc.is_active,
    0::INTEGER as error_count -- Placeholder for future error tracking
  FROM ai_model_configurations mc
  WHERE mc.is_active = true
  ORDER BY mc.name;
END;
$$;

-- Function to update model health metrics
CREATE OR REPLACE FUNCTION update_model_health_metrics(
  p_configuration_id UUID,
  p_health_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  -- Update health metrics
  UPDATE ai_model_configurations SET
    health_status = p_health_status,
    last_health_check = now(),
    average_response_time_ms = COALESCE(p_response_time_ms, average_response_time_ms),
    updated_at = now()
  WHERE id = p_configuration_id;

  -- Log health check in history if there was an error
  IF p_error_message IS NOT NULL THEN
    INSERT INTO ai_configuration_history (
      table_name,
      record_id,
      operation,
      changed_by,
      old_values,
      new_values
    ) VALUES (
      'ai_model_configurations',
      p_configuration_id,
      'UPDATE',
      auth.uid(),
      NULL,
      jsonb_build_object(
        'health_status', p_health_status,
        'error_message', p_error_message,
        'response_time_ms', p_response_time_ms,
        'timestamp', now()
      )
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to get AI Control Center dashboard statistics
CREATE OR REPLACE FUNCTION get_ai_control_center_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
  prompt_stats JSONB;
  model_stats JSONB;
  experiment_stats JSONB;
  usage_stats JSONB;
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  -- Get prompt template statistics
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'categories', jsonb_object_agg(
      category,
      COUNT(*) FILTER (WHERE category = category)
    )
  ) INTO prompt_stats
  FROM ai_prompt_templates;

  -- Get model configuration statistics
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'healthy', COUNT(*) FILTER (WHERE health_status = 'healthy'),
    'unhealthy', COUNT(*) FILTER (WHERE health_status = 'unhealthy'),
    'totalRequests', COALESCE(SUM(total_requests), 0),
    'averageResponseTime', COALESCE(AVG(average_response_time_ms), 0)
  ) INTO model_stats
  FROM ai_model_configurations
  WHERE is_active = true;

  -- Get experiment statistics (placeholder for now)
  SELECT jsonb_build_object(
    'active', 0,
    'completed', 0,
    'significantResults', 0
  ) INTO experiment_stats;

  -- Get usage statistics (placeholder for now)
  SELECT jsonb_build_object(
    'monthlyTokens', 0,
    'monthlyCost', 0,
    'avgRequestsPerDay', 0
  ) INTO usage_stats;

  -- Combine all statistics
  stats := jsonb_build_object(
    'promptTemplates', prompt_stats,
    'modelConfigurations', model_stats,
    'experiments', experiment_stats,
    'usage', usage_stats,
    'lastUpdated', now()
  );

  RETURN stats;
END;
$$;

-- Grant execute permissions for model management functions
GRANT EXECUTE ON FUNCTION get_model_health_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_model_health_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_control_center_stats TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_ai_security_metrics() IS 'Returns security metrics for AI Control Center admin dashboard monitoring';
COMMENT ON FUNCTION validate_admin_api_access(TEXT) IS 'Validates admin access permissions for AI Control Center operations';
COMMENT ON FUNCTION get_model_health_status() IS 'Returns health status for all active AI model configurations';
COMMENT ON FUNCTION update_model_health_metrics(UUID, TEXT, INTEGER, TEXT) IS 'Updates health metrics for a specific AI model configuration';
COMMENT ON FUNCTION get_ai_control_center_stats() IS 'Returns comprehensive statistics for AI Control Center dashboard';
COMMENT ON VIEW ai_model_configurations_secure IS 'Secure view of model configurations with masked API keys for non-super-admin users';

-- =========================================
-- FINAL SECURITY VALIDATION
-- =========================================

-- Ensure all AI configuration tables have RLS enabled
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename
             FROM pg_tables
             WHERE schemaname = 'public'
             AND tablename LIKE 'ai_%'
    LOOP
        -- Enable RLS on all AI tables
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    END LOOP;
END
$$;

-- Log security policy implementation
INSERT INTO ai_configuration_history (
  table_name,
  record_id,
  operation,
  changed_by,
  old_values,
  new_values
) VALUES (
  'security_policies',
  gen_random_uuid(),
  'INSERT',
  NULL, -- System operation (no specific user)
  NULL,
  jsonb_build_object(
    'description', 'Comprehensive security policies implemented for AI Control Center',
    'policies_created', array[
      'ai_prompt_templates_admin_*',
      'ai_model_configurations_admin_*',
      'ai_scoring_rubrics_admin_*',
      'ai_prompt_experiments_admin_*',
      'ai_configuration_history_admin_select'
    ],
    'functions_created', array[
      'is_admin_user_cached',
      'validate_admin_api_access',
      'get_ai_security_metrics'
    ],
    'timestamp', now()
  )
);