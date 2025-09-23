-- Create AI Experiments Table
-- This provides a more general A/B testing framework beyond just prompt experiments
-- Created: 2025-09-18

-- ================================
-- AI Experiments (General A/B Testing Framework)
-- ================================
CREATE TABLE ai_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 200),
    description TEXT,
    experiment_type TEXT NOT NULL CHECK (experiment_type IN (
        'prompt_optimization', 'model_comparison', 'parameter_tuning',
        'response_format', 'custom'
    )),

    -- Status and lifecycle
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'running', 'completed', 'paused', 'archived', 'promoting'
    )),

    -- Configuration variants
    config_a JSONB NOT NULL,
    config_b JSONB NOT NULL,
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 1 AND 99),

    -- Timeline and targets
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    sample_size INTEGER DEFAULT 1000 CHECK (sample_size > 0),
    current_participants INTEGER DEFAULT 0,

    -- Metrics and analysis
    success_metric TEXT DEFAULT 'accuracy',
    statistical_significance NUMERIC(5,4) DEFAULT 0,
    confidence_level NUMERIC(3,2) DEFAULT 0.95 CHECK (confidence_level BETWEEN 0.8 AND 0.99),
    results JSONB DEFAULT '{}'::jsonb,
    winner TEXT CHECK (winner IN ('A', 'B', 'inconclusive')),

    -- Configuration options
    auto_promote BOOLEAN DEFAULT false,
    hypothesis TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Audit fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CHECK (end_date IS NULL OR end_date > start_date)
);

-- ================================
-- AI Experiment Participants
-- ================================
CREATE TABLE ai_experiment_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ai_experiments(id) ON DELETE CASCADE,
    variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- Indexes for Performance
-- ================================
CREATE INDEX idx_ai_experiments_status ON ai_experiments(status);
CREATE INDEX idx_ai_experiments_type ON ai_experiments(experiment_type);
CREATE INDEX idx_ai_experiments_dates ON ai_experiments(start_date, end_date);
CREATE INDEX idx_ai_experiments_created_at ON ai_experiments(created_at DESC);
CREATE INDEX idx_ai_experiments_participants_experiment ON ai_experiment_participants(experiment_id);
CREATE INDEX idx_ai_experiments_participants_variant ON ai_experiment_participants(variant);
CREATE INDEX idx_ai_experiments_participants_created_at ON ai_experiment_participants(created_at);

-- ================================
-- Row Level Security
-- ================================
ALTER TABLE ai_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_experiment_participants ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage AI experiments" ON ai_experiments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage experiment participants" ON ai_experiment_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

-- Service role policies
CREATE POLICY "Service role can access experiments" ON ai_experiments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can access participants" ON ai_experiment_participants
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================
-- Triggers for audit and timestamps
-- ================================
CREATE TRIGGER ai_experiments_audit
    AFTER INSERT OR UPDATE OR DELETE ON ai_experiments
    FOR EACH ROW EXECUTE FUNCTION track_ai_configuration_changes();

CREATE TRIGGER ai_experiments_updated_at
    BEFORE UPDATE ON ai_experiments
    FOR EACH ROW EXECUTE FUNCTION update_ai_configuration_timestamp();

-- ================================
-- Comments for documentation
-- ================================
COMMENT ON TABLE ai_experiments IS 'General A/B testing experiments for AI configurations, prompts, models, and parameters';
COMMENT ON TABLE ai_experiment_participants IS 'Participant records for AI experiments with variant assignments and metadata';