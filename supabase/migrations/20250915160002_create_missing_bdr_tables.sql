-- Create missing BDR tables that should exist in production
-- This migration ensures the BDR scorecard system has the required database tables

-- Create bdr_upload_tracking table
CREATE TABLE IF NOT EXISTS bdr_upload_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  upload_status TEXT DEFAULT 'processing',
  processed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bdr_scorecard_evaluations table  
CREATE TABLE IF NOT EXISTS bdr_scorecard_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id),
  scores JSONB,
  evaluator_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bdr_user_progress_summary table
CREATE TABLE IF NOT EXISTS bdr_user_progress_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  training_program_id UUID,
  total_calls INTEGER DEFAULT 0,
  average_score DECIMAL DEFAULT 0,
  latest_score DECIMAL DEFAULT 0,
  best_score DECIMAL DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  target_met BOOLEAN DEFAULT FALSE,
  improvement_trend DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE bdr_upload_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_scorecard_evaluations ENABLE ROW LEVEL SECURITY; 
ALTER TABLE bdr_user_progress_summary ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (Edge Functions)
CREATE POLICY IF NOT EXISTS "Service role can manage upload tracking" ON bdr_upload_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage scorecard evaluations" ON bdr_scorecard_evaluations  
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage user progress" ON bdr_user_progress_summary
  FOR ALL USING (auth.role() = 'service_role');

-- Create read policies for authenticated users
CREATE POLICY IF NOT EXISTS "Users can view upload tracking" ON bdr_upload_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can view scorecard evaluations" ON bdr_scorecard_evaluations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can view user progress" ON bdr_user_progress_summary  
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON bdr_upload_tracking TO service_role;
GRANT ALL ON bdr_scorecard_evaluations TO service_role;
GRANT ALL ON bdr_user_progress_summary TO service_role;

GRANT SELECT ON bdr_upload_tracking TO authenticated;
GRANT SELECT ON bdr_scorecard_evaluations TO authenticated; 
GRANT SELECT ON bdr_user_progress_summary TO authenticated;