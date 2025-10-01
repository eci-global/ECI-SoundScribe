-- Add sample BDR training data for analytics testing
-- This migration populates the database with realistic sample data so analytics display immediately

-- Insert sample BDR training program if not exists
INSERT INTO bdr_training_programs (id, name, description, is_active, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Q1 2025 Sales Training Program',
  'Comprehensive BDR training program with coaching analytics',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample training datasets with agent names
INSERT INTO bdr_training_datasets (id, training_program_id, agent_name, call_title, user_id, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Sarah Johnson', 'Outbound Prospecting Call - Tech Solutions', auth.uid(), NOW() - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Mike Rodriguez', 'Follow-up Call - Enterprise Account', auth.uid(), NOW() - INTERVAL '4 days'),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Emma Chen', 'Discovery Call - Healthcare Prospect', auth.uid(), NOW() - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'David Smith', 'Qualification Call - SMB Lead', auth.uid(), NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Lisa Park', 'Demo Scheduling Call - SaaS Platform', auth.uid(), NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample scorecard evaluations with realistic BDR scores
INSERT INTO bdr_scorecard_evaluations (
  id,
  training_dataset_id,
  training_program_id,
  user_id,
  opening_score,
  objection_handling_score,
  qualification_score,
  tone_energy_score,
  assertiveness_control_score,
  business_acumen_score,
  closing_score,
  talk_time_score,
  overall_score,
  manager_notes,
  created_at
)
VALUES
  -- Sarah Johnson - Strong performer
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', auth.uid(), 4, 3, 4, 3, 4, 3, 4, 3, 3.5, 'Excellent opening and closing. Work on objection handling techniques.', NOW() - INTERVAL '5 days'),

  -- Mike Rodriguez - Solid performer
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', auth.uid(), 3, 4, 3, 4, 3, 3, 3, 4, 3.3, 'Great energy and objection handling. Focus on qualification depth.', NOW() - INTERVAL '4 days'),

  -- Emma Chen - Rising star
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', auth.uid(), 3, 3, 4, 3, 3, 4, 3, 3, 3.2, 'Strong business acumen and qualification skills. Consistent improvement.', NOW() - INTERVAL '3 days'),

  -- David Smith - Developing
  ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', auth.uid(), 2, 3, 2, 3, 2, 2, 3, 2, 2.4, 'Show improvement in opening and assertiveness. Good effort on closing.', NOW() - INTERVAL '2 days'),

  -- Lisa Park - Good potential
  ('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', auth.uid(), 3, 2, 3, 4, 3, 3, 2, 4, 3.0, 'Excellent talk time management and tone. Work on objection handling and closing.', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample user progress summary
INSERT INTO bdr_user_progress_summary (
  user_id,
  training_program_id,
  total_calls,
  completed_calls,
  average_score,
  latest_score,
  best_score,
  worst_score,
  completion_percentage,
  target_met,
  improvement_trend,
  last_activity_date,
  created_at,
  updated_at
)
VALUES
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 5, 5, 3.08, 3.0, 3.5, 2.4, 100, false, 0.15, NOW(), NOW(), NOW())
ON CONFLICT (user_id, training_program_id) DO UPDATE SET
  total_calls = EXCLUDED.total_calls,
  completed_calls = EXCLUDED.completed_calls,
  average_score = EXCLUDED.average_score,
  latest_score = EXCLUDED.latest_score,
  best_score = EXCLUDED.best_score,
  worst_score = EXCLUDED.worst_score,
  completion_percentage = EXCLUDED.completion_percentage,
  target_met = EXCLUDED.target_met,
  improvement_trend = EXCLUDED.improvement_trend,
  last_activity_date = EXCLUDED.last_activity_date,
  updated_at = NOW();

-- Insert sample performance analytics for trending
INSERT INTO bdr_performance_analytics (
  user_id,
  training_program_id,
  metric_type,
  metric_value,
  metric_date,
  created_at
)
VALUES
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'daily_score', 2.4, (NOW() - INTERVAL '5 days')::date, NOW() - INTERVAL '5 days'),
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'daily_score', 3.3, (NOW() - INTERVAL '4 days')::date, NOW() - INTERVAL '4 days'),
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'daily_score', 3.2, (NOW() - INTERVAL '3 days')::date, NOW() - INTERVAL '3 days'),
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'daily_score', 2.4, (NOW() - INTERVAL '2 days')::date, NOW() - INTERVAL '2 days'),
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'daily_score', 3.0, (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '1 day')
ON CONFLICT (user_id, training_program_id, metric_type, metric_date) DO NOTHING;

-- Add sample coaching recommendations
INSERT INTO bdr_coaching_recommendations (
  id,
  user_id,
  training_program_id,
  recommendation_type,
  title,
  description,
  priority,
  action_items,
  created_at
)
VALUES
  ('550e8400-e29b-41d4-a716-446655440201', auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'skill_improvement', 'Enhance Opening Techniques', 'Focus on creating stronger first impressions and engagement hooks', 'high', ARRAY['Practice permission-based openers', 'Develop industry-specific talking points', 'Record and review opening 30 seconds'], NOW()),
  ('550e8400-e29b-41d4-a716-446655440202', auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'objection_handling', 'Strengthen Objection Response', 'Improve confidence and technique when handling prospect objections', 'medium', ARRAY['Study common objection patterns', 'Practice feel-felt-found framework', 'Role-play difficult scenarios'], NOW()),
  ('550e8400-e29b-41d4-a716-446655440203', auth.uid(), '550e8400-e29b-41d4-a716-446655440000', 'closing', 'Improve Call Conclusions', 'Work on creating clear next steps and gaining commitment', 'high', ARRAY['Always summarize key points', 'Propose specific next meeting times', 'Confirm prospect availability'], NOW())
ON CONFLICT (id) DO NOTHING;

-- Create view for analytics if not exists
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  COUNT(DISTINCT bse.user_id) as total_participants,
  COUNT(DISTINCT CASE WHEN bse.created_at > NOW() - INTERVAL '30 days' THEN bse.user_id END) as active_participants,
  AVG(bse.overall_score) as average_score,
  COUNT(bse.id) as total_evaluations,
  AVG(CASE WHEN bse.overall_score >= 3.5 THEN 1 ELSE 0 END) * 100 as target_achievement_rate
FROM bdr_scorecard_evaluations bse
WHERE bse.training_program_id = '550e8400-e29b-41d4-a716-446655440000';