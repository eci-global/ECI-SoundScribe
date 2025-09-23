-- Check the current state of recordings and coaching data
-- This script helps diagnose why no analytics data is showing

-- Check total recordings and their coaching status
SELECT 
  'Recording Status Overview' as section,
  COUNT(*) as total_recordings,
  COUNT(*) FILTER (WHERE enable_coaching = true) as coaching_enabled,
  COUNT(*) FILTER (WHERE transcript IS NOT NULL AND transcript != '') as with_transcripts,
  COUNT(*) FILTER (WHERE coaching_evaluation IS NOT NULL) as with_coaching_evaluation,
  COUNT(*) FILTER (WHERE enable_coaching = true AND transcript IS NOT NULL AND transcript != '' AND coaching_evaluation IS NULL) as ready_for_coaching
FROM recordings;

-- Show sample recordings to understand the current state
SELECT 
  'Sample Recordings' as section,
  id,
  title,
  status,
  enable_coaching,
  (transcript IS NOT NULL AND transcript != '') as has_transcript,
  (coaching_evaluation IS NOT NULL) as has_coaching,
  created_at
FROM recordings 
ORDER BY created_at DESC 
LIMIT 10;

-- If there are recordings ready for coaching, enable them
-- UPDATE recordings 
-- SET enable_coaching = true 
-- WHERE enable_coaching = false 
--   AND transcript IS NOT NULL 
--   AND transcript != ''
--   AND status = 'completed';

-- For testing: Create a sample coaching evaluation for one recording if none exist
-- UPDATE recordings 
-- SET coaching_evaluation = '{
--   "overallScore": 75,
--   "criteria": {
--     "talkTimeRatio": 35,
--     "objectionHandling": 7,
--     "discoveryQuestions": 5,
--     "valueArticulation": 8,
--     "activeListening": 7,
--     "nextSteps": true,
--     "rapport": 8
--   },
--   "strengths": ["Good value articulation", "Strong rapport building"],
--   "improvements": ["Ask more discovery questions", "Reduce talk time"],
--   "summary": "Overall good call with room for improvement in discovery"
-- }'::jsonb
-- WHERE id = (
--   SELECT id FROM recordings 
--   WHERE transcript IS NOT NULL 
--     AND transcript != ''
--     AND coaching_evaluation IS NULL
--   ORDER BY created_at DESC
--   LIMIT 1
-- );