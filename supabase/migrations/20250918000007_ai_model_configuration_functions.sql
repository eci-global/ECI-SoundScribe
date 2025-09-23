-- AI Model Configuration Management Functions
-- Created: 2025-09-18
-- Purpose: Database functions for managing AI model configurations

-- ================================
-- Get Model Configurations (with filtering)
-- ================================
CREATE OR REPLACE FUNCTION get_model_configurations(
  p_service_type TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  service_type TEXT,
  model_name TEXT,
  deployment_name TEXT,
  endpoint_url TEXT,
  api_version TEXT,
  parameters JSONB,
  rate_limits JSONB,
  is_active BOOLEAN,
  is_default BOOLEAN,
  health_status TEXT,
  last_health_check TIMESTAMPTZ,
  average_response_time_ms INTEGER,
  total_requests INTEGER,
  error_rate DECIMAL(5,4),
  cost_per_1k_tokens DECIMAL(10,6),
  monthly_budget_limit DECIMAL(12,2),
  current_month_spend DECIMAL(12,2),
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    amc.id,
    amc.name,
    amc.service_type,
    amc.model_name,
    amc.deployment_name,
    amc.endpoint_url,
    amc.api_version,
    amc.parameters,
    amc.rate_limits,
    amc.is_active,
    amc.is_default,
    amc.health_status,
    amc.last_health_check,
    amc.average_response_time_ms,
    amc.total_requests,
    amc.error_rate,
    amc.cost_per_1k_tokens,
    amc.monthly_budget_limit,
    amc.current_month_spend,
    amc.description,
    amc.tags,
    amc.created_at,
    amc.updated_at,
    amc.created_by
  FROM ai_model_configurations amc
  WHERE
    (p_service_type IS NULL OR amc.service_type = p_service_type)
    AND (p_is_active IS NULL OR amc.is_active = p_is_active)
  ORDER BY amc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get Single Model Configuration by ID
-- ================================
CREATE OR REPLACE FUNCTION get_model_configuration_by_id(
  p_config_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  service_type TEXT,
  model_name TEXT,
  deployment_name TEXT,
  endpoint_url TEXT,
  api_version TEXT,
  parameters JSONB,
  rate_limits JSONB,
  is_active BOOLEAN,
  is_default BOOLEAN,
  health_status TEXT,
  last_health_check TIMESTAMPTZ,
  average_response_time_ms INTEGER,
  total_requests INTEGER,
  error_rate DECIMAL(5,4),
  cost_per_1k_tokens DECIMAL(10,6),
  monthly_budget_limit DECIMAL(12,2),
  current_month_spend DECIMAL(12,2),
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    amc.id,
    amc.name,
    amc.service_type,
    amc.model_name,
    amc.deployment_name,
    amc.endpoint_url,
    amc.api_version,
    amc.parameters,
    amc.rate_limits,
    amc.is_active,
    amc.is_default,
    amc.health_status,
    amc.last_health_check,
    amc.average_response_time_ms,
    amc.total_requests,
    amc.error_rate,
    amc.cost_per_1k_tokens,
    amc.monthly_budget_limit,
    amc.current_month_spend,
    amc.description,
    amc.tags,
    amc.created_at,
    amc.updated_at,
    amc.created_by
  FROM ai_model_configurations amc
  WHERE amc.id = p_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Create Model Configuration
-- ================================
CREATE OR REPLACE FUNCTION create_model_configuration(
  p_name TEXT,
  p_service_type TEXT,
  p_model_name TEXT,
  p_deployment_name TEXT DEFAULT NULL,
  p_endpoint_url TEXT DEFAULT NULL,
  p_api_version TEXT DEFAULT '2024-10-01-preview',
  p_parameters JSONB DEFAULT '{}'::jsonb,
  p_rate_limits JSONB DEFAULT '{}'::jsonb,
  p_is_active BOOLEAN DEFAULT true,
  p_is_default BOOLEAN DEFAULT false,
  p_cost_per_1k_tokens DECIMAL(10,6) DEFAULT NULL,
  p_monthly_budget_limit DECIMAL(12,2) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_config_id UUID;
BEGIN
  -- Validate required parameters
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Configuration name is required';
  END IF;

  IF p_service_type IS NULL OR p_service_type NOT IN ('azure_openai', 'openai', 'whisper', 'custom') THEN
    RAISE EXCEPTION 'Valid service_type is required (azure_openai, openai, whisper, custom)';
  END IF;

  IF p_model_name IS NULL OR length(trim(p_model_name)) = 0 THEN
    RAISE EXCEPTION 'Model name is required';
  END IF;

  -- If setting as default, unset other defaults for this service type
  IF p_is_default THEN
    UPDATE ai_model_configurations
    SET is_default = false
    WHERE service_type = p_service_type AND is_default = true;
  END IF;

  -- Insert new configuration
  INSERT INTO ai_model_configurations (
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
    cost_per_1k_tokens,
    monthly_budget_limit,
    current_month_spend,
    description,
    tags,
    created_by
  ) VALUES (
    p_name,
    p_service_type,
    p_model_name,
    p_deployment_name,
    p_endpoint_url,
    p_api_version,
    p_parameters,
    p_rate_limits,
    p_is_active,
    p_is_default,
    'unknown',
    p_cost_per_1k_tokens,
    p_monthly_budget_limit,
    0,
    p_description,
    p_tags,
    auth.uid()
  ) RETURNING id INTO new_config_id;

  RETURN new_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update Model Configuration
-- ================================
CREATE OR REPLACE FUNCTION update_model_configuration(
  p_config_id UUID,
  p_name TEXT DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL,
  p_model_name TEXT DEFAULT NULL,
  p_deployment_name TEXT DEFAULT NULL,
  p_endpoint_url TEXT DEFAULT NULL,
  p_api_version TEXT DEFAULT NULL,
  p_parameters JSONB DEFAULT NULL,
  p_rate_limits JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_cost_per_1k_tokens DECIMAL(10,6) DEFAULT NULL,
  p_monthly_budget_limit DECIMAL(12,2) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_service_type TEXT;
  config_exists BOOLEAN := false;
BEGIN
  -- Check if configuration exists and get current service type
  SELECT service_type INTO current_service_type
  FROM ai_model_configurations
  WHERE id = p_config_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration with id % not found', p_config_id;
  END IF;

  config_exists := true;

  -- If setting as default, unset other defaults for this service type
  IF p_is_default IS TRUE THEN
    UPDATE ai_model_configurations
    SET is_default = false
    WHERE service_type = COALESCE(p_service_type, current_service_type)
    AND is_default = true
    AND id != p_config_id;
  END IF;

  -- Update configuration
  UPDATE ai_model_configurations SET
    name = COALESCE(p_name, name),
    service_type = COALESCE(p_service_type, service_type),
    model_name = COALESCE(p_model_name, model_name),
    deployment_name = COALESCE(p_deployment_name, deployment_name),
    endpoint_url = COALESCE(p_endpoint_url, endpoint_url),
    api_version = COALESCE(p_api_version, api_version),
    parameters = COALESCE(p_parameters, parameters),
    rate_limits = COALESCE(p_rate_limits, rate_limits),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    cost_per_1k_tokens = COALESCE(p_cost_per_1k_tokens, cost_per_1k_tokens),
    monthly_budget_limit = COALESCE(p_monthly_budget_limit, monthly_budget_limit),
    description = COALESCE(p_description, description),
    tags = COALESCE(p_tags, tags),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_config_id;

  RETURN config_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Delete Model Configuration
-- ================================
CREATE OR REPLACE FUNCTION delete_model_configuration(
  p_config_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  config_exists BOOLEAN := false;
BEGIN
  -- Check if configuration exists
  SELECT true INTO config_exists
  FROM ai_model_configurations
  WHERE id = p_config_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration with id % not found', p_config_id;
  END IF;

  -- Delete the configuration
  DELETE FROM ai_model_configurations
  WHERE id = p_config_id;

  RETURN config_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update Health Status
-- ================================
CREATE OR REPLACE FUNCTION update_model_health_status(
  p_config_id UUID,
  p_health_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate health status
  IF p_health_status NOT IN ('healthy', 'degraded', 'unhealthy', 'unknown') THEN
    RAISE EXCEPTION 'Invalid health status. Must be: healthy, degraded, unhealthy, or unknown';
  END IF;

  -- Update health status and metrics
  UPDATE ai_model_configurations SET
    health_status = p_health_status,
    last_health_check = NOW(),
    average_response_time_ms = COALESCE(p_response_time_ms, average_response_time_ms),
    updated_at = NOW()
  WHERE id = p_config_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Increment Usage Stats
-- ================================
CREATE OR REPLACE FUNCTION increment_model_usage(
  p_config_id UUID,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_incurred DECIMAL(10,6) DEFAULT 0,
  p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_model_configurations SET
    total_requests = total_requests + 1,
    current_month_spend = current_month_spend + p_cost_incurred,
    average_response_time_ms = CASE
      WHEN p_response_time_ms IS NOT NULL AND total_requests > 0 THEN
        ((average_response_time_ms * total_requests) + p_response_time_ms) / (total_requests + 1)
      ELSE average_response_time_ms
    END,
    updated_at = NOW()
  WHERE id = p_config_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get Model Configuration Stats
-- ================================
CREATE OR REPLACE FUNCTION get_model_configuration_stats()
RETURNS JSONB AS $$
DECLARE
  stats_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'healthy', COUNT(*) FILTER (WHERE health_status = 'healthy'),
    'degraded', COUNT(*) FILTER (WHERE health_status = 'degraded'),
    'unhealthy', COUNT(*) FILTER (WHERE health_status = 'unhealthy'),
    'by_service', jsonb_object_agg(service_type, service_count)
  ) INTO stats_result
  FROM (
    SELECT
      service_type,
      COUNT(*) as service_count
    FROM ai_model_configurations
    GROUP BY service_type
  ) service_stats;

  RETURN COALESCE(stats_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION get_model_configurations(TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_model_configuration_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_model_configuration(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN, BOOLEAN, DECIMAL, DECIMAL, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_model_configuration(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN, BOOLEAN, DECIMAL, DECIMAL, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_model_configuration(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_model_health_status(UUID, TEXT, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_model_usage(UUID, INTEGER, DECIMAL, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_model_configuration_stats() TO authenticated, service_role;

-- ================================
-- Comments for Documentation
-- ================================
COMMENT ON FUNCTION get_model_configurations IS 'Retrieve AI model configurations with optional filtering by service type and status';
COMMENT ON FUNCTION get_model_configuration_by_id IS 'Get a specific AI model configuration by ID';
COMMENT ON FUNCTION create_model_configuration IS 'Create a new AI model configuration with validation';
COMMENT ON FUNCTION update_model_configuration IS 'Update an existing AI model configuration';
COMMENT ON FUNCTION delete_model_configuration IS 'Delete an AI model configuration by ID';
COMMENT ON FUNCTION update_model_health_status IS 'Update the health status and metrics of a model configuration';
COMMENT ON FUNCTION increment_model_usage IS 'Increment usage statistics for a model configuration';
COMMENT ON FUNCTION get_model_configuration_stats IS 'Get aggregate statistics for all model configurations';