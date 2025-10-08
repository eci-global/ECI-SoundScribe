-- Quick fix for existing recordings with incorrect status
-- Run this in Supabase SQL Editor after applying the migration

-- 1. Fix completed recordings (have both transcript and summary)
UPDATE recordings 
SET status = 'completed'
WHERE transcript IS NOT NULL 
  AND (summary IS NOT NULL OR ai_summary IS NOT NULL)
  AND status != 'completed';

-- 2. Fix transcribed recordings (have transcript but no summary)  
UPDATE recordings 
SET status = 'transcribed'
WHERE transcript IS NOT NULL 
  AND summary IS NULL 
  AND ai_summary IS NULL
  AND status NOT IN ('transcribed', 'completed', 'failed');

-- 3. Check the results
SELECT 
  status, 
  COUNT(*) as count,
  COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as has_transcript,
  COUNT(CASE WHEN summary IS NOT NULL OR ai_summary IS NOT NULL THEN 1 END) as has_summary
FROM recordings
GROUP BY status
ORDER BY status;