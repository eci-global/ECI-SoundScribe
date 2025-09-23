-- Complete BDR Training Schema Migration
-- Adds all missing tables and columns required by the edge functions

-- Add missing columns to existing tables
ALTER TABLE bdr_training_datasets 
  ADD COLUMN IF NOT EXISTS call_identifier TEXT,
  ADD COLUMN IF NOT EXISTS call_date DATE,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS matching_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS manager_id UUID,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE bdr_scorecard_evaluations
  ADD COLUMN IF NOT EXISTS call_identifier TEXT,
  ADD COLUMN IF NOT EXISTS call_date DATE,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS matching_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS manager_id UUID,
  ADD COLUMN IF NOT EXISTS batch_id UUID;

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

-- Create validation history table
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

-- Create user progress summary table (materialized view backing table)
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

-- Create performance analytics table
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

-- Create coaching recommendations table
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

-- Create system notifications table for BDR
CREATE TABLE IF NOT EXISTS bdr_system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('batch_complete', 'validation_required', 'score_update', 'system_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  read_status BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bdr_batch_jobs_status ON bdr_batch_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bdr_batch_jobs_program ON bdr_batch_processing_jobs(training_program_id);
CREATE INDEX IF NOT EXISTS idx_bdr_batch_jobs_created ON bdr_batch_processing_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_bdr_validation_history_dataset ON bdr_validation_history(dataset_id);
CREATE INDEX IF NOT EXISTS idx_bdr_validation_history_status ON bdr_validation_history(validation_status);
CREATE INDEX IF NOT EXISTS idx_bdr_validation_history_validator ON bdr_validation_history(validator_id);

CREATE INDEX IF NOT EXISTS idx_bdr_progress_user_program ON bdr_user_progress_summary(user_id, training_program_id);
CREATE INDEX IF NOT EXISTS idx_bdr_progress_activity_date ON bdr_user_progress_summary(last_activity_date);

CREATE INDEX IF NOT EXISTS idx_bdr_analytics_user_program ON bdr_performance_analytics(user_id, training_program_id);
CREATE INDEX IF NOT EXISTS idx_bdr_analytics_metric_date ON bdr_performance_analytics(metric_date);
CREATE INDEX IF NOT EXISTS idx_bdr_analytics_metric_type ON bdr_performance_analytics(metric_type);

CREATE INDEX IF NOT EXISTS idx_bdr_recommendations_user ON bdr_coaching_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_bdr_recommendations_status ON bdr_coaching_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_bdr_recommendations_priority ON bdr_coaching_recommendations(priority);

CREATE INDEX IF NOT EXISTS idx_bdr_notifications_user ON bdr_system_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bdr_notifications_read ON bdr_system_notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_bdr_notifications_created ON bdr_system_notifications(created_at);

-- Update foreign key references
ALTER TABLE bdr_training_datasets 
  ADD CONSTRAINT fk_bdr_datasets_manager 
    FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_bdr_datasets_batch 
    FOREIGN KEY (batch_id) REFERENCES bdr_batch_processing_jobs(id) ON DELETE SET NULL;

ALTER TABLE bdr_scorecard_evaluations 
  ADD CONSTRAINT fk_bdr_evaluations_manager 
    FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_bdr_evaluations_batch 
    FOREIGN KEY (batch_id) REFERENCES bdr_batch_processing_jobs(id) ON DELETE SET NULL;

-- Add updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bdr_batch_jobs_updated_at 
  BEFORE UPDATE ON bdr_batch_processing_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bdr_weekly_schedules_updated_at 
  BEFORE UPDATE ON bdr_weekly_batch_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bdr_validation_history_updated_at 
  BEFORE UPDATE ON bdr_validation_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bdr_progress_summary_updated_at 
  BEFORE UPDATE ON bdr_user_progress_summary 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bdr_recommendations_updated_at 
  BEFORE UPDATE ON bdr_coaching_recommendations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO bdr_weekly_batch_schedules (id, training_program_id, schedule_day, schedule_hour, batch_size)
SELECT 
  gen_random_uuid(),
  id,
  'monday',
  9,
  25
FROM bdr_training_programs
ON CONFLICT DO NOTHING;

-- Insert sample batch job for testing
INSERT INTO bdr_batch_processing_jobs (id, training_program_id, status, job_type, total_items, processed_items)
SELECT 
  gen_random_uuid(),
  id,
  'completed',
  'weekly_batch',
  15,
  15
FROM bdr_training_programs
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample progress summary for dev user
INSERT INTO bdr_user_progress_summary (
  user_id, 
  training_program_id, 
  total_calls, 
  completed_calls, 
  average_score, 
  latest_score, 
  best_score,
  completion_percentage,
  last_activity_date
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  id,
  12,
  8,
  2.75,
  3.2,
  3.8,
  67,
  CURRENT_DATE - INTERVAL '2 days'
FROM bdr_training_programs
LIMIT 1
ON CONFLICT (user_id, training_program_id) DO NOTHING;

-- Insert sample coaching recommendations
INSERT INTO bdr_coaching_recommendations (
  user_id,
  training_program_id,
  recommendation_type,
  priority,
  title,
  description,
  action_items
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  id,
  'focus_area',
  8,
  'Improve Pattern Interrupt Timing',
  'Your pattern interrupts are well-structured but timing could be improved for better impact.',
  '["Practice interrupts after 2-3 seconds of prospect speaking", "Use voice tone changes to enhance interrupt effectiveness"]'::jsonb
FROM bdr_training_programs
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample performance analytics
INSERT INTO bdr_performance_analytics (user_id, training_program_id, metric_type, metric_date, metric_value)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  tp.id,
  'daily_score',
  CURRENT_DATE - (i || ' days')::interval,
  2.0 + (random() * 2)  -- Random scores between 2.0 and 4.0
FROM bdr_training_programs tp, generate_series(0, 14) i
LIMIT 15
ON CONFLICT (user_id, training_program_id, metric_type, metric_date) DO NOTHING;