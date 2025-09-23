-- Fix Audit Log View for AuditLogTable Component
-- First ensure the audit_logs table exists, then create a view
-- Created: 2025-09-18

-- Ensure audit_logs table has the required columns
-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add severity column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'audit_logs'
                 AND column_name = 'severity') THEN
    ALTER TABLE public.audit_logs ADD COLUMN severity TEXT DEFAULT 'info';
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_severity_check
      CHECK (severity IN ('info', 'warning', 'error', 'critical'));
  END IF;
END $$;

-- Create a view that provides the data structure expected by AuditLogTable component
-- Using a simpler approach that just adds user_email column via function
CREATE OR REPLACE VIEW public.audit_log_entries AS
SELECT
  al.id,
  al.created_at,
  COALESCE(
    (SELECT email FROM public.profiles WHERE id = al.user_id),
    (SELECT email FROM auth.users WHERE id = al.user_id),
    'System'
  ) as user_email,
  al.action,
  al.resource_type,
  al.resource_id,
  COALESCE(al.severity, 'info') as severity
FROM public.audit_logs al;

-- Enable RLS on audit_logs if not already enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit_logs
DROP POLICY IF EXISTS "Admin access to audit_logs" ON public.audit_logs;
CREATE POLICY "Admin access to audit_logs" ON public.audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_log_entries TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.audit_log_entries IS 'Audit log entries with user email information for AuditLogTable component';