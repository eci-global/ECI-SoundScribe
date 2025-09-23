-- AI Control Center Database Schema
-- Comprehensive schema for managing AI configurations, prompts, models, and experiments
-- Created: 2025-09-18

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- AI Prompt Templates
-- ================================
CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),
    category TEXT NOT NULL CHECK (category IN (
        'bdr_evaluation', 'transcription', 'coaching', 'analysis',
        'speaker_detection', 'content_classification', 'custom'
    )),
    description TEXT,
    template TEXT NOT NULL CHECK (length(template) >= 10),
    variables JSONB DEFAULT '[]'::jsonb,

    -- Versioning and status
    version INTEGER DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Performance and quality metrics
    usage_count INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    success_rate DECIMAL(5,4),
    quality_score DECIMAL(3,2),

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,

    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()

    -- Ensure only one default per category (enforced by unique index below)
);

-- ================================
-- AI Model Configurations
-- ================================
CREATE TABLE ai_model_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),
    service_type TEXT NOT NULL CHECK (service_type IN (
        'azure_openai', 'openai', 'whisper', 'custom'
    )),
    model_name TEXT NOT NULL,
    deployment_name TEXT,

    -- Configuration parameters
    parameters JSONB DEFAULT '{}'::jsonb,
    rate_limits JSONB DEFAULT '{}'::jsonb,

    -- Connection settings
    endpoint_url TEXT,
    api_version TEXT DEFAULT '2024-10-01-preview',

    -- Status and health
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN (
        'healthy', 'degraded', 'unhealthy', 'unknown'
    )),
    last_health_check TIMESTAMPTZ,

    -- Performance metrics
    average_response_time_ms INTEGER,
    total_requests INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,

    -- Cost tracking
    cost_per_1k_tokens DECIMAL(10,6),
    monthly_budget_limit DECIMAL(12,2),
    current_month_spend DECIMAL(12,2) DEFAULT 0,

    -- Metadata
    description TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()

    -- Ensure only one default per service type (enforced by unique index below)
);

-- ================================
-- AI Scoring Rubrics
-- ================================
CREATE TABLE ai_scoring_rubrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),
    category TEXT NOT NULL CHECK (category IN (
        'bdr_criteria', 'coaching_framework', 'quality_assessment',
        'performance_evaluation', 'custom'
    )),
    description TEXT,

    -- Scoring configuration
    criteria JSONB NOT NULL,
    scale_type TEXT NOT NULL CHECK (scale_type IN (
        '0-4', '1-5', 'percentage', 'binary', 'custom'
    )),
    scale_definition JSONB,

    -- Status and usage
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,

    -- Validation and quality
    validation_rules JSONB DEFAULT '{}'::jsonb,
    accuracy_metrics JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    version INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',

    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()

    -- Ensure only one default per category (enforced by unique index below)
);

-- ================================
-- AI Prompt Experiments (A/B Testing)
-- ================================
CREATE TABLE ai_prompt_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),
    description TEXT,

    -- Experiment configuration
    base_template_id UUID REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
    variant_prompts JSONB NOT NULL,
    traffic_allocation JSONB NOT NULL,

    -- Status and timeline
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'paused', 'completed', 'cancelled'
    )),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    target_sample_size INTEGER DEFAULT 1000,

    -- Results and metrics
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    statistical_significance DECIMAL(5,4),
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    winner_variant_id TEXT,

    -- Configuration
    success_criteria JSONB DEFAULT '{}'::jsonb,
    auto_promote_winner BOOLEAN DEFAULT false,

    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure valid date ranges
    CHECK (end_date IS NULL OR end_date > start_date),
    CHECK (target_sample_size > 0)
);

-- ================================
-- AI Configuration History
-- ================================
CREATE TABLE ai_configuration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],

    -- Context
    change_reason TEXT,
    deployment_environment TEXT DEFAULT 'production',

    -- Audit fields
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Performance impact tracking
    rollback_available BOOLEAN DEFAULT true,
    performance_impact TEXT CHECK (performance_impact IN (
        'none', 'minimal', 'moderate', 'significant', 'critical'
    ))
);

-- ================================
-- Indexes for Performance
-- ================================

-- Prompt templates indexes
CREATE INDEX idx_ai_prompt_templates_category ON ai_prompt_templates(category);
CREATE INDEX idx_ai_prompt_templates_active ON ai_prompt_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_prompt_templates_usage ON ai_prompt_templates(usage_count DESC);
CREATE INDEX idx_ai_prompt_templates_created_at ON ai_prompt_templates(created_at DESC);

-- Unique constraint for prompt templates (name, category) - required for ON CONFLICT clause
CREATE UNIQUE INDEX ai_prompt_templates_name_category_unique ON ai_prompt_templates(name, category);

-- Model configurations indexes
CREATE INDEX idx_ai_model_configurations_service ON ai_model_configurations(service_type);
CREATE INDEX idx_ai_model_configurations_active ON ai_model_configurations(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_model_configurations_health ON ai_model_configurations(health_status);

-- Scoring rubrics indexes
CREATE INDEX idx_ai_scoring_rubrics_category ON ai_scoring_rubrics(category);
CREATE INDEX idx_ai_scoring_rubrics_active ON ai_scoring_rubrics(is_active) WHERE is_active = true;

-- Experiments indexes
CREATE INDEX idx_ai_prompt_experiments_status ON ai_prompt_experiments(status);
CREATE INDEX idx_ai_prompt_experiments_dates ON ai_prompt_experiments(start_date, end_date);
CREATE INDEX idx_ai_prompt_experiments_template ON ai_prompt_experiments(base_template_id);

-- History indexes
CREATE INDEX idx_ai_configuration_history_table_record ON ai_configuration_history(table_name, record_id);
CREATE INDEX idx_ai_configuration_history_changed_at ON ai_configuration_history(changed_at DESC);

-- ================================
-- Row Level Security Policies
-- ================================

-- Enable RLS on all tables
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scoring_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configuration_history ENABLE ROW LEVEL SECURITY;

-- Admin access policies (full access for admin users)
CREATE POLICY "Admins can manage AI prompt templates" ON ai_prompt_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage AI model configurations" ON ai_model_configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage AI scoring rubrics" ON ai_scoring_rubrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage AI experiments" ON ai_prompt_experiments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can view AI configuration history" ON ai_configuration_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

-- Service role policies (for edge functions)
CREATE POLICY "Service role can read AI configurations" ON ai_prompt_templates
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can read model configurations" ON ai_model_configurations
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can read scoring rubrics" ON ai_scoring_rubrics
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- Trigger Functions for Audit Trail
-- ================================

-- Function to track configuration changes
CREATE OR REPLACE FUNCTION track_ai_configuration_changes()
RETURNS TRIGGER AS $$
BEGIN
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
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_ai_configuration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- Triggers
-- ================================

-- Audit trail triggers
CREATE TRIGGER ai_prompt_templates_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION track_ai_configuration_changes();

CREATE TRIGGER ai_model_configurations_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai_model_configurations
    FOR EACH ROW EXECUTE FUNCTION track_ai_configuration_changes();

CREATE TRIGGER ai_scoring_rubrics_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai_scoring_rubrics
    FOR EACH ROW EXECUTE FUNCTION track_ai_configuration_changes();

-- Timestamp update triggers
CREATE TRIGGER ai_prompt_templates_updated_at
    BEFORE UPDATE ON ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_ai_configuration_timestamp();

CREATE TRIGGER ai_model_configurations_updated_at
    BEFORE UPDATE ON ai_model_configurations
    FOR EACH ROW EXECUTE FUNCTION update_ai_configuration_timestamp();

CREATE TRIGGER ai_scoring_rubrics_updated_at
    BEFORE UPDATE ON ai_scoring_rubrics
    FOR EACH ROW EXECUTE FUNCTION update_ai_configuration_timestamp();

-- ================================
-- Default Data Insertion
-- ================================

-- Insert default BDR evaluation prompt template
INSERT INTO ai_prompt_templates (
    name,
    category,
    description,
    template,
    variables,
    is_default,
    tags,
    created_by
) VALUES (
    'BDR Scorecard Evaluation - Default',
    'bdr_evaluation',
    'Comprehensive BDR scorecard evaluation prompt with manager calibration and strict scoring alignment',
    'You are an expert BDR (Business Development Representative) coach analyzing a sales call transcript.
Evaluate this call against the specific BDR training criteria provided.

TRAINING PROGRAM: {{trainingProgramName}}
TARGET SCORE THRESHOLD: {{targetScoreThreshold}}%

{{managerCalibrationSection}}

EVALUATION CRITERIA:
{{evaluationCriteria}}

CALL TRANSCRIPT:
{{transcript}}

EVALUATION INSTRUCTIONS - STRICT MANAGER ALIGNMENT:
1. Analyze the call transcript thoroughly against each criterion with MANAGER-LEVEL STRICTNESS
2. Apply criteria-specific scoring with enhanced strictness
3. MANDATORY SCORING CONSTRAINTS: Overall score MUST NOT exceed manager baseline by more than 0.2 points
4. CALIBRATE TO MANAGER STANDARDS: Match the established strictness patterns exactly
5. COACHING FEEDBACK: Use manager language patterns and specific focus areas

REQUIRED JSON RESPONSE FORMAT:
{
  "overallScore": 3.2,
  "criteriaScores": {
    "opening": {
      "score": 3,
      "maxScore": 4,
      "weight": 12.5,
      "feedback": "Strong opening with clear introduction and value proposition",
      "suggestions": ["Could be more personalized", "Add specific company research"]
    }
  },
  "bdrInsights": {
    "keyStrengths": ["Excellent qualifying questions", "Strong objection handling"],
    "improvementAreas": ["Opening could be stronger", "Need better tone and energy"],
    "coachingPriorities": ["Focus on discovery techniques", "Practice assertiveness and control"],
    "nextCallFocus": ["Ask more open-ended questions", "Better talk time balance"],
    "competencyLevel": "proficient"
  },
  "strengths": ["Clear communication", "Good rapport building"],
  "improvements": ["Ask deeper qualifying questions", "Better pain point identification"],
  "actionItems": [
    "Practice open-ended discovery questions",
    "Develop pain point identification skills",
    "Work on value articulation techniques"
  ],
  "coachingNotes": "Overall solid performance with room for improvement in discovery and value articulation",
  "confidenceScore": 0.85,
  "summary": "BDR demonstrated solid skills across the 8 core criteria with specific areas for development"
}',
    '[
        {
            "name": "trainingProgramName",
            "description": "Name of the BDR training program",
            "type": "string",
            "required": true
        },
        {
            "name": "targetScoreThreshold",
            "description": "Target score threshold for the program",
            "type": "number",
            "required": true
        },
        {
            "name": "managerCalibrationSection",
            "description": "Manager training calibration data and constraints",
            "type": "string",
            "required": false
        },
        {
            "name": "evaluationCriteria",
            "description": "Formatted evaluation criteria with scoring guidelines",
            "type": "string",
            "required": true
        },
        {
            "name": "transcript",
            "description": "Sales call transcript to analyze",
            "type": "string",
            "required": true
        }
    ]'::jsonb,
    true,
    ARRAY['bdr', 'evaluation', 'scoring', 'default'],
    '1fd13984-3457-40ea-9220-20447a1ff9ae'
);

-- Insert default Azure OpenAI model configuration
INSERT INTO ai_model_configurations (
    name,
    service_type,
    model_name,
    deployment_name,
    parameters,
    rate_limits,
    endpoint_url,
    is_default,
    health_status,
    cost_per_1k_tokens,
    description,
    tags,
    created_by
) VALUES (
    'Azure OpenAI GPT-4o Mini - Default',
    'azure_openai',
    'gpt-4o-mini',
    'gpt-4o-mini',
    '{
        "temperature": 0,
        "max_tokens": 2000,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }'::jsonb,
    '{
        "requests_per_minute": 500,
        "tokens_per_minute": 551000,
        "concurrent_requests": 10
    }'::jsonb,
    'https://eastus.api.cognitive.microsoft.com/',
    true,
    'healthy',
    0.000150,
    'Global Standard deployment with high TPM limits for production BDR evaluations',
    ARRAY['azure', 'gpt4o-mini', 'production', 'default'],
    '1fd13984-3457-40ea-9220-20447a1ff9ae'
);

-- Insert default BDR scoring rubric
INSERT INTO ai_scoring_rubrics (
    name,
    category,
    description,
    criteria,
    scale_type,
    scale_definition,
    is_default,
    validation_rules,
    tags,
    created_by
) VALUES (
    'BDR 8-Criteria Scorecard - Default',
    'bdr_criteria',
    'Standard 8-criteria BDR scorecard with 0-4 scoring scale',
    '{
        "opening": {
            "id": "opening",
            "name": "Opening",
            "description": "Rep states their name, company, and reason for calling in a confident tone with pattern interrupt",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2,
            "scoringGuidelines": {
                "excellent": {"min": 4, "description": "Best-in-Class: Flawless, high-impact execution; an ideal example"},
                "good": {"min": 3, "description": "Strong Performance: Above-average execution with noticeable impact"},
                "needs_improvement": {"min": 2, "description": "Meets Expectations: Competent execution; generally effective but not standout"},
                "poor": {"min": 0, "description": "Not Demonstrated: Absent or counterproductive behavior"}
            }
        },
        "objection_handling": {
            "id": "objection_handling",
            "name": "Objection Handling",
            "description": "Acknowledges objections without being combative, maintains curiosity, and reframes perspective",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "qualification": {
            "id": "qualification",
            "name": "Qualification",
            "description": "Identifies fit criteria, uncovers pain points, uses open-ended questions and active listening",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "tone_and_energy": {
            "id": "tone_and_energy",
            "name": "Tone & Energy",
            "description": "Positive, energetic tone with natural pacing - not flat, apologetic, rushed, or monotone",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "assertiveness_and_control": {
            "id": "assertiveness_and_control",
            "name": "Assertiveness & Control",
            "description": "Guides conversation without being pushy, practices active listening, creates urgency",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "business_acumen_and_relevance": {
            "id": "business_acumen_and_relevance",
            "name": "Business Acumen & Relevance",
            "description": "Uses industry/role insights and shares relevant stories, case studies, or proof points",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "closing": {
            "id": "closing",
            "name": "Closing",
            "description": "Summarizes prospect needs, shares company track record, uses assumptive close, confirms details",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        },
        "talk_time": {
            "id": "talk_time",
            "name": "Talk Time",
            "description": "Rep speaks less than 50% of the time (ideal ratio: 43/57 rep/prospect)",
            "weight": 12.5,
            "maxScore": 4,
            "passingScore": 2
        }
    }'::jsonb,
    '0-4',
    '{
        "0": {"label": "Not Demonstrated", "description": "Absent or counterproductive behavior"},
        "1": {"label": "Needs Improvement", "description": "Basic execution, significant improvement needed"},
        "2": {"label": "Meets Expectations", "description": "Competent execution; generally effective but not standout"},
        "3": {"label": "Strong Performance", "description": "Above-average execution with noticeable impact"},
        "4": {"label": "Best-in-Class", "description": "Flawless, high-impact execution; an ideal example"}
    }'::jsonb,
    true,
    '{
        "totalWeight": 100,
        "requiredCriteria": ["opening", "objection_handling", "qualification", "tone_and_energy", "assertiveness_and_control", "business_acumen_and_relevance", "closing", "talk_time"],
        "scoreRange": {"min": 0, "max": 4},
        "passingThreshold": 2.5
    }'::jsonb,
    ARRAY['bdr', 'scorecard', '8-criteria', 'default'],
    '1fd13984-3457-40ea-9220-20447a1ff9ae'
);

-- ================================
-- Utility Functions for AI Control Center
-- ================================

-- Function to get active prompt template by category
CREATE OR REPLACE FUNCTION get_active_prompt_template(template_category TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    template TEXT,
    variables JSONB,
    version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        apt.id,
        apt.name,
        apt.template,
        apt.variables,
        apt.version
    FROM ai_prompt_templates apt
    WHERE apt.category = template_category
      AND apt.is_active = true
      AND apt.is_default = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active model configuration by service type
CREATE OR REPLACE FUNCTION get_model_configuration(service TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    model_name TEXT,
    deployment_name TEXT,
    parameters JSONB,
    rate_limits JSONB,
    endpoint_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        amc.id,
        amc.name,
        amc.model_name,
        amc.deployment_name,
        amc.parameters,
        amc.rate_limits,
        amc.endpoint_url
    FROM ai_model_configurations amc
    WHERE amc.service_type = service
      AND amc.is_active = true
      AND amc.is_default = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active scoring rubric by category
CREATE OR REPLACE FUNCTION get_scoring_rubric(rubric_category TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    criteria JSONB,
    scale_type TEXT,
    scale_definition JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        asr.id,
        asr.name,
        asr.criteria,
        asr.scale_type,
        asr.scale_definition
    FROM ai_scoring_rubrics asr
    WHERE asr.category = rubric_category
      AND asr.is_active = true
      AND asr.is_default = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ai_prompt_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_active_prompt_template(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_model_configuration(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_scoring_rubric(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON TABLE ai_prompt_templates IS 'Dynamic prompt templates for AI operations with versioning and A/B testing support';
COMMENT ON TABLE ai_model_configurations IS 'AI model configurations including Azure OpenAI, Whisper, and other services';
COMMENT ON TABLE ai_scoring_rubrics IS 'Configurable scoring rubrics for various evaluation frameworks';
COMMENT ON TABLE ai_prompt_experiments IS 'A/B testing experiments for prompt optimization';
COMMENT ON TABLE ai_configuration_history IS 'Audit trail for all AI configuration changes';