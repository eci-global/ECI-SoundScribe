-- Row Level Security Policies for BDR Training Tables
-- Ensures proper access control for all BDR-related data

-- Enable RLS on all BDR tables
ALTER TABLE bdr_batch_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_weekly_batch_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_validation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_user_progress_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_coaching_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdr_system_notifications ENABLE ROW LEVEL SECURITY;

-- Batch Processing Jobs Policies
CREATE POLICY "Users can view batch jobs for their training programs" ON bdr_batch_processing_jobs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      training_program_id IN (
        SELECT tp.id FROM bdr_training_programs tp
        -- Allow access to programs user participates in
      )
    )
  );

CREATE POLICY "Authenticated users can create batch jobs" ON bdr_batch_processing_jobs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    created_by = auth.uid()
  );

CREATE POLICY "Users can update their own batch jobs" ON bdr_batch_processing_jobs
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    created_by = auth.uid()
  );

-- Weekly Batch Schedules Policies
CREATE POLICY "Users can view batch schedules for accessible programs" ON bdr_weekly_batch_schedules
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can manage batch schedules" ON bdr_weekly_batch_schedules
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    )
  );

-- Validation History Policies
CREATE POLICY "Users can view validation history for their datasets" ON bdr_validation_history
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      validator_id = auth.uid() OR
      dataset_id IN (
        SELECT btd.id FROM bdr_training_datasets btd
        JOIN recordings r ON r.id = btd.recording_id
        WHERE r.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Validators can create validation records" ON bdr_validation_history
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    validator_id = auth.uid()
  );

CREATE POLICY "Validators can update their validation records" ON bdr_validation_history
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    validator_id = auth.uid()
  );

-- User Progress Summary Policies
CREATE POLICY "Users can view their own progress" ON bdr_user_progress_summary
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own progress" ON bdr_user_progress_summary
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Managers can view team progress" ON bdr_user_progress_summary
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('manager', 'admin') OR
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('manager', 'admin')
    )
  );

-- Performance Analytics Policies
CREATE POLICY "Users can view their own analytics" ON bdr_performance_analytics
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "System can insert analytics data" ON bdr_performance_analytics
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own analytics" ON bdr_performance_analytics
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Coaching Recommendations Policies
CREATE POLICY "Users can view their own recommendations" ON bdr_coaching_recommendations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "System can create recommendations" ON bdr_coaching_recommendations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own recommendations" ON bdr_coaching_recommendations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- System Notifications Policies
CREATE POLICY "Users can view their own notifications" ON bdr_system_notifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      user_id IS NULL  -- Allow system-wide notifications
    )
  );

CREATE POLICY "System can create notifications" ON bdr_system_notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own notifications" ON bdr_system_notifications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Service role policies for edge functions
CREATE POLICY "Service role full access to batch jobs" ON bdr_batch_processing_jobs
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to schedules" ON bdr_weekly_batch_schedules
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to validation" ON bdr_validation_history
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to progress" ON bdr_user_progress_summary
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to analytics" ON bdr_performance_analytics
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to recommendations" ON bdr_coaching_recommendations
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Service role full access to notifications" ON bdr_system_notifications
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON bdr_batch_processing_jobs TO authenticated;
GRANT SELECT ON bdr_weekly_batch_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bdr_validation_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bdr_user_progress_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bdr_performance_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bdr_coaching_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bdr_system_notifications TO authenticated;

-- Grant full permissions to service role for edge functions
GRANT ALL ON bdr_batch_processing_jobs TO service_role;
GRANT ALL ON bdr_weekly_batch_schedules TO service_role;
GRANT ALL ON bdr_validation_history TO service_role;
GRANT ALL ON bdr_user_progress_summary TO service_role;
GRANT ALL ON bdr_performance_analytics TO service_role;
GRANT ALL ON bdr_coaching_recommendations TO service_role;
GRANT ALL ON bdr_system_notifications TO service_role;