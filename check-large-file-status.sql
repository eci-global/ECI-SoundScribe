-- =============================================
-- CHECK LARGE FILE PROCESSING STATUS (echo-ai-scribe-app)
-- Run this in Supabase SQL Editor
-- =============================================

-- Check your specific large file (263MB)
SELECT 
  id,
  title,
  status,
  file_size,
  ROUND(file_size / (1024.0 * 1024.0), 2) as size_mb,
  duration,
  created_at,
  updated_at,
  error_message,
  processing_notes,
  transcript,
  ai_summary,
  ai_moments,
  whisper_metadata,
  CASE 
    WHEN file_size > 200 * 1024 * 1024 THEN 'VERY LARGE (>200MB)'
    WHEN file_size > 100 * 1024 * 1024 THEN 'LARGE (100-200MB)'
    WHEN file_size > 50 * 1024 * 1024 THEN 'MEDIUM (50-100MB)'
    ELSE 'SMALL (<50MB)'
  END as size_category
FROM recordings 
WHERE file_size > 200 * 1024 * 1024  -- Files larger than 200MB
ORDER BY created_at DESC;

-- Check for any stuck recordings
SELECT 
  id,
  title,
  status,
  ROUND(file_size / (1024.0 * 1024.0), 2) as size_mb,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update,
  error_message,
  processing_notes
FROM recordings 
WHERE status IN ('processing', 'uploading', 'transcribing', 'routing_to_azure_backend')
AND updated_at < NOW() - INTERVAL '2 minutes'
ORDER BY updated_at ASC;

-- Check recent processing attempts
SELECT 
  id,
  title,
  status,
  ROUND(file_size / (1024.0 * 1024.0), 2) as size_mb,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'processing_failed' THEN 'FAILED - Check error_message'
    WHEN status = 'completed' THEN 'SUCCESS'
    WHEN status = 'processing' THEN 'IN PROGRESS'
    WHEN status = 'routing_to_azure_backend' THEN 'ROUTED TO AZURE BACKEND'
    ELSE status
  END as processing_status
FROM recordings 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check if any recordings need manual intervention
SELECT 
  'Check Supabase Dashboard → Edge Functions → process-recording → Logs' as instruction,
  'Look for errors related to large file processing' as note,
  'Your 263MB file should now be supported (limit increased to 300MB)' as update,
  'Large files (>100MB) will be routed to Azure backend for processing' as routing_info; 