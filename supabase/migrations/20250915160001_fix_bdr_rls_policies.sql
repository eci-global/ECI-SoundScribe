-- Fix RLS policies for BDR scorecard system
-- This enables Edge Functions to insert data into BDR tables

-- Enable RLS and create policies for bdr_upload_tracking
ALTER TABLE bdr_upload_tracking ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert and read upload tracking records
DROP POLICY IF EXISTS "Service role can manage upload tracking" ON bdr_upload_tracking;
CREATE POLICY "Service role can manage upload tracking" ON bdr_upload_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own upload tracking records  
DROP POLICY IF EXISTS "Users can view own upload tracking" ON bdr_upload_tracking;
CREATE POLICY "Users can view own upload tracking" ON bdr_upload_tracking
  FOR SELECT USING (true); -- For now, allow all authenticated users to read

-- Enable RLS and create policies for bdr_scorecard_evaluations
ALTER TABLE bdr_scorecard_evaluations ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert and manage scorecard evaluations
DROP POLICY IF EXISTS "Service role can manage scorecard evaluations" ON bdr_scorecard_evaluations;
CREATE POLICY "Service role can manage scorecard evaluations" ON bdr_scorecard_evaluations
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read scorecard evaluations
DROP POLICY IF EXISTS "Users can view scorecard evaluations" ON bdr_scorecard_evaluations;  
CREATE POLICY "Users can view scorecard evaluations" ON bdr_scorecard_evaluations
  FOR SELECT USING (true); -- For now, allow all authenticated users to read

-- Enable RLS and create policies for bdr_user_progress_summary  
ALTER TABLE bdr_user_progress_summary ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage user progress
DROP POLICY IF EXISTS "Service role can manage user progress" ON bdr_user_progress_summary;
CREATE POLICY "Service role can manage user progress" ON bdr_user_progress_summary
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to view their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON bdr_user_progress_summary;
CREATE POLICY "Users can view own progress" ON bdr_user_progress_summary
  FOR SELECT USING (auth.uid()::text = user_id OR true); -- Allow all for now

-- Grant necessary permissions to the service role
GRANT ALL ON bdr_upload_tracking TO service_role;
GRANT ALL ON bdr_scorecard_evaluations TO service_role;  
GRANT ALL ON bdr_user_progress_summary TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON bdr_upload_tracking TO authenticated;
GRANT SELECT ON bdr_scorecard_evaluations TO authenticated;
GRANT SELECT ON bdr_user_progress_summary TO authenticated;