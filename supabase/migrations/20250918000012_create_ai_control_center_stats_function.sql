-- Create AI Control Center Stats Function
-- This function aggregates statistics from all AI components without nested aggregates
-- Created: 2025-09-18
-- Fixes: "aggregate function calls cannot be nested" error

-- ================================
-- AI Control Center Master Stats Function
-- ================================
CREATE OR REPLACE FUNCTION get_ai_control_center_stats()
RETURNS JSONB AS $$
DECLARE
  prompt_stats JSONB;
  model_stats JSONB;
  rubric_stats JSONB;
  experiment_stats JSONB;
  combined_stats JSONB;
BEGIN
  -- Get prompt template statistics
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'by_category', jsonb_object_agg(category, category_count),
      'total_usage', COALESCE(SUM(usage_count), 0),
      'avg_version', ROUND(AVG(version), 1)
    ) INTO prompt_stats
    FROM (
      SELECT
        category,
        usage_count,
        version,
        is_active,
        COUNT(*) OVER (PARTITION BY category) as category_count
      FROM ai_prompt_templates
    ) pt_stats;
  EXCEPTION
    WHEN OTHERS THEN
      prompt_stats := '{"total": 0, "active": 0, "by_category": {}, "total_usage": 0, "avg_version": 1.0}'::jsonb;
  END;

  -- Get model configuration statistics
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'healthy', COUNT(*) FILTER (WHERE health_status = 'healthy'),
      'degraded', COUNT(*) FILTER (WHERE health_status = 'degraded'),
      'unhealthy', COUNT(*) FILTER (WHERE health_status = 'unhealthy'),
      'by_provider', jsonb_object_agg(provider, provider_count),
      'total_requests', COALESCE(SUM(request_count), 0),
      'avg_response_time', ROUND(AVG(avg_response_time), 2)
    ) INTO model_stats
    FROM (
      SELECT
        is_active,
        health_status,
        provider,
        request_count,
        avg_response_time,
        COUNT(*) OVER (PARTITION BY provider) as provider_count
      FROM ai_model_configurations
    ) mc_stats;
  EXCEPTION
    WHEN OTHERS THEN
      model_stats := '{"total": 0, "active": 0, "healthy": 0, "degraded": 0, "unhealthy": 0, "by_provider": {}, "total_requests": 0, "avg_response_time": 0}'::jsonb;
  END;

  -- Get scoring rubrics statistics
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'by_category', jsonb_object_agg(category, category_count),
      'by_scale_type', jsonb_object_agg(scale_type, scale_count),
      'total_usage', COALESCE(SUM(usage_count), 0),
      'avg_version', ROUND(AVG(version), 1)
    ) INTO rubric_stats
    FROM (
      SELECT
        category,
        scale_type,
        usage_count,
        version,
        is_active,
        COUNT(*) OVER (PARTITION BY category) as category_count,
        COUNT(*) OVER (PARTITION BY scale_type) as scale_count
      FROM ai_scoring_rubrics
    ) sr_stats;
  EXCEPTION
    WHEN OTHERS THEN
      rubric_stats := '{"total": 0, "active": 0, "by_category": {}, "by_scale_type": {}, "total_usage": 0, "avg_version": 1.0}'::jsonb;
  END;

  -- Get experiments statistics
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'running', COUNT(*) FILTER (WHERE status = 'running'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'total_participants', COALESCE(SUM(current_participants), 0),
      'avg_significance', ROUND(AVG(statistical_significance), 3),
      'successful_experiments', COUNT(*) FILTER (WHERE winner IS NOT NULL),
      'by_status', jsonb_object_agg(status, status_count),
      'by_type', jsonb_object_agg(experiment_type, type_count)
    ) INTO experiment_stats
    FROM (
      SELECT
        status,
        experiment_type,
        current_participants,
        statistical_significance,
        winner,
        COUNT(*) OVER (PARTITION BY status) as status_count,
        COUNT(*) OVER (PARTITION BY experiment_type) as type_count
      FROM ai_experiments
    ) exp_stats;
  EXCEPTION
    WHEN OTHERS THEN
      experiment_stats := '{"total": 0, "running": 0, "completed": 0, "total_participants": 0, "avg_significance": 0, "successful_experiments": 0, "by_status": {}, "by_type": {}}'::jsonb;
  END;

  -- Combine all statistics
  SELECT jsonb_build_object(
    'promptTemplates', prompt_stats,
    'modelConfigurations', model_stats,
    'scoringRubrics', rubric_stats,
    'experiments', experiment_stats,
    'summary', jsonb_build_object(
      'total_components',
        COALESCE((prompt_stats->>'total')::integer, 0) +
        COALESCE((model_stats->>'total')::integer, 0) +
        COALESCE((rubric_stats->>'total')::integer, 0) +
        COALESCE((experiment_stats->>'total')::integer, 0),
      'active_components',
        COALESCE((prompt_stats->>'active')::integer, 0) +
        COALESCE((model_stats->>'active')::integer, 0) +
        COALESCE((rubric_stats->>'active')::integer, 0),
      'running_experiments', COALESCE((experiment_stats->>'running')::integer, 0),
      'healthy_models', COALESCE((model_stats->>'healthy')::integer, 0),
      'total_usage',
        COALESCE((prompt_stats->>'total_usage')::integer, 0) +
        COALESCE((rubric_stats->>'total_usage')::integer, 0) +
        COALESCE((model_stats->>'total_requests')::integer, 0)
    ),
    'generated_at', NOW()
  ) INTO combined_stats;

  RETURN COALESCE(combined_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION get_ai_control_center_stats() TO authenticated, service_role;

-- ================================
-- Comments for Documentation
-- ================================
COMMENT ON FUNCTION get_ai_control_center_stats IS 'Get comprehensive AI Control Center statistics aggregating data from all AI components without nested aggregates';