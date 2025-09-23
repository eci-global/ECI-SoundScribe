-- AI Experiments Management Functions
-- Created: 2025-09-18
-- Purpose: Database functions for managing AI experiments, A/B testing, and performance optimization

-- ================================
-- Get AI Experiments (with filtering)
-- ================================
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

-- ================================
-- Get Single AI Experiment by ID
-- ================================
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

-- ================================
-- Create AI Experiment
-- ================================
CREATE OR REPLACE FUNCTION create_ai_experiment(
  p_name TEXT,
  p_description TEXT,
  p_experiment_type TEXT,
  p_config_a JSONB,
  p_config_b JSONB,
  p_traffic_split INTEGER DEFAULT 50,
  p_sample_size INTEGER DEFAULT 1000,
  p_success_metric TEXT DEFAULT 'accuracy',
  p_confidence_level NUMERIC DEFAULT 0.95,
  p_auto_promote BOOLEAN DEFAULT false,
  p_hypothesis TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_experiment_id UUID;
BEGIN
  -- Validate required parameters
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Experiment name is required';
  END IF;

  IF p_experiment_type IS NULL OR p_experiment_type NOT IN ('prompt_optimization', 'model_comparison', 'parameter_tuning', 'response_format', 'custom') THEN
    RAISE EXCEPTION 'Valid experiment_type is required (prompt_optimization, model_comparison, parameter_tuning, response_format, custom)';
  END IF;

  IF p_traffic_split < 1 OR p_traffic_split > 99 THEN
    RAISE EXCEPTION 'Traffic split must be between 1 and 99 percent';
  END IF;

  IF p_sample_size < 10 THEN
    RAISE EXCEPTION 'Sample size must be at least 10';
  END IF;

  IF p_confidence_level < 0.8 OR p_confidence_level > 0.99 THEN
    RAISE EXCEPTION 'Confidence level must be between 0.8 and 0.99';
  END IF;

  -- Insert new AI experiment
  INSERT INTO ai_experiments (
    name,
    description,
    experiment_type,
    status,
    config_a,
    config_b,
    traffic_split,
    sample_size,
    current_participants,
    success_metric,
    statistical_significance,
    confidence_level,
    results,
    auto_promote,
    hypothesis,
    notes,
    tags,
    created_by
  ) VALUES (
    p_name,
    p_description,
    p_experiment_type,
    'draft',
    p_config_a,
    p_config_b,
    p_traffic_split,
    p_sample_size,
    0,
    p_success_metric,
    0,
    p_confidence_level,
    '{}'::jsonb,
    p_auto_promote,
    p_hypothesis,
    p_notes,
    p_tags,
    auth.uid()
  ) RETURNING id INTO new_experiment_id;

  RETURN new_experiment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update AI Experiment
-- ================================
CREATE OR REPLACE FUNCTION update_ai_experiment(
  p_experiment_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_config_a JSONB DEFAULT NULL,
  p_config_b JSONB DEFAULT NULL,
  p_traffic_split INTEGER DEFAULT NULL,
  p_sample_size INTEGER DEFAULT NULL,
  p_success_metric TEXT DEFAULT NULL,
  p_confidence_level NUMERIC DEFAULT NULL,
  p_auto_promote BOOLEAN DEFAULT NULL,
  p_hypothesis TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
  experiment_exists BOOLEAN := false;
BEGIN
  -- Check if experiment exists and get current status
  SELECT status INTO current_status
  FROM ai_experiments
  WHERE id = p_experiment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI experiment with id % not found', p_experiment_id;
  END IF;

  experiment_exists := true;

  -- Validate traffic split if provided
  IF p_traffic_split IS NOT NULL AND (p_traffic_split < 1 OR p_traffic_split > 99) THEN
    RAISE EXCEPTION 'Traffic split must be between 1 and 99 percent';
  END IF;

  -- Validate sample size if provided
  IF p_sample_size IS NOT NULL AND p_sample_size < 10 THEN
    RAISE EXCEPTION 'Sample size must be at least 10';
  END IF;

  -- Validate confidence level if provided
  IF p_confidence_level IS NOT NULL AND (p_confidence_level < 0.8 OR p_confidence_level > 0.99) THEN
    RAISE EXCEPTION 'Confidence level must be between 0.8 and 0.99';
  END IF;

  -- Don't allow editing running or completed experiments (except notes)
  IF current_status IN ('running', 'completed', 'archived') AND
     (p_name IS NOT NULL OR p_config_a IS NOT NULL OR p_config_b IS NOT NULL OR
      p_traffic_split IS NOT NULL OR p_sample_size IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot modify configuration of % experiment. Only notes and hypothesis can be updated.', current_status;
  END IF;

  -- Update AI experiment
  UPDATE ai_experiments SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    config_a = COALESCE(p_config_a, config_a),
    config_b = COALESCE(p_config_b, config_b),
    traffic_split = COALESCE(p_traffic_split, traffic_split),
    sample_size = COALESCE(p_sample_size, sample_size),
    success_metric = COALESCE(p_success_metric, success_metric),
    confidence_level = COALESCE(p_confidence_level, confidence_level),
    auto_promote = COALESCE(p_auto_promote, auto_promote),
    hypothesis = COALESCE(p_hypothesis, hypothesis),
    notes = COALESCE(p_notes, notes),
    tags = COALESCE(p_tags, tags),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_experiment_id;

  RETURN experiment_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Start AI Experiment
-- ================================
CREATE OR REPLACE FUNCTION start_ai_experiment(
  p_experiment_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- Check current status
  SELECT status INTO current_status
  FROM ai_experiments
  WHERE id = p_experiment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI experiment with id % not found', p_experiment_id;
  END IF;

  IF current_status != 'draft' THEN
    RAISE EXCEPTION 'Can only start experiments in draft status. Current status: %', current_status;
  END IF;

  -- Start the experiment
  UPDATE ai_experiments SET
    status = 'running',
    start_date = NOW(),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_experiment_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Stop AI Experiment
-- ================================
CREATE OR REPLACE FUNCTION stop_ai_experiment(
  p_experiment_id UUID,
  p_reason TEXT DEFAULT 'manual_stop'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- Check current status
  SELECT status INTO current_status
  FROM ai_experiments
  WHERE id = p_experiment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI experiment with id % not found', p_experiment_id;
  END IF;

  IF current_status != 'running' THEN
    RAISE EXCEPTION 'Can only stop running experiments. Current status: %', current_status;
  END IF;

  -- Stop the experiment
  UPDATE ai_experiments SET
    status = 'completed',
    end_date = NOW(),
    notes = CASE
      WHEN notes IS NULL THEN p_reason
      ELSE notes || E'\n\nStopped: ' || p_reason
    END,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_experiment_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Record Experiment Participant
-- ================================
CREATE OR REPLACE FUNCTION record_experiment_participant(
  p_experiment_id UUID,
  p_variant TEXT,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  participant_id UUID;
BEGIN
  -- Validate variant
  IF p_variant NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Variant must be either A or B';
  END IF;

  -- Insert participant record
  INSERT INTO ai_experiment_participants (
    experiment_id,
    variant,
    user_id,
    session_id,
    metadata
  ) VALUES (
    p_experiment_id,
    p_variant,
    p_user_id,
    p_session_id,
    p_metadata
  ) RETURNING id INTO participant_id;

  -- Update participant count
  UPDATE ai_experiments SET
    current_participants = current_participants + 1,
    updated_at = NOW()
  WHERE id = p_experiment_id;

  RETURN participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update Experiment Results
-- ================================
CREATE OR REPLACE FUNCTION update_experiment_results(
  p_experiment_id UUID,
  p_results JSONB,
  p_statistical_significance NUMERIC DEFAULT NULL,
  p_winner TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate winner if provided
  IF p_winner IS NOT NULL AND p_winner NOT IN ('A', 'B', 'inconclusive') THEN
    RAISE EXCEPTION 'Winner must be A, B, or inconclusive';
  END IF;

  -- Update experiment results
  UPDATE ai_experiments SET
    results = p_results,
    statistical_significance = COALESCE(p_statistical_significance, statistical_significance),
    winner = p_winner,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_experiment_id;

  -- Auto-promote winner if enabled and experiment is significant
  IF p_winner IS NOT NULL AND p_winner != 'inconclusive' AND
     EXISTS (SELECT 1 FROM ai_experiments WHERE id = p_experiment_id AND auto_promote = true AND statistical_significance >= 0.95) THEN

    -- Mark for promotion (actual promotion would be handled by background job)
    UPDATE ai_experiments SET
      status = 'promoting',
      notes = COALESCE(notes || E'\n\n', '') || 'Auto-promotion triggered for variant ' || p_winner
    WHERE id = p_experiment_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Delete AI Experiment
-- ================================
CREATE OR REPLACE FUNCTION delete_ai_experiment(
  p_experiment_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
  experiment_exists BOOLEAN := false;
BEGIN
  -- Check if experiment exists and get status
  SELECT status INTO current_status
  FROM ai_experiments
  WHERE id = p_experiment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI experiment with id % not found', p_experiment_id;
  END IF;

  experiment_exists := true;

  -- Don't allow deletion of running experiments
  IF current_status = 'running' THEN
    RAISE EXCEPTION 'Cannot delete running experiment. Stop it first.';
  END IF;

  -- Delete related participant records first (cascade should handle this, but being explicit)
  DELETE FROM ai_experiment_participants WHERE experiment_id = p_experiment_id;

  -- Delete the experiment
  DELETE FROM ai_experiments WHERE id = p_experiment_id;

  RETURN experiment_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get AI Experiments Statistics
-- ================================
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
    'successful_experiments', COUNT(*) FILTER (WHERE winner IS NOT NULL AND winner != 'inconclusive')
  ) INTO stats_result
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
  ) experiment_stats;

  RETURN COALESCE(stats_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get Experiment Performance Data
-- ================================
CREATE OR REPLACE FUNCTION get_experiment_performance_data(
  p_experiment_id UUID
)
RETURNS JSONB AS $$
DECLARE
  performance_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'experiment_id', p_experiment_id,
    'total_participants', COUNT(*),
    'variant_a_count', COUNT(*) FILTER (WHERE variant = 'A'),
    'variant_b_count', COUNT(*) FILTER (WHERE variant = 'B'),
    'daily_participants', jsonb_agg(
      jsonb_build_object(
        'date', daily_data.participation_date,
        'variant_a', daily_data.variant_a_count,
        'variant_b', daily_data.variant_b_count
      ) ORDER BY daily_data.participation_date
    )
  ) INTO performance_data
  FROM ai_experiment_participants p
  LEFT JOIN (
    SELECT
      DATE(created_at) as participation_date,
      COUNT(*) FILTER (WHERE variant = 'A') as variant_a_count,
      COUNT(*) FILTER (WHERE variant = 'B') as variant_b_count
    FROM ai_experiment_participants
    WHERE experiment_id = p_experiment_id
    GROUP BY DATE(created_at)
  ) daily_data ON true
  WHERE p.experiment_id = p_experiment_id
  GROUP BY p.experiment_id;

  RETURN COALESCE(performance_data, jsonb_build_object('experiment_id', p_experiment_id, 'total_participants', 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION get_ai_experiments(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_experiment_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_ai_experiment(TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, INTEGER, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_ai_experiment(UUID, TEXT, TEXT, JSONB, JSONB, INTEGER, INTEGER, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION start_ai_experiment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION stop_ai_experiment(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_experiment_participant(UUID, TEXT, UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_experiment_results(UUID, JSONB, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_ai_experiment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_experiments_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_experiment_performance_data(UUID) TO authenticated, service_role;

-- ================================
-- Comments for Documentation
-- ================================
COMMENT ON FUNCTION get_ai_experiments IS 'Retrieve AI experiments with optional filtering by status and type';
COMMENT ON FUNCTION get_ai_experiment_by_id IS 'Get a specific AI experiment by ID with full details';
COMMENT ON FUNCTION create_ai_experiment IS 'Create a new AI experiment with A/B testing configuration';
COMMENT ON FUNCTION update_ai_experiment IS 'Update an existing AI experiment (restrictions apply for running experiments)';
COMMENT ON FUNCTION start_ai_experiment IS 'Start a draft experiment and begin collecting participants';
COMMENT ON FUNCTION stop_ai_experiment IS 'Stop a running experiment and mark as completed';
COMMENT ON FUNCTION record_experiment_participant IS 'Record a new participant in an experiment variant';
COMMENT ON FUNCTION update_experiment_results IS 'Update experiment results and statistical analysis';
COMMENT ON FUNCTION delete_ai_experiment IS 'Delete an AI experiment (cannot delete running experiments)';
COMMENT ON FUNCTION get_ai_experiments_stats IS 'Get aggregate statistics for all AI experiments';
COMMENT ON FUNCTION get_experiment_performance_data IS 'Get detailed performance data for a specific experiment';