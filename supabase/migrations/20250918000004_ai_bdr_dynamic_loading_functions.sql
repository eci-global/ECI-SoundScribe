-- AI BDR Dynamic Loading Functions
-- Created: 2025-09-18
-- Purpose: Database functions for loading BDR criteria and prompts dynamically from AI Control Center

-- =========================================
-- BDR CRITERIA MANAGEMENT FUNCTIONS
-- =========================================

-- Function to get BDR training program criteria with prompts
CREATE OR REPLACE FUNCTION get_bdr_training_criteria(
  p_training_program_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id TEXT,
  name TEXT,
  description TEXT,
  weight DECIMAL,
  max_score INTEGER,
  passing_score INTEGER,
  scoring_guidelines JSONB,
  evaluation_prompts JSONB,
  program_id UUID,
  program_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_program_id UUID;
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  -- If no specific program ID provided, get the active one
  IF p_training_program_id IS NULL THEN
    SELECT tp.id INTO active_program_id
    FROM bdr_training_programs tp
    WHERE tp.is_active = true
    ORDER BY tp.created_at DESC
    LIMIT 1;
  ELSE
    active_program_id := p_training_program_id;
  END IF;

  -- Return criteria with associated prompts from AI prompt templates
  RETURN QUERY
  WITH criteria_data AS (
    SELECT
      tp.id as program_id,
      tp.name as program_name,
      jsonb_array_elements(tp.scorecard_criteria) as criterion
    FROM bdr_training_programs tp
    WHERE tp.id = active_program_id
    AND tp.is_active = true
  ),
  criteria_with_prompts AS (
    SELECT
      cd.program_id,
      cd.program_name,
      (cd.criterion ->> 'id')::TEXT as criterion_id,
      (cd.criterion ->> 'name')::TEXT as criterion_name,
      (cd.criterion ->> 'description')::TEXT as criterion_description,
      COALESCE((cd.criterion ->> 'weight')::DECIMAL, 12.5) as criterion_weight,
      COALESCE((cd.criterion ->> 'maxScore')::INTEGER, 4) as criterion_max_score,
      COALESCE((cd.criterion ->> 'passingScore')::INTEGER, 2) as criterion_passing_score,
      COALESCE(cd.criterion -> 'scoringGuidelines', '{}'::JSONB) as criterion_scoring_guidelines,
      -- Get associated prompts from ai_prompt_templates
      COALESCE(
        (
          SELECT jsonb_build_object(
            'analysisPrompt', apt1.template,
            'scoringPrompt', apt2.template,
            'feedbackPrompt', apt3.template,
            'managerCalibrationPrompt', apt4.template
          )
          FROM ai_prompt_templates apt1
          LEFT JOIN ai_prompt_templates apt2 ON apt2.category = 'bdr_scoring'
            AND apt2.name ILIKE '%' || (cd.criterion ->> 'id') || '%scoring%'
          LEFT JOIN ai_prompt_templates apt3 ON apt3.category = 'bdr_feedback'
            AND apt3.name ILIKE '%' || (cd.criterion ->> 'id') || '%feedback%'
          LEFT JOIN ai_prompt_templates apt4 ON apt4.category = 'bdr_calibration'
            AND apt4.name ILIKE '%' || (cd.criterion ->> 'id') || '%calibration%'
          WHERE apt1.category = 'bdr_analysis'
          AND apt1.name ILIKE '%' || (cd.criterion ->> 'id') || '%analysis%'
          AND apt1.is_active = true
          LIMIT 1
        ),
        -- Fallback to default prompts if no templates found
        jsonb_build_object(
          'analysisPrompt', format('Analyze the %s aspect of this BDR call based on the criteria: %s',
            cd.criterion ->> 'name', cd.criterion ->> 'description'),
          'scoringPrompt', format('Rate the %s on a 0-%s scale where: %s',
            cd.criterion ->> 'name',
            COALESCE((cd.criterion ->> 'maxScore')::TEXT, '4'),
            (cd.criterion -> 'scoringGuidelines' -> 'excellent' ->> 'description')),
          'feedbackPrompt', format('Provide specific feedback on %s performance with actionable improvement suggestions.',
            cd.criterion ->> 'name'),
          'managerCalibrationPrompt', format('As an expert BDR manager, evaluate %s and provide calibration guidance for AI scoring accuracy.',
            cd.criterion ->> 'name')
        )
      ) as criterion_evaluation_prompts
    FROM criteria_data cd
  )
  SELECT
    cwp.criterion_id,
    cwp.criterion_name,
    cwp.criterion_description,
    cwp.criterion_weight,
    cwp.criterion_max_score,
    cwp.criterion_passing_score,
    cwp.criterion_scoring_guidelines,
    cwp.criterion_evaluation_prompts,
    cwp.program_id,
    cwp.program_name
  FROM criteria_with_prompts cwp
  ORDER BY cwp.criterion_id;
END;
$$;

-- Function to get dynamic system prompts for BDR evaluation
CREATE OR REPLACE FUNCTION get_bdr_evaluation_system_prompts()
RETURNS TABLE(
  prompt_type TEXT,
  prompt_content TEXT,
  variables JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  -- Return system prompts from ai_prompt_templates
  RETURN QUERY
  SELECT
    CASE apt.name
      WHEN 'bdr_system_evaluation' THEN 'system_evaluation'
      WHEN 'bdr_overall_scoring' THEN 'overall_scoring'
      WHEN 'bdr_coaching_generation' THEN 'coaching_generation'
      WHEN 'bdr_manager_training_calibration' THEN 'manager_calibration'
      ELSE apt.name
    END as prompt_type,
    apt.template,
    COALESCE(apt.variables, '[]'::JSONB)
  FROM ai_prompt_templates apt
  WHERE apt.category = 'bdr_evaluation'
  AND apt.is_active = true
  ORDER BY apt.created_at;
END;
$$;

-- Function to render BDR prompt with variables
CREATE OR REPLACE FUNCTION render_bdr_prompt(
  p_prompt_template TEXT,
  p_variables JSONB DEFAULT '{}'::JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rendered_prompt TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Start with the template
  rendered_prompt := p_prompt_template;

  -- Replace variables in the format {{variable_name}}
  FOR var_key IN SELECT jsonb_object_keys(p_variables)
  LOOP
    var_value := p_variables ->> var_key;
    rendered_prompt := replace(rendered_prompt, '{{' || var_key || '}}', COALESCE(var_value, ''));
  END LOOP;

  RETURN rendered_prompt;
END;
$$;

-- Function to get BDR evaluation context for manager training
CREATE OR REPLACE FUNCTION get_bdr_manager_training_context(
  p_training_program_id UUID
)
RETURNS TABLE(
  calibration_examples JSONB,
  scoring_standards JSONB,
  common_patterns JSONB,
  training_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate admin access
  PERFORM validate_admin_api_access('admin');

  -- Return training context from BDR training datasets
  RETURN QUERY
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'transcript_sample', btd.transcript_sample,
        'manager_scores', btd.manager_evaluation,
        'ai_scores', btd.ai_evaluation,
        'alignment_notes', btd.training_notes
      )
    ) FILTER (WHERE btd.is_calibration_example = true) as calibration_examples,

    -- Get scoring standards from the training program
    jsonb_build_object(
      'target_alignment_threshold', tp.target_score_threshold,
      'minimum_calls_required', tp.minimum_calls_required,
      'scoring_scale', jsonb_build_object(
        'min', 0,
        'max', 4,
        'passing', 2.5
      )
    ) as scoring_standards,

    -- Common patterns from successful training
    jsonb_build_object(
      'high_performing_patterns', (
        SELECT jsonb_agg(DISTINCT pattern_data)
        FROM (
          SELECT jsonb_array_elements_text(btd.identified_patterns) as pattern_data
          FROM bdr_training_datasets btd2
          WHERE btd2.training_program_id = p_training_program_id
          AND (btd2.manager_evaluation -> 'overall_score')::DECIMAL >= 3.0
        ) patterns
      ),
      'improvement_areas', (
        SELECT jsonb_agg(DISTINCT improvement_area)
        FROM (
          SELECT jsonb_array_elements_text(btd.improvement_areas) as improvement_area
          FROM bdr_training_datasets btd3
          WHERE btd3.training_program_id = p_training_program_id
          AND (btd3.manager_evaluation -> 'overall_score')::DECIMAL < 2.5
        ) improvements
      )
    ) as common_patterns,

    tp.description as training_notes

  FROM bdr_training_programs tp
  LEFT JOIN bdr_training_datasets btd ON btd.training_program_id = tp.id
  WHERE tp.id = p_training_program_id
  AND tp.is_active = true
  GROUP BY tp.id, tp.description, tp.target_score_threshold, tp.minimum_calls_required;
END;
$$;

-- =========================================
-- BDR PROMPT TEMPLATE SEED DATA
-- =========================================

-- Insert default BDR prompt templates if they don't exist
INSERT INTO ai_prompt_templates (name, category, description, template, variables, is_active)
VALUES
-- System evaluation prompt
(
  'bdr_system_evaluation',
  'bdr_evaluation',
  'Main system prompt for BDR call evaluation',
  'You are an expert Business Development Representative (BDR) coach and evaluator. Your role is to analyze sales calls and provide accurate scoring based on established BDR criteria.

**Your Expertise:**
- 10+ years of BDR coaching and sales management experience
- Deep understanding of modern sales methodologies and best practices
- Proven track record of developing high-performing BDR teams
- Expert in objection handling, prospecting techniques, and sales communication

**Evaluation Standards:**
- Use the 0-4 scoring scale consistently: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class
- Base scores on observable behaviors and measurable outcomes in the transcript
- Provide specific, actionable feedback tied to concrete examples from the call
- Consider the context of the call type, prospect engagement, and call objectives

**Manager Training Calibration:**
{{manager_training_context}}

**Key Principles:**
1. **Accuracy First**: Your scores should align with expert manager evaluations within ±0.5 points
2. **Evidence-Based**: Every score must be supported by specific transcript examples
3. **Developmental Focus**: Feedback should help the BDR improve performance
4. **Consistency**: Apply the same standards across all evaluations',
  '[{"name": "manager_training_context", "description": "Manager training examples and calibration data", "type": "text"}]'::JSONB,
  true
),

-- Overall scoring prompt
(
  'bdr_overall_scoring',
  'bdr_evaluation',
  'Prompt for calculating overall BDR scores and coaching recommendations',
  'Based on your evaluation of each criterion, calculate the overall score and provide comprehensive coaching recommendations.

**Overall Score Calculation:**
- Weighted average of all criteria scores
- Each criterion contributes according to its weight percentage
- Round to one decimal place (e.g., 3.2, 2.7)

**Coaching Recommendations Structure:**
1. **Strengths**: Top 2-3 areas where the BDR performed well
2. **Priority Improvements**: 1-2 most critical areas for development
3. **Specific Actions**: Concrete steps the BDR should take
4. **Manager Follow-up**: Recommended coaching activities

**Quality Standards:**
- Overall score should reflect the weighted criteria performance
- Coaching should be actionable and specific to this call
- Recommendations should prioritize highest-impact improvements
- Feedback should be encouraging while identifying clear development areas

**Training Program Alignment:**
Target Score Threshold: {{target_score_threshold}}
Minimum Passing Score: {{minimum_passing_score}}

Ensure your evaluation supports BDR development toward these program standards.',
  '[{"name": "target_score_threshold", "description": "Training program target score", "type": "number"}, {"name": "minimum_passing_score", "description": "Minimum score to pass evaluation", "type": "number"}]'::JSONB,
  true
),

-- Manager calibration prompt
(
  'bdr_manager_training_calibration',
  'bdr_evaluation',
  'Prompt for incorporating manager training data into AI evaluations',
  'Incorporate manager training calibration to ensure your evaluations align with expert human judgment.

**Calibration Examples:**
{{calibration_examples}}

**Scoring Alignment Standards:**
- Target alignment: Within ±0.5 points of manager scores
- Focus on manager feedback patterns and scoring rationale
- Adapt evaluation approach based on successful manager examples
- Learn from manager corrections and adjustments

**Key Calibration Insights:**
{{scoring_standards}}

**Pattern Recognition:**
Apply these proven patterns from manager evaluations:
{{common_patterns}}

**Calibration Process:**
1. Review manager examples for similar call types and scenarios
2. Apply consistent scoring standards demonstrated by managers
3. Focus on behaviors and outcomes that managers consistently reward or penalize
4. Adjust scoring thresholds based on manager training data

Remember: Your goal is to evaluate calls as an experienced BDR manager would, using the same judgment and standards.',
  '[{"name": "calibration_examples", "description": "Manager scoring examples for training", "type": "array"}, {"name": "scoring_standards", "description": "Scoring standards from training program", "type": "object"}, {"name": "common_patterns", "description": "Patterns from manager evaluations", "type": "object"}]'::JSONB,
  true
)
ON CONFLICT (name, category) DO UPDATE SET
  template = EXCLUDED.template,
  variables = EXCLUDED.variables,
  updated_at = now();

-- =========================================
-- SECURITY AND PERMISSIONS
-- =========================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_bdr_training_criteria TO authenticated;
GRANT EXECUTE ON FUNCTION get_bdr_evaluation_system_prompts TO authenticated;
GRANT EXECUTE ON FUNCTION render_bdr_prompt TO authenticated;
GRANT EXECUTE ON FUNCTION get_bdr_manager_training_context TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_bdr_training_criteria(UUID) IS 'Loads BDR training criteria and associated prompts dynamically from database';
COMMENT ON FUNCTION get_bdr_evaluation_system_prompts() IS 'Retrieves system-level prompts for BDR evaluation processing';
COMMENT ON FUNCTION render_bdr_prompt(TEXT, JSONB) IS 'Renders prompt templates with variable substitution for BDR evaluations';
COMMENT ON FUNCTION get_bdr_manager_training_context(UUID) IS 'Gets manager training context for AI scoring calibration';

-- Log implementation
INSERT INTO ai_configuration_history (
  table_name,
  record_id,
  operation,
  changed_by,
  old_values,
  new_values
) VALUES (
  'bdr_dynamic_loading',
  gen_random_uuid(),
  'INSERT',
  NULL, -- System operation (no specific user)
  NULL,
  jsonb_build_object(
    'description', 'BDR dynamic loading functions implemented for AI Control Center',
    'functions_created', array[
      'get_bdr_training_criteria',
      'get_bdr_evaluation_system_prompts',
      'render_bdr_prompt',
      'get_bdr_manager_training_context'
    ],
    'prompt_templates_seeded', array[
      'bdr_system_evaluation',
      'bdr_overall_scoring',
      'bdr_manager_training_calibration'
    ],
    'timestamp', now()
  )
);