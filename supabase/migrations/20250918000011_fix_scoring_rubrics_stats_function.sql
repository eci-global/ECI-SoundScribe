-- Fix get_scoring_rubrics_stats function
-- The function was failing because the subquery didn't include is_active column
-- Created: 2025-09-18

-- ================================
-- Fix Get Scoring Rubrics Stats Function
-- ================================
CREATE OR REPLACE FUNCTION get_scoring_rubrics_stats()
RETURNS JSONB AS $$
DECLARE
  stats_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'by_category', jsonb_object_agg(category, category_count),
    'by_scale_type', jsonb_object_agg(scale_type, scale_count),
    'total_usage', COALESCE(SUM(usage_count), 0),
    'avg_version', ROUND(AVG(version), 1)
  ) INTO stats_result
  FROM (
    SELECT
      category,
      scale_type,
      usage_count,
      version,
      is_active,  -- Added missing is_active column
      COUNT(*) OVER (PARTITION BY category) as category_count,
      COUNT(*) OVER (PARTITION BY scale_type) as scale_count
    FROM ai_scoring_rubrics
  ) rubric_stats;

  RETURN COALESCE(stats_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION get_scoring_rubrics_stats() TO authenticated, service_role;

-- ================================
-- Comments for Documentation
-- ================================
COMMENT ON FUNCTION get_scoring_rubrics_stats IS 'Get aggregate statistics for all scoring rubrics (fixed version with is_active column)';