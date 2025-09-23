-- Fix all recordings stuck due to CHECK constraint violations
-- Run this AFTER applying the database migration

-- 1. Show recordings that need fixing
SELECT 
  id,
  title,
  status,
  created_at,
  transcript IS NOT NULL as has_transcript,
  (summary IS NOT NULL OR ai_summary IS NOT NULL) as has_summary,
  duration
FROM recordings
WHERE 
  -- Stuck in uploading/processing but have transcript
  (status IN ('uploading', 'processing') AND transcript IS NOT NULL)
  -- Or have invalid status values (will be NULL after CHECK constraint rejection)
  OR status IS NULL
  -- Or created more than 30 minutes ago and still processing
  OR (status = 'processing' AND created_at < NOW() - INTERVAL '30 minutes')
ORDER BY created_at DESC;

-- 2. Fix duration for all recordings (extract from metadata if available)
UPDATE recordings
SET duration = (transcription_metadata->>'duration')::numeric
WHERE duration IS NULL 
  AND transcription_metadata->>'duration' IS NOT NULL;

-- 3. Fix status based on actual processing state
UPDATE recordings
SET 
  status = CASE
    -- If has transcript and summary, it's completed
    WHEN transcript IS NOT NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) THEN 'completed'
    -- If only has transcript, it's transcribed
    WHEN transcript IS NOT NULL THEN 'transcribed'
    -- If has file but no transcript and created > 30 min ago, mark as failed
    WHEN file_url IS NOT NULL AND transcript IS NULL AND created_at < NOW() - INTERVAL '30 minutes' THEN 'failed'
    -- Otherwise keep current status
    ELSE COALESCE(status, 'processing')
  END,
  updated_at = NOW()
WHERE 
  -- Fix recordings with wrong status
  (status IN ('uploading', 'processing') AND transcript IS NOT NULL)
  -- Or null status
  OR status IS NULL
  -- Or old stuck recordings
  OR (status = 'processing' AND created_at < NOW() - INTERVAL '30 minutes');

-- 4. Sync summary to ai_summary where needed
UPDATE recordings
SET 
  ai_summary = summary,
  ai_generated_at = COALESCE(ai_generated_at, NOW())
WHERE summary IS NOT NULL AND ai_summary IS NULL;

-- 5. Show the results
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN duration IS NOT NULL THEN 1 END) as has_duration
FROM recordings
GROUP BY status
ORDER BY status;