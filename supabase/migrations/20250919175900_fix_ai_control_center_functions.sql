-- Fix AI Control Center functions to work with legacy schema shapes
-- Safe to re-run; recreates functions without referencing newer columns.

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_ai_experiments(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_ai_experiment_by_id(UUID);
DROP FUNCTION IF EXISTS get_ai_experiments_stats();
DROP FUNCTION IF EXISTS get_scoring_rubrics_stats();

CREATE OR REPLACE FUNCTION get_ai_experiments(
  p_status TEXT DEFAULT NULL,
  p_experiment_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  experiment_type TEXT,
  status TEXT,
  config_a JSONB,
  config_b JSONB,
  traffic_split INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sample_size INTEGER,
  current_participants INTEGER,
  success_metric TEXT,
  statistical_significance NUMERIC,
  confidence_level NUMERIC,
  results JSONB,
  winner TEXT,
  auto_promote BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    e.experiment_type,
    e.status,
    e.config_a,
    e.config_b,
    e.traffic_split,
    e.start_date,
    e.end_date,
    e.sample_size,
    e.current_participants,
    e.success_metric,
    e.statistical_significance,
    e.confidence_level,
    e.results,
    e.winner,
    e.auto_promote,
    e.tags,
    e.created_at,
    e.updated_at,
    e.created_by
  FROM ai_experiments e
  WHERE
    (p_status IS NULL OR e.status = p_status)
    AND (p_experiment_type IS NULL OR e.experiment_type = p_experiment_type)
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ai_experiment_by_id(
  p_experiment_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  experiment_type TEXT,
  status TEXT,
  config_a JSONB,
  config_b JSONB,
  traffic_split INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sample_size INTEGER,
  current_participants INTEGER,
  success_metric TEXT,
  statistical_significance NUMERIC,
  confidence_level NUMERIC,
  results JSONB,
  winner TEXT,
  auto_promote BOOLEAN,
  hypothesis TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    e.experiment_type,
    e.status,
    e.config_a,
    e.config_b,
    e.traffic_split,
    e.start_date,
    e.end_date,
    e.sample_size,
    e.current_participants,
    e.success_metric,
    e.statistical_significance,
    e.confidence_level,
    e.results,
    e.winner,
    e.auto_promote,
    e.hypothesis,
    e.notes,
    e.tags,
    e.created_at,
    e.updated_at,
    e.created_by
  FROM ai_experiments e
  WHERE e.id = p_experiment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ai_experiments_stats()
RETURNS JSONB AS $$
DECLARE
  stats_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'by_status', jsonb_object_agg(status, status_count),
    'by_type', jsonb_object_agg(experiment_type, type_count),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'total_participants', COALESCE(SUM(current_participants), 0),
    'avg_significance', ROUND(AVG(statistical_significance) FILTER (WHERE statistical_significance > 0), 3),
    'successful_experiments', COUNT(*) FILTER (WHERE winner IS NOT NULL AND winner <> 'inconclusive')
  ) INTO stats_result
  FROM (
    SELECT
      status,
      experiment_type,
      current_participants,
      statistical_significance,
      winner,
      COUNT(*) OVER (PARTITION BY status) AS status_count,
      COUNT(*) OVER (PARTITION BY experiment_type) AS type_count
    FROM ai_experiments
  ) experiment_stats;

  RETURN COALESCE(stats_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_scoring_rubrics_stats()
RETURNS JSONB AS $$
DECLARE
  has_is_active BOOLEAN;
  total_count BIGINT;
  active_count BIGINT;
  total_usage NUMERIC;
  avg_version NUMERIC;
  by_category JSONB := '{}'::jsonb;
  by_scale JSONB := '{}'::jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_scoring_rubrics'
      AND column_name = 'is_active'
  ) INTO has_is_active;

  SELECT COUNT(*) INTO total_count FROM ai_scoring_rubrics;

  IF has_is_active THEN
    EXECUTE 'SELECT COUNT(*) FROM ai_scoring_rubrics WHERE is_active IS DISTINCT FROM false'
      INTO active_count;
    EXECUTE
      'SELECT COALESCE(jsonb_object_agg(category, cnt), ''{}''::jsonb)
      FROM (
        SELECT category, COUNT(*) AS cnt
        FROM ai_scoring_rubrics
        WHERE is_active IS DISTINCT FROM false
        GROUP BY category
      ) t'
     INTO by_category;
    EXECUTE
      'SELECT COALESCE(jsonb_object_agg(scale_type, cnt), ''{}''::jsonb)
      FROM (
        SELECT scale_type, COUNT(*) AS cnt
        FROM ai_scoring_rubrics
        WHERE is_active IS DISTINCT FROM false
        GROUP BY scale_type
      ) t'
     INTO by_scale;
  ELSE
    active_count := total_count;
    SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      INTO by_category
      FROM (
        SELECT category, COUNT(*) AS cnt
        FROM ai_scoring_rubrics
        GROUP BY category
      ) t;
    SELECT COALESCE(jsonb_object_agg(scale_type, cnt), '{}'::jsonb)
      INTO by_scale
      FROM (
        SELECT scale_type, COUNT(*) AS cnt
        FROM ai_scoring_rubrics
        GROUP BY scale_type
      ) t;
  END IF;

  SELECT COALESCE(SUM(usage_count), 0) INTO total_usage FROM ai_scoring_rubrics;
  SELECT COALESCE(ROUND(AVG(COALESCE(version, 1))::numeric, 2), 0)
    INTO avg_version
    FROM ai_scoring_rubrics;

  RETURN jsonb_build_object(
    'total', COALESCE(total_count, 0),
    'active', COALESCE(active_count, 0),
    'by_category', COALESCE(by_category, '{}'::jsonb),
    'by_scale_type', COALESCE(by_scale, '{}'::jsonb),
    'total_usage', COALESCE(total_usage, 0),
    'avg_version', COALESCE(avg_version, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ai_experiments(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_experiment_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_experiments_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_scoring_rubrics_stats() TO authenticated, service_role;