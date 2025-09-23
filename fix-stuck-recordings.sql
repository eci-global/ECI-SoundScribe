-- Fix stuck recordings in processing status
-- Run this to manually update recordings that should be completed

-- First, let's see what we're working with
SELECT 
  id,
  title,
  status,
  transcript IS NOT NULL as has_transcript,
  ai_summary IS NOT NULL as has_summary,
  duration,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes
FROM recordings 
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Fix recordings that have transcript and summary - mark as completed
UPDATE recordings 
SET 
  status = 'completed',
  updated_at = NOW()
WHERE status = 'processing' 
  AND transcript IS NOT NULL 
  AND ai_summary IS NOT NULL
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Fix recordings that have transcript but missing AI summary - mark as transcribed
UPDATE recordings 
SET 
  status = 'transcribed',
  updated_at = NOW()
WHERE status = 'processing' 
  AND transcript IS NOT NULL 
  AND ai_summary IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Mark very old recordings without transcript as failed (15+ minutes)
UPDATE recordings 
SET 
  status = 'failed',
  updated_at = NOW()
WHERE status = 'processing' 
  AND transcript IS NULL
  AND created_at < NOW() - INTERVAL '15 minutes';

-- Show results
SELECT 
  'Fixed stuck recordings:' as message,
  COUNT(*) as total_fixed
FROM recordings 
WHERE updated_at > NOW() - INTERVAL '1 minute'
  AND status IN ('completed', 'transcribed', 'failed');

-- Show remaining stuck recordings
SELECT 
  'Remaining stuck recordings:' as message,
  COUNT(*) as still_stuck
FROM recordings 
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '5 minutes';