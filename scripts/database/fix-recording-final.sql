-- Final fix for stuck recording based on actual schema
-- Recording ID: bce96925-181c-43c1-b7b7-7dc59ef0dca7

-- 1. Check current state
SELECT 
  id,
  title,
  status,
  duration,
  transcript IS NOT NULL as has_transcript,
  summary IS NOT NULL as has_summary,
  ai_summary IS NOT NULL as has_ai_summary,
  file_url IS NOT NULL as has_file,
  created_at
FROM recordings
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- 2. Update the recording status and fields
UPDATE recordings
SET 
  -- Fix status based on what processing has completed
  status = CASE
    WHEN transcript IS NOT NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) THEN 'completed'
    WHEN transcript IS NOT NULL THEN 'transcribed'
    WHEN file_url IS NOT NULL AND created_at < NOW() - INTERVAL '30 minutes' THEN 'failed'
    WHEN file_url IS NOT NULL THEN 'processing'
    ELSE COALESCE(status, 'failed')
  END,
  -- Copy summary to ai_summary if only summary exists
  ai_summary = CASE
    WHEN ai_summary IS NULL AND summary IS NOT NULL THEN summary
    ELSE ai_summary
  END,
  -- Set AI generated timestamp if we have AI content
  ai_generated_at = CASE
    WHEN ai_generated_at IS NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) 
    THEN NOW()
    ELSE ai_generated_at
  END,
  updated_at = NOW()
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- 3. Show the updated recording
SELECT 
  id,
  title,
  status,
  duration,
  transcript IS NOT NULL as has_transcript,
  (summary IS NOT NULL OR ai_summary IS NOT NULL) as has_summary,
  ai_generated_at,
  updated_at
FROM recordings
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- 4. If you want to fix ALL stuck recordings:
UPDATE recordings
SET 
  status = CASE
    WHEN transcript IS NOT NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) THEN 'completed'
    WHEN transcript IS NOT NULL THEN 'transcribed'
    WHEN file_url IS NOT NULL AND created_at < NOW() - INTERVAL '30 minutes' THEN 'failed'
    WHEN file_url IS NOT NULL THEN 'processing'
    ELSE COALESCE(status, 'failed')
  END,
  ai_summary = CASE
    WHEN ai_summary IS NULL AND summary IS NOT NULL THEN summary
    ELSE ai_summary
  END,
  updated_at = NOW()
WHERE 
  -- Only update recordings that need fixing
  (status IN ('uploading', 'processing') AND transcript IS NOT NULL)
  OR (status = 'processing' AND created_at < NOW() - INTERVAL '30 minutes')
  OR status IS NULL;

-- 5. Show summary of all recordings by status
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as has_transcript,
  COUNT(CASE WHEN summary IS NOT NULL OR ai_summary IS NOT NULL THEN 1 END) as has_summary
FROM recordings
GROUP BY status
ORDER BY status;