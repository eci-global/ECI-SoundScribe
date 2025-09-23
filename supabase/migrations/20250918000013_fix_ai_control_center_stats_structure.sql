-- Fix AI Control Center Stats Function Structure
-- Updates the function to return field names matching the AIControlCenterStats interface
-- Created: 2025-09-18
-- Fixes: Data structure mismatch between database and component

-- ================================
-- AI Control Center Master Stats Function (Fixed Structure)
-- ================================
CREATE OR REPLACE FUNCTION get_ai_control_center_stats()
RETURNS JSONB AS $$
DECLARE
  prompt_stats JSONB;
  model_stats JSONB;
  rubric_stats JSONB;
  experiment_stats JSONB;
  usage_stats JSONB;
  combined_stats JSONB;
BEGIN
  -- Get prompt template statistics (matching component interface)
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'categories', jsonb_object_agg(category, category_count)
    ) INTO prompt_stats
    FROM (
      SELECT
        category,
        is_active,
        COUNT(*) OVER (PARTITION BY category) as category_count
      FROM ai_prompt_templates
    ) pt_stats;
  EXCEPTION
    WHEN OTHERS THEN
      prompt_stats := '{"total": 0, "active": 0, "categories": {}}'::jsonb;
  END;

  -- Get model configuration statistics (matching component interface)
  BEGIN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'healthy', COUNT(*) FILTER (WHERE health_status = 'healthy'),
      'unhealthy', COUNT(*) FILTER (WHERE health_status IN ('degraded', 'unhealthy')),
      'totalRequests', COALESCE(SUM(request_count), 0),
      'averageResponseTime', ROUND(AVG(avg_response_time), 2)
    ) INTO model_stats
    FROM ai_model_configurations;
  EXCEPTION
    WHEN OTHERS THEN
      model_stats := '{"total": 0, "healthy": 0, "unhealthy": 0, "totalRequests": 0, "averageResponseTime": 0}'::jsonb;
  END;

  -- Get experiments statistics (matching component interface)
  BEGIN
    SELECT jsonb_build_object(
      'active', COUNT(*) FILTER (WHERE status = 'running'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'significantResults', COUNT(*) FILTER (WHERE winner IS NOT NULL AND statistical_significance > 0.05)
    ) INTO experiment_stats
    FROM ai_experiments;
  EXCEPTION
    WHEN OTHERS THEN
      experiment_stats := '{"active": 0, "completed": 0, "significantResults": 0}'::jsonb;
  END;

  -- Calculate usage statistics (new - matching component interface)
  BEGIN
    SELECT jsonb_build_object(
      'monthlyTokens', COALESCE(SUM(
        CASE
          WHEN mc.request_count IS NOT NULL AND mc.created_at > (NOW() - INTERVAL '30 days')
          THEN mc.request_count * 150  -- Estimate 150 tokens per request
          ELSE 0
        END
      ), 0),
      'monthlyCost', COALESCE(SUM(
        CASE
          WHEN mc.request_count IS NOT NULL AND mc.created_at > (NOW() - INTERVAL '30 days')
          THEN mc.request_count * 0.002  -- Estimate $0.002 per request
          ELSE 0
        END
      ), 0),
      'avgRequestsPerDay', COALESCE(ROUND(AVG(
        CASE
          WHEN mc.request_count IS NOT NULL AND mc.created_at > (NOW() - INTERVAL '7 days')
          THEN mc.request_count / 7.0
          ELSE 0
        END
      ), 0), 0)
    ) INTO usage_stats
    FROM ai_model_configurations mc
    WHERE mc.created_at > (NOW() - INTERVAL '30 days');
  EXCEPTION
    WHEN OTHERS THEN
      usage_stats := '{"monthlyTokens": 0, "monthlyCost": 0, "avgRequestsPerDay": 0}'::jsonb;
  END;

  -- Combine all statistics (matching exact component structure)
  SELECT jsonb_build_object(
    'promptTemplates', prompt_stats,
    'modelConfigurations', model_stats,
    'experiments', experiment_stats,
    'usage', usage_stats,
    'summary', jsonb_build_object(
      'totalComponents',
        COALESCE((prompt_stats->>'total')::integer, 0) +
        COALESCE((model_stats->>'total')::integer, 0) +
        COALESCE((experiment_stats->>'active')::integer, 0) +
        COALESCE((experiment_stats->>'completed')::integer, 0),
      'healthyComponents',
        COALESCE((prompt_stats->>'active')::integer, 0) +
        COALESCE((model_stats->>'healthy')::integer, 0),
      'activeExperiments', COALESCE((experiment_stats->>'active')::integer, 0),
      'monthlyUsage', COALESCE((usage_stats->>'monthlyTokens')::integer, 0)
    ),
    'generatedAt', NOW()
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
COMMENT ON FUNCTION get_ai_control_center_stats IS 'Get AI Control Center statistics with field names matching the AIControlCenterStats interface exactly';