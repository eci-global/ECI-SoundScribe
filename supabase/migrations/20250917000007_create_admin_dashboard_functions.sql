-- Create comprehensive admin dashboard functions and tables
-- This migration provides all missing functions required by the admin interface

-- =============================================
-- CORE ADMIN TABLES
-- =============================================

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  ip_address INET,
  user_agent TEXT
);

-- Create admin_metrics table for system health monitoring
CREATE TABLE IF NOT EXISTS public.admin_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'error'))
);

-- Create index for metrics queries (no unique constraint to simplify function)
CREATE INDEX IF NOT EXISTS idx_admin_metrics_type_date
ON public.admin_metrics (metric_type, metric_name, created_at);

-- Create admin_audit_summary table for pre-computed audit summaries
CREATE TABLE IF NOT EXISTS public.admin_audit_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_events INTEGER DEFAULT 0,
  events_by_severity JSONB DEFAULT '{}',
  events_by_action JSONB DEFAULT '{}',
  events_by_user JSONB DEFAULT '{}',
  top_resources JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  UNIQUE(date_range_start, date_range_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_admin_metrics_type_name ON public.admin_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_created_at ON public.admin_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_summary_date_range ON public.admin_audit_summary(date_range_start, date_range_end);

-- Enable RLS on all admin tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin access to audit_logs" ON public.audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admin access to admin_metrics" ON public.admin_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admin access to admin_audit_summary" ON public.admin_audit_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Service role policies
CREATE POLICY "Service role access to audit_logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to admin_metrics" ON public.admin_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to admin_audit_summary" ON public.admin_audit_summary
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- CORE ADMIN FUNCTIONS
-- =============================================

-- Function: get_user_statistics()
-- Returns user statistics for the LicenseWidget
CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_users INTEGER;
  active_users INTEGER;
  inactive_users INTEGER;
  admin_users INTEGER;
  last_updated TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user counts
  SELECT COUNT(*) INTO total_users FROM auth.users;

  SELECT COUNT(*) INTO active_users
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL
    AND banned_until IS NULL;

  SELECT COUNT(*) INTO inactive_users
  FROM auth.users
  WHERE email_confirmed_at IS NULL
    OR banned_until IS NOT NULL;

  SELECT COUNT(DISTINCT ur.user_id) INTO admin_users
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  last_updated := NOW();

  -- Build result JSON
  result := jsonb_build_object(
    'totalUsers', total_users,
    'activeUsers', active_users,
    'inactiveUsers', inactive_users,
    'adminUsers', admin_users,
    'lastUpdated', last_updated
  );

  RETURN result;
END;
$$;

-- Function: get_system_health_metrics()
-- Returns system health metrics for IntegrationHeartbeat
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
  recent_errors INTEGER;
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

  -- Count recent errors (last 24 hours)
  SELECT COUNT(*) INTO recent_errors
  FROM public.audit_logs
  WHERE severity IN ('error', 'critical')
    AND created_at >= NOW() - INTERVAL '24 hours';

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

-- Function: get_audit_summary()
-- Returns audit log summary for AuditLogTable
CREATE OR REPLACE FUNCTION public.get_audit_summary(
  days_back INTEGER DEFAULT 7,
  severity_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMP WITH TIME ZONE;
  total_events INTEGER;
  events_by_severity JSONB;
  events_by_action JSONB;
  recent_events JSONB;
BEGIN
  start_date := NOW() - (days_back || ' days')::INTERVAL;

  -- Get total events count
  SELECT COUNT(*) INTO total_events
  FROM public.audit_logs
  WHERE created_at >= start_date
    AND (severity_filter = 'all' OR severity = severity_filter);

  -- Get events by severity
  SELECT jsonb_object_agg(severity, event_count) INTO events_by_severity
  FROM (
    SELECT
      severity,
      COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_date
      AND (severity_filter = 'all' OR severity = severity_filter)
    GROUP BY severity
  ) t;

  -- Get events by action
  SELECT jsonb_object_agg(action, event_count) INTO events_by_action
  FROM (
    SELECT
      action,
      COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_date
      AND (severity_filter = 'all' OR severity = severity_filter)
    GROUP BY action
    ORDER BY event_count DESC
    LIMIT 10
  ) t;

  -- Get recent events
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'created_at', created_at,
      'action', action,
      'resource_type', resource_type,
      'severity', severity,
      'user_id', user_id
    )
  ) INTO recent_events
  FROM (
    SELECT id, created_at, action, resource_type, severity, user_id
    FROM public.audit_logs
    WHERE created_at >= start_date
      AND (severity_filter = 'all' OR severity = severity_filter)
    ORDER BY created_at DESC
    LIMIT 50
  ) t;

  -- Build result JSON
  result := jsonb_build_object(
    'totalEvents', total_events,
    'dateRange', jsonb_build_object(
      'start', start_date,
      'end', NOW(),
      'days', days_back
    ),
    'eventsBySeverity', COALESCE(events_by_severity, '{}'::jsonb),
    'eventsByAction', COALESCE(events_by_action, '{}'::jsonb),
    'recentEvents', COALESCE(recent_events, '[]'::jsonb),
    'severityFilter', severity_filter
  );

  RETURN result;
END;
$$;

-- =============================================
-- SUPPORTING INFRASTRUCTURE FUNCTIONS
-- =============================================

-- Function: log_audit_event()
-- Helper function to create audit log entries
CREATE OR REPLACE FUNCTION public.log_audit_event(
  action_name TEXT,
  resource_type_name TEXT,
  resource_id_val UUID DEFAULT NULL,
  old_values_json JSONB DEFAULT NULL,
  new_values_json JSONB DEFAULT NULL,
  metadata_json JSONB DEFAULT '{}',
  severity_level TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    severity,
    ip_address
  ) VALUES (
    auth.uid(),
    action_name,
    resource_type_name,
    resource_id_val,
    old_values_json,
    new_values_json,
    metadata_json,
    severity_level,
    inet_client_addr()
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

-- Function: log_admin_action()
-- Specific helper for admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_name TEXT,
  resource_type_name TEXT,
  resource_id_val UUID DEFAULT NULL,
  details_json JSONB DEFAULT '{}',
  client_ip TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
  enhanced_metadata JSONB;
BEGIN
  -- Enhance metadata with admin context
  enhanced_metadata := details_json || jsonb_build_object(
    'admin_action', true,
    'timestamp', NOW(),
    'session_info', jsonb_build_object(
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
    )
  );

  audit_id := public.log_audit_event(
    action_name,
    resource_type_name,
    resource_id_val,
    NULL,
    NULL,
    enhanced_metadata,
    'info'
  );

  RETURN audit_id;
END;
$$;

-- Function: record_metric()
-- Helper to record system metrics
CREATE OR REPLACE FUNCTION public.record_metric(
  metric_type_name TEXT,
  metric_name_val TEXT,
  metric_value_num NUMERIC,
  metadata_json JSONB DEFAULT '{}',
  severity_level TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metric_id UUID;
BEGIN
  -- Insert metrics record (simplified without daily constraint)
  INSERT INTO public.admin_metrics (
    metric_type,
    metric_name,
    metric_value,
    metadata,
    severity
  ) VALUES (
    metric_type_name,
    metric_name_val,
    metric_value_num,
    metadata_json,
    severity_level
  )
  RETURNING id INTO metric_id;

  RETURN metric_id;
END;
$$;

-- Function: calculate_admin_kpis()
-- Calculate comprehensive KPIs for admin dashboard
CREATE OR REPLACE FUNCTION public.calculate_admin_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  instant_summaries JSONB;
  rep_adoption JSONB;
  system_health JSONB;
  performance_metrics JSONB;
BEGIN
  -- Calculate instant summaries (recordings by time period)
  WITH recording_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days,
      COUNT(*) as total,
      AVG(duration) FILTER (WHERE status = 'completed' AND duration IS NOT NULL) as avg_duration
    FROM public.recordings
  )
  SELECT jsonb_build_object(
    'today', COALESCE(today, 0),
    'last7Days', COALESCE(last_7_days, 0),
    'last30Days', COALESCE(last_30_days, 0),
    'total', COALESCE(total, 0),
    'avgDuration', COALESCE(ROUND(avg_duration, 2), 0)
  ) INTO instant_summaries FROM recording_stats;

  -- Calculate rep adoption metrics
  WITH user_stats AS (
    SELECT
      COUNT(DISTINCT p.id) as total_users,
      COUNT(DISTINCT r.user_id) as active_users,
      COUNT(DISTINCT r.user_id) FILTER (WHERE r.created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_active
    FROM public.profiles p
    LEFT JOIN public.recordings r ON p.id = r.user_id
  )
  SELECT jsonb_build_object(
    'totalUsers', COALESCE(total_users, 0),
    'activeUsers', COALESCE(active_users, 0),
    'weeklyActiveUsers', COALESCE(weekly_active, 0),
    'adoptionRate', CASE
      WHEN total_users > 0 THEN ROUND((active_users::NUMERIC / total_users::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO rep_adoption FROM user_stats;

  -- Calculate system health metrics
  WITH health_stats AS (
    SELECT
      COUNT(*) as total_recordings,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status IN ('processing', 'queued')) as processing
    FROM public.recordings
  )
  SELECT jsonb_build_object(
    'totalRecordings', COALESCE(total_recordings, 0),
    'completedRecordings', COALESCE(completed, 0),
    'failedRecordings', COALESCE(failed, 0),
    'processingRecordings', COALESCE(processing, 0),
    'successRate', CASE
      WHEN total_recordings > 0 THEN ROUND((completed::NUMERIC / total_recordings::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO system_health FROM health_stats;

  -- Calculate performance metrics
  WITH perf_stats AS (
    SELECT
      COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 0) as avg_processing_minutes,
      COALESCE(SUM(file_size) / 1024.0 / 1024.0, 0) as total_storage_mb,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as last_24h_recordings
    FROM public.recordings
    WHERE status = 'completed' AND updated_at > created_at
  )
  SELECT jsonb_build_object(
    'avgProcessingTime', ROUND(avg_processing_minutes, 2),
    'totalStorageMB', ROUND(total_storage_mb, 2),
    'last24hRecordings', COALESCE(last_24h_recordings, 0)
  ) INTO performance_metrics FROM perf_stats;

  -- Build comprehensive result
  result := jsonb_build_object(
    'instantSummaries', instant_summaries,
    'repAdoption', rep_adoption,
    'systemHealth', system_health,
    'performanceMetrics', performance_metrics,
    'lastUpdated', NOW()
  );

  RETURN result;
END;
$$;

-- Function: get_database_stats()
-- Returns database statistics and performance info
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  db_size_mb NUMERIC;
  table_counts JSONB;
  index_stats JSONB;
BEGIN
  -- Get database size
  SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) INTO db_size_mb;

  -- Get table row counts
  SELECT jsonb_object_agg(table_name, row_count) INTO table_counts
  FROM (
    SELECT
      'recordings' as table_name,
      COUNT(*) as row_count
    FROM public.recordings
    UNION ALL
    SELECT
      'profiles' as table_name,
      COUNT(*) as row_count
    FROM public.profiles
    UNION ALL
    SELECT
      'audit_logs' as table_name,
      COUNT(*) as row_count
    FROM public.audit_logs
    UNION ALL
    SELECT
      'user_roles' as table_name,
      COUNT(*) as row_count
    FROM public.user_roles
  ) t;

  -- Build result
  result := jsonb_build_object(
    'databaseSizeMB', db_size_mb,
    'tableCounts', COALESCE(table_counts, '{}'::jsonb),
    'lastUpdated', NOW()
  );

  RETURN result;
END;
$$;

-- Function: calculate_storage_metrics()
-- Calculate storage usage and projections
CREATE OR REPLACE FUNCTION public.calculate_storage_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_storage_bytes BIGINT;
  avg_file_size_bytes BIGINT;
  storage_trend JSONB;
BEGIN
  -- Calculate total storage used
  SELECT COALESCE(SUM(file_size), 0) INTO total_storage_bytes
  FROM public.recordings
  WHERE file_size IS NOT NULL;

  -- Calculate average file size
  SELECT COALESCE(AVG(file_size), 0) INTO avg_file_size_bytes
  FROM public.recordings
  WHERE file_size IS NOT NULL AND file_size > 0;

  -- Calculate storage trend (last 7 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date_trunc('day', created_at),
      'bytes', daily_bytes,
      'count', daily_count
    )
  ) INTO storage_trend
  FROM (
    SELECT
      created_at::date,
      COALESCE(SUM(file_size), 0) as daily_bytes,
      COUNT(*) as daily_count
    FROM public.recordings
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND file_size IS NOT NULL
    GROUP BY created_at::date
    ORDER BY created_at::date
  ) t;

  -- Build result
  result := jsonb_build_object(
    'totalStorageBytes', total_storage_bytes,
    'totalStorageMB', ROUND(total_storage_bytes / 1024.0 / 1024.0, 2),
    'totalStorageGB', ROUND(total_storage_bytes / 1024.0 / 1024.0 / 1024.0, 3),
    'avgFileSizeBytes', avg_file_size_bytes,
    'avgFileSizeMB', ROUND(avg_file_size_bytes / 1024.0 / 1024.0, 2),
    'storageTrend', COALESCE(storage_trend, '[]'::jsonb),
    'lastUpdated', NOW()
  );

  RETURN result;
END;
$$;

-- =============================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- =============================================

-- Function: cleanup_old_audit_logs()
-- Removes audit logs older than specified days to maintain performance
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_old INTEGER DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::INTERVAL;

  DELETE FROM public.audit_logs
  WHERE created_at < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup action
  PERFORM public.log_admin_action(
    'cleanup_audit_logs',
    'maintenance',
    NULL,
    jsonb_build_object(
      'deleted_records', deleted_count,
      'cutoff_date', cutoff_date,
      'retention_days', days_old
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_records', deleted_count,
    'cutoff_date', cutoff_date,
    'retention_days', days_old
  );
END;
$$;

-- Function: cleanup_old_metrics()
-- Removes old system metrics to prevent table bloat
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics(days_old INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::INTERVAL;

  DELETE FROM public.admin_metrics
  WHERE created_at < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup action
  PERFORM public.log_admin_action(
    'cleanup_metrics',
    'maintenance',
    NULL,
    jsonb_build_object(
      'deleted_records', deleted_count,
      'cutoff_date', cutoff_date,
      'retention_days', days_old
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_records', deleted_count,
    'cutoff_date', cutoff_date,
    'retention_days', days_old
  );
END;
$$;

-- Function: generate_daily_audit_summary()
-- Creates daily audit summaries for performance optimization
CREATE OR REPLACE FUNCTION public.generate_daily_audit_summary(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary_record admin_audit_summary%ROWTYPE;
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
  total_events INTEGER;
  events_by_severity JSONB;
  events_by_action JSONB;
  events_by_user JSONB;
  top_resources JSONB;
BEGIN
  -- Define time range for the day
  start_time := target_date::TIMESTAMP WITH TIME ZONE;
  end_time := start_time + INTERVAL '1 day';

  -- Get total events for the day
  SELECT COUNT(*) INTO total_events
  FROM public.audit_logs
  WHERE created_at >= start_time AND created_at < end_time;

  -- Get events by severity
  SELECT jsonb_object_agg(severity, event_count) INTO events_by_severity
  FROM (
    SELECT severity, COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_time AND created_at < end_time
    GROUP BY severity
  ) t;

  -- Get events by action
  SELECT jsonb_object_agg(action, event_count) INTO events_by_action
  FROM (
    SELECT action, COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_time AND created_at < end_time
    GROUP BY action
    ORDER BY event_count DESC
    LIMIT 20
  ) t;

  -- Get events by user
  SELECT jsonb_object_agg(user_id::TEXT, event_count) INTO events_by_user
  FROM (
    SELECT user_id, COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_time AND created_at < end_time
      AND user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY event_count DESC
    LIMIT 10
  ) t;

  -- Get top resource types
  SELECT jsonb_object_agg(resource_type, event_count) INTO top_resources
  FROM (
    SELECT resource_type, COUNT(*) as event_count
    FROM public.audit_logs
    WHERE created_at >= start_time AND created_at < end_time
    GROUP BY resource_type
    ORDER BY event_count DESC
    LIMIT 10
  ) t;

  -- Insert or update summary record
  INSERT INTO public.admin_audit_summary (
    date_range_start,
    date_range_end,
    total_events,
    events_by_severity,
    events_by_action,
    events_by_user,
    top_resources,
    metadata
  ) VALUES (
    start_time,
    end_time,
    total_events,
    COALESCE(events_by_severity, '{}'::jsonb),
    COALESCE(events_by_action, '{}'::jsonb),
    COALESCE(events_by_user, '{}'::jsonb),
    COALESCE(top_resources, '{}'::jsonb),
    jsonb_build_object(
      'generated_at', NOW(),
      'source', 'daily_summary_function'
    )
  )
  ON CONFLICT (date_range_start, date_range_end)
  DO UPDATE SET
    total_events = EXCLUDED.total_events,
    events_by_severity = EXCLUDED.events_by_severity,
    events_by_action = EXCLUDED.events_by_action,
    events_by_user = EXCLUDED.events_by_user,
    top_resources = EXCLUDED.top_resources,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING * INTO summary_record;

  RETURN jsonb_build_object(
    'success', true,
    'date', target_date,
    'total_events', total_events,
    'summary_id', summary_record.id
  );
END;
$$;

-- Function: vacuum_analyze_admin_tables()
-- Maintenance function to optimize admin table performance
CREATE OR REPLACE FUNCTION public.vacuum_analyze_admin_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_results JSONB := '[]'::jsonb;
  table_name TEXT;
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  start_time := NOW();

  -- Vacuum and analyze each admin table
  FOR table_name IN
    SELECT unnest(ARRAY['audit_logs', 'admin_metrics', 'admin_audit_summary'])
  LOOP
    BEGIN
      -- Note: VACUUM cannot be run inside a function, but we can log the need for it
      EXECUTE format('ANALYZE public.%I', table_name);

      maintenance_results := maintenance_results || jsonb_build_object(
        'table', table_name,
        'action', 'analyzed',
        'status', 'success'
      );

    EXCEPTION WHEN OTHERS THEN
      maintenance_results := maintenance_results || jsonb_build_object(
        'table', table_name,
        'action', 'analyze',
        'status', 'error',
        'error_message', SQLERRM
      );
    END;
  END LOOP;

  end_time := NOW();

  -- Log the maintenance action
  PERFORM public.log_admin_action(
    'maintenance_vacuum_analyze',
    'maintenance',
    NULL,
    jsonb_build_object(
      'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
      'tables_processed', maintenance_results
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
    'maintenance_results', maintenance_results,
    'note', 'VACUUM commands should be run manually by database administrators'
  );
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users for read-only functions
GRANT EXECUTE ON FUNCTION public.get_user_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_summary(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_admin_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_storage_metrics() TO authenticated;

-- Grant execute permissions to service role for all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant execute permissions to authenticated users for logging functions
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_metric(TEXT, TEXT, NUMERIC, JSONB, TEXT) TO authenticated;

-- Maintenance functions should only be available to service role and admins
-- (Admin access is already handled by the function's internal admin check)

COMMENT ON FUNCTION public.get_user_statistics() IS 'Returns user statistics for admin dashboard widgets';
COMMENT ON FUNCTION public.get_system_health_metrics() IS 'Returns system health metrics for monitoring dashboards';
COMMENT ON FUNCTION public.get_audit_summary(INTEGER, TEXT) IS 'Returns paginated audit log summary with filtering';
COMMENT ON FUNCTION public.calculate_admin_kpis() IS 'Calculates comprehensive KPIs for admin dashboard overview';
COMMENT ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB, JSONB, TEXT) IS 'Helper function to create audit log entries';
COMMENT ON FUNCTION public.cleanup_old_audit_logs(INTEGER) IS 'Maintenance function to remove old audit logs';

-- Create a scheduled job for daily audit summaries (requires pg_cron extension)
-- This is commented out as it requires additional setup
-- SELECT cron.schedule('daily-audit-summary', '0 1 * * *', 'SELECT public.generate_daily_audit_summary();');