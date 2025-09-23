-- Recovery script for stuck recording: bce96925-181c-43c1-b7b7-7dc59ef0dca7
-- This recording is stuck because the database migration hasn't been applied yet

-- First, check the current state of the recording
SELECT 
  id,
  title,
  status,
  transcript IS NOT NULL as has_transcript,
  (summary IS NOT NULL OR ai_summary IS NOT NULL) as has_summary,
  duration,
  file_url IS NOT NULL as has_file,
  created_at,
  updated_at
FROM recordings
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- Check if transcription metadata has duration
SELECT 
  id,
  transcription_metadata->>'duration' as metadata_duration,
  transcription_metadata->>'processing_time_ms' as processing_time
FROM recordings
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- Fix the recording based on what data it has
UPDATE recordings
SET 
  status = CASE
    WHEN transcript IS NOT NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) THEN 'completed'
    WHEN transcript IS NOT NULL THEN 'transcribed'
    WHEN file_url IS NOT NULL THEN 'processing'
    ELSE status
  END,
  -- Extract duration from transcription_metadata if available
  duration = CASE
    WHEN duration IS NULL AND transcription_metadata->>'duration' IS NOT NULL 
    THEN (transcription_metadata->>'duration')::numeric
    ELSE duration
  END,
  -- Copy summary to ai_summary if needed
  ai_summary = CASE
    WHEN ai_summary IS NULL AND summary IS NOT NULL THEN summary
    ELSE ai_summary
  END,
  ai_generated_at = CASE
    WHEN ai_generated_at IS NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) 
    THEN NOW()
    ELSE ai_generated_at
  END,
  updated_at = NOW()
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';

-- Show the updated state
SELECT 
  id,
  title,
  status,
  duration,
  transcript IS NOT NULL as has_transcript,
  (summary IS NOT NULL OR ai_summary IS NOT NULL) as has_summary,
  ai_generated_at
FROM recordings
WHERE id = 'bce96925-181c-43c1-b7b7-7dc59ef0dca7';