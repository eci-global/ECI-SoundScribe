-- Check if AI Summary field needs to be synced with summary field
-- Some recordings might have summary but not ai_summary

-- First, let's see the current state
SELECT 
  COUNT(*) as total_recordings,
  COUNT(summary) as has_summary,
  COUNT(ai_summary) as has_ai_summary,
  COUNT(CASE WHEN summary IS NOT NULL AND ai_summary IS NULL THEN 1 END) as summary_without_ai_summary
FROM recordings;

-- Fix: Copy summary to ai_summary where ai_summary is NULL but summary exists
UPDATE recordings
SET 
  ai_summary = summary,
  ai_generated_at = COALESCE(ai_generated_at, NOW())
WHERE summary IS NOT NULL 
  AND ai_summary IS NULL;

-- Verify the fix
SELECT 
  id,
  title,
  status,
  CASE 
    WHEN transcript IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_transcript,
  CASE 
    WHEN summary IS NOT NULL OR ai_summary IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END as has_summary,
  CASE 
    WHEN ai_summary IS NOT NULL THEN 'Generated' 
    ELSE 'Not available' 
  END as ai_summary_status
FROM recordings
ORDER BY created_at DESC
LIMIT 10;