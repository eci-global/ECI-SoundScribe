-- Add Missing BDR Coaching Generation Prompt
-- Fixes: The get_bdr_evaluation_system_prompts function expects 4 prompts but only 3 were inserted
-- Created: 2025-09-18

-- Insert the missing bdr_coaching_generation prompt
INSERT INTO ai_prompt_templates (name, category, description, template, variables, is_active)
VALUES
(
  'bdr_coaching_generation',
  'bdr_evaluation',
  'Prompt for generating personalized coaching feedback for BDR calls',
  'Generate comprehensive, actionable coaching feedback for the BDR based on the evaluation results.

**Coaching Principles:**
- Focus on 2-3 highest-impact improvement areas
- Provide specific, observable behaviors to change
- Include positive reinforcement for strengths demonstrated
- Make recommendations practical and achievable

**Feedback Structure:**
1. **Call Performance Summary**: Brief overview of strengths and areas for development
2. **Key Strengths**: Specific behaviors to continue and build upon
3. **Priority Development Areas**: Most critical skills to improve
4. **Action Steps**: Concrete next steps for improvement
5. **Practice Recommendations**: Specific exercises or techniques to work on

**Tone and Approach:**
- Encouraging and developmental, not critical
- Specific examples from the transcript
- Balanced feedback highlighting both strengths and opportunities
- Forward-looking with clear improvement path

**Training Alignment:**
Current Program: {{training_program_name}}
Target Score: {{target_score_threshold}}
Manager Notes: {{manager_feedback}}

Ensure coaching supports the BDR''s development within their training program objectives.',
  '[{"name": "training_program_name", "description": "Name of the current BDR training program", "type": "text"}, {"name": "target_score_threshold", "description": "Target score for the training program", "type": "number"}, {"name": "manager_feedback", "description": "Additional manager feedback to incorporate", "type": "text"}]'::JSONB,
  true
)
ON CONFLICT (name, category) DO UPDATE SET
  template = EXCLUDED.template,
  variables = EXCLUDED.variables,
  updated_at = now();

-- Update the log to include the new prompt
UPDATE ai_configuration_history
SET new_values = jsonb_set(
  new_values,
  '{prompt_templates_seeded}',
  (new_values->'prompt_templates_seeded')::jsonb || '["bdr_coaching_generation"]'::jsonb
)
WHERE table_name = 'bdr_dynamic_loading' AND operation = 'INSERT';

-- Add comment for documentation
COMMENT ON TABLE ai_prompt_templates IS 'Stores dynamic AI prompt templates for BDR evaluation system - now includes all 4 expected prompts: bdr_system_evaluation, bdr_overall_scoring, bdr_coaching_generation, bdr_manager_training_calibration';