-- AI Scoring Rubrics Management Functions
-- Created: 2025-09-18
-- Purpose: Database functions for managing AI scoring rubrics and evaluation frameworks

-- ================================
-- Get Scoring Rubrics (with filtering)
-- ================================
CREATE OR REPLACE FUNCTION get_scoring_rubrics(
  p_category TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  criteria JSONB,
  scale_type TEXT,
  scale_definition JSONB,
  is_active BOOLEAN,
  is_default BOOLEAN,
  usage_count INTEGER,
  validation_rules JSONB,
  accuracy_metrics JSONB,
  version INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    asr.id,
    asr.name,
    asr.category,
    asr.description,
    asr.criteria,
    asr.scale_type,
    asr.scale_definition,
    asr.is_active,
    asr.is_default,
    asr.usage_count,
    asr.validation_rules,
    asr.accuracy_metrics,
    asr.version,
    asr.tags,
    asr.created_at,
    asr.updated_at,
    asr.created_by
  FROM ai_scoring_rubrics asr
  WHERE
    (p_category IS NULL OR asr.category = p_category)
    AND (p_is_active IS NULL OR asr.is_active = p_is_active)
  ORDER BY asr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get Single Scoring Rubric by ID
-- ================================
CREATE OR REPLACE FUNCTION get_scoring_rubric_by_id(
  p_rubric_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  criteria JSONB,
  scale_type TEXT,
  scale_definition JSONB,
  is_active BOOLEAN,
  is_default BOOLEAN,
  usage_count INTEGER,
  validation_rules JSONB,
  accuracy_metrics JSONB,
  version INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    asr.id,
    asr.name,
    asr.category,
    asr.description,
    asr.criteria,
    asr.scale_type,
    asr.scale_definition,
    asr.is_active,
    asr.is_default,
    asr.usage_count,
    asr.validation_rules,
    asr.accuracy_metrics,
    asr.version,
    asr.tags,
    asr.created_at,
    asr.updated_at,
    asr.created_by
  FROM ai_scoring_rubrics asr
  WHERE asr.id = p_rubric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Create Scoring Rubric
-- ================================
CREATE OR REPLACE FUNCTION create_scoring_rubric(
  p_name TEXT,
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_criteria JSONB DEFAULT '{}'::jsonb,
  p_scale_type TEXT DEFAULT '0-4',
  p_scale_definition JSONB DEFAULT '{}'::jsonb,
  p_is_active BOOLEAN DEFAULT true,
  p_is_default BOOLEAN DEFAULT false,
  p_validation_rules JSONB DEFAULT '{}'::jsonb,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_rubric_id UUID;
BEGIN
  -- Validate required parameters
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Rubric name is required';
  END IF;

  IF p_category IS NULL OR p_category NOT IN ('bdr_criteria', 'coaching_framework', 'quality_assessment', 'performance_evaluation', 'custom') THEN
    RAISE EXCEPTION 'Valid category is required (bdr_criteria, coaching_framework, quality_assessment, performance_evaluation, custom)';
  END IF;

  IF p_scale_type IS NULL OR p_scale_type NOT IN ('0-4', '1-5', 'percentage', 'binary', 'custom') THEN
    RAISE EXCEPTION 'Valid scale_type is required (0-4, 1-5, percentage, binary, custom)';
  END IF;

  -- If setting as default, unset other defaults for this category
  IF p_is_default THEN
    UPDATE ai_scoring_rubrics
    SET is_default = false
    WHERE category = p_category AND is_default = true;
  END IF;

  -- Insert new scoring rubric
  INSERT INTO ai_scoring_rubrics (
    name,
    category,
    description,
    criteria,
    scale_type,
    scale_definition,
    is_active,
    is_default,
    usage_count,
    validation_rules,
    accuracy_metrics,
    version,
    tags,
    created_by
  ) VALUES (
    p_name,
    p_category,
    p_description,
    p_criteria,
    p_scale_type,
    p_scale_definition,
    p_is_active,
    p_is_default,
    0,
    p_validation_rules,
    '{}'::jsonb,
    1,
    p_tags,
    auth.uid()
  ) RETURNING id INTO new_rubric_id;

  RETURN new_rubric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update Scoring Rubric
-- ================================
CREATE OR REPLACE FUNCTION update_scoring_rubric(
  p_rubric_id UUID,
  p_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_criteria JSONB DEFAULT NULL,
  p_scale_type TEXT DEFAULT NULL,
  p_scale_definition JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_validation_rules JSONB DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_category TEXT;
  rubric_exists BOOLEAN := false;
BEGIN
  -- Check if rubric exists and get current category
  SELECT category INTO current_category
  FROM ai_scoring_rubrics
  WHERE id = p_rubric_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scoring rubric with id % not found', p_rubric_id;
  END IF;

  rubric_exists := true;

  -- Validate category if provided
  IF p_category IS NOT NULL AND p_category NOT IN ('bdr_criteria', 'coaching_framework', 'quality_assessment', 'performance_evaluation', 'custom') THEN
    RAISE EXCEPTION 'Valid category is required (bdr_criteria, coaching_framework, quality_assessment, performance_evaluation, custom)';
  END IF;

  -- Validate scale_type if provided
  IF p_scale_type IS NOT NULL AND p_scale_type NOT IN ('0-4', '1-5', 'percentage', 'binary', 'custom') THEN
    RAISE EXCEPTION 'Valid scale_type is required (0-4, 1-5, percentage, binary, custom)';
  END IF;

  -- If setting as default, unset other defaults for this category
  IF p_is_default IS TRUE THEN
    UPDATE ai_scoring_rubrics
    SET is_default = false
    WHERE category = COALESCE(p_category, current_category)
    AND is_default = true
    AND id != p_rubric_id;
  END IF;

  -- Update scoring rubric
  UPDATE ai_scoring_rubrics SET
    name = COALESCE(p_name, name),
    category = COALESCE(p_category, category),
    description = COALESCE(p_description, description),
    criteria = COALESCE(p_criteria, criteria),
    scale_type = COALESCE(p_scale_type, scale_type),
    scale_definition = COALESCE(p_scale_definition, scale_definition),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    validation_rules = COALESCE(p_validation_rules, validation_rules),
    tags = COALESCE(p_tags, tags),
    version = version + 1,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_rubric_id;

  RETURN rubric_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Delete Scoring Rubric
-- ================================
CREATE OR REPLACE FUNCTION delete_scoring_rubric(
  p_rubric_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rubric_exists BOOLEAN := false;
BEGIN
  -- Check if rubric exists
  SELECT true INTO rubric_exists
  FROM ai_scoring_rubrics
  WHERE id = p_rubric_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scoring rubric with id % not found', p_rubric_id;
  END IF;

  -- Delete the scoring rubric
  DELETE FROM ai_scoring_rubrics
  WHERE id = p_rubric_id;

  RETURN rubric_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Increment Rubric Usage Count
-- ================================
CREATE OR REPLACE FUNCTION increment_rubric_usage(
  p_rubric_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_scoring_rubrics SET
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = p_rubric_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Update Rubric Accuracy Metrics
-- ================================
CREATE OR REPLACE FUNCTION update_rubric_accuracy(
  p_rubric_id UUID,
  p_accuracy_metrics JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_scoring_rubrics SET
    accuracy_metrics = p_accuracy_metrics,
    updated_at = NOW()
  WHERE id = p_rubric_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Get Scoring Rubrics Stats
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
      COUNT(*) OVER (PARTITION BY category) as category_count,
      COUNT(*) OVER (PARTITION BY scale_type) as scale_count
    FROM ai_scoring_rubrics
  ) rubric_stats;

  RETURN COALESCE(stats_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Validate Rubric Criteria
-- ================================
CREATE OR REPLACE FUNCTION validate_rubric_criteria(
  p_criteria JSONB,
  p_scale_type TEXT DEFAULT '0-4'
)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  criteria_keys TEXT[];
  criterion_key TEXT;
  criterion_data JSONB;
  total_weight DECIMAL := 0;
  has_errors BOOLEAN := false;
  errors TEXT[] := '{}';
BEGIN
  -- Initialize validation result
  validation_result := jsonb_build_object(
    'valid', true,
    'errors', '[]'::jsonb,
    'warnings', '[]'::jsonb,
    'total_weight', 0
  );

  -- Get all criteria keys
  SELECT array_agg(key) INTO criteria_keys
  FROM jsonb_object_keys(p_criteria) key;

  -- Validate each criterion
  FOR criterion_key IN SELECT unnest(criteria_keys)
  LOOP
    criterion_data := p_criteria -> criterion_key;

    -- Check required fields
    IF NOT (criterion_data ? 'name') THEN
      errors := array_append(errors, format('Criterion "%s" missing required field: name', criterion_key));
      has_errors := true;
    END IF;

    IF NOT (criterion_data ? 'weight') THEN
      errors := array_append(errors, format('Criterion "%s" missing required field: weight', criterion_key));
      has_errors := true;
    ELSE
      -- Add to total weight
      total_weight := total_weight + COALESCE((criterion_data ->> 'weight')::DECIMAL, 0);
    END IF;

    IF NOT (criterion_data ? 'maxScore') THEN
      errors := array_append(errors, format('Criterion "%s" missing required field: maxScore', criterion_key));
      has_errors := true;
    END IF;
  END LOOP;

  -- Check total weight
  IF total_weight != 100 THEN
    errors := array_append(errors, format('Total weight must equal 100, got %s', total_weight));
    has_errors := true;
  END IF;

  -- Update validation result
  validation_result := jsonb_build_object(
    'valid', NOT has_errors,
    'errors', to_jsonb(errors),
    'warnings', '[]'::jsonb,
    'total_weight', total_weight,
    'criteria_count', array_length(criteria_keys, 1)
  );

  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Grant Permissions
-- ================================
GRANT EXECUTE ON FUNCTION get_scoring_rubrics(TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_scoring_rubric_by_id(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_scoring_rubric(TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, BOOLEAN, BOOLEAN, JSONB, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_scoring_rubric(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, BOOLEAN, BOOLEAN, JSONB, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_scoring_rubric(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_rubric_usage(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_rubric_accuracy(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_scoring_rubrics_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_rubric_criteria(JSONB, TEXT) TO authenticated, service_role;

-- ================================
-- Comments for Documentation
-- ================================
COMMENT ON FUNCTION get_scoring_rubrics IS 'Retrieve AI scoring rubrics with optional filtering by category and status';
COMMENT ON FUNCTION get_scoring_rubric_by_id IS 'Get a specific AI scoring rubric by ID';
COMMENT ON FUNCTION create_scoring_rubric IS 'Create a new AI scoring rubric with validation';
COMMENT ON FUNCTION update_scoring_rubric IS 'Update an existing AI scoring rubric';
COMMENT ON FUNCTION delete_scoring_rubric IS 'Delete an AI scoring rubric by ID';
COMMENT ON FUNCTION increment_rubric_usage IS 'Increment usage statistics for a scoring rubric';
COMMENT ON FUNCTION update_rubric_accuracy IS 'Update accuracy metrics for a scoring rubric';
COMMENT ON FUNCTION get_scoring_rubrics_stats IS 'Get aggregate statistics for all scoring rubrics';
COMMENT ON FUNCTION validate_rubric_criteria IS 'Validate scoring rubric criteria structure and weights';