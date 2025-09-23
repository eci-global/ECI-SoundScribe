-- Add missing BDR tables without sample data
-- This creates the tables needed for Analytics, Batch Processing, and Validation tabs

-- Create missing batch processing tables
CREATE TABLE IF NOT EXISTS bdr_batch_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_program_id UUID REFERENCES bdr_training_programs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  job_type TEXT DEFAULT 'weekly_batch' CHECK (job_type IN ('weekly_batch', 'manual_batch', 'validation_batch')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bdr_weekly_batch_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_program_id UUID REFERENCES bdr_training_programs(id) ON DELETE CASCADE,
  schedule_day TEXT DEFAULT 'monday' CHECK (schedule_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  schedule_hour INTEGER DEFAULT 9 CHECK (schedule_hour >= 0 AND schedule_hour <= 23),
  is_enabled BOOLEAN DEFAULT true,
  last_run_time TIMESTAMP WITH TIME ZONE,
  next_run_time TIMESTAMP WITH TIME ZONE,
  batch_size INTEGER DEFAULT 50,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bdr_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES bdr_training_datasets(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('automatic', 'manual', 'bulk_validation', 'score_adjustment')),
  validator_id UUID,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  original_scores JSONB,
  validated_scores JSONB,
  validation_notes TEXT,
  confidence_score DECIMAL(3,2),
  validation_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bdr_user_progress_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  training_program_id UUID REFERENCES bdr_training_programs(id) ON DELETE CASCADE,
  total_calls INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  average_score DECIMAL(4,2) DEFAULT 0,
  latest_score DECIMAL(4,2) DEFAULT 0,
  best_score DECIMAL(4,2) DEFAULT 0,
  worst_score DECIMAL(4,2) DEFAULT 0,
  improvement_trend DECIMAL(4,2) DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  target_met BOOLEAN DEFAULT false,
  last_activity_date DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, training_program_id)
);

CREATE TABLE IF NOT EXISTS bdr_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  training_program_id UUID REFERENCES bdr_training_programs(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('daily_score', 'criteria_improvement', 'coaching_impact', 'peer_comparison')),
  metric_date DATE NOT NULL,
  metric_value DECIMAL(6,3),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, training_program_id, metric_type, metric_date)
);

CREATE TABLE IF NOT EXISTS bdr_coaching_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  training_program_id UUID REFERENCES bdr_training_programs(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('focus_area', 'practice_exercise', 'skill_development', 'immediate_action')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  title TEXT NOT NULL,
  description TEXT,
  action_items JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed', 'superseded')),
  created_date DATE DEFAULT CURRENT_DATE,
  target_completion_date DATE,
  completion_date DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE bdr_batch_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_weekly_batch_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_validation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_user_progress_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_coaching_recommendations ENABLE ROW LEVEL SECURITY;

-- Service role policies for edge functions
CREATE POLICY "Service role full access to batch jobs" ON bdr_batch_processing_jobs FOR ALL USING (current_setting('role') = 'service_role');
CREATE POLICY "Service role full access to schedules" ON bdr_weekly_batch_schedules FOR ALL USING (current_setting('role') = 'service_role');
CREATE POLICY "Service role full access to validation" ON bdr_validation_history FOR ALL USING (current_setting('role') = 'service_role');
CREATE POLICY "Service role full access to progress" ON bdr_user_progress_summary FOR ALL USING (current_setting('role') = 'service_role');
CREATE POLICY "Service role full access to analytics" ON bdr_performance_analytics FOR ALL USING (current_setting('role') = 'service_role');
CREATE POLICY "Service role full access to recommendations" ON bdr_coaching_recommendations FOR ALL USING (current_setting('role') = 'service_role');

-- Grant permissions
GRANT ALL ON bdr_batch_processing_jobs TO service_role;
GRANT ALL ON bdr_weekly_batch_schedules TO service_role;
GRANT ALL ON bdr_validation_history TO service_role;
GRANT ALL ON bdr_user_progress_summary TO service_role;
GRANT ALL ON bdr_performance_analytics TO service_role;
GRANT ALL ON bdr_coaching_recommendations TO service_role;

-- NO SAMPLE DATA INSERTED - Tables will be empty and show proper empty states