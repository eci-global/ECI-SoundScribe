-- Fix get_system_health_metrics function to handle missing audit_logs columns
-- This addresses the issue where the existing audit_logs table doesn't have all expected columns

CREATE OR REPLACE FUNCTION public.get_system_health_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_recordings INTEGER;
  completed_recordings INTEGER;
  failed_recordings INTEGER;
  processing_recordings INTEGER;
  avg_processing_time NUMERIC;
  total_storage_mb NUMERIC;
  recent_errors INTEGER := 0; -- Default to 0 if audit_logs doesn't exist or lacks severity column
BEGIN
  -- Get recording statistics
  SELECT COUNT(*) INTO total_recordings FROM public.recordings;

  SELECT COUNT(*) INTO completed_recordings
  FROM public.recordings
  WHERE status = 'completed';

  SELECT COUNT(*) INTO failed_recordings
  FROM public.recordings
  WHERE status = 'failed';

  SELECT COUNT(*) INTO processing_recordings
  FROM public.recordings
  WHERE status IN ('processing', 'queued', 'transcribing');

  -- Calculate average processing time (in minutes)
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 0) INTO avg_processing_time
  FROM public.recordings
  WHERE status = 'completed'
    AND updated_at > created_at
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Calculate total storage usage (MB)
  SELECT COALESCE(SUM(file_size) / 1024.0 / 1024.0, 0) INTO total_storage_mb
  FROM public.recordings
  WHERE file_size IS NOT NULL;

  -- Try to count recent errors from audit_logs (graceful fallback if table/columns don't exist)
  BEGIN
    SELECT COUNT(*) INTO recent_errors
    FROM public.audit_logs
    WHERE severity IN ('error', 'critical')
      AND created_at >= NOW() - INTERVAL '24 hours';
  EXCEPTION
    WHEN undefined_table OR undefined_column THEN
      recent_errors := 0; -- Graceful fallback if audit_logs doesn't exist or lacks severity column
  END;

  -- Build result JSON
  result := jsonb_build_object(
    'totalRecordings', total_recordings,
    'completedRecordings', completed_recordings,
    'failedRecordings', failed_recordings,
    'processingRecordings', processing_recordings,
    'successRate', CASE WHEN total_recordings > 0 THEN ROUND((completed_recordings::NUMERIC / total_recordings::NUMERIC) * 100, 2) ELSE 0 END,
    'avgProcessingTimeMinutes', ROUND(avg_processing_time, 2),
    'totalStorageMB', ROUND(total_storage_mb, 2),
    'recentErrors', recent_errors,
    'systemStatus', CASE
      WHEN recent_errors > 10 THEN 'critical'
      WHEN recent_errors > 5 THEN 'warning'
      WHEN failed_recordings::NUMERIC / NULLIF(total_recordings, 0) > 0.1 THEN 'warning'
      ELSE 'healthy'
    END,
    'lastUpdated', NOW()
  );

  RETURN result;
END;
$$;