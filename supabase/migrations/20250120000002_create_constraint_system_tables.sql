-- Create constraint system tables for real-time AI calibration

-- AI Calibration Constraints table
CREATE TABLE IF NOT EXISTS public.ai_calibration_constraints (
  id TEXT PRIMARY KEY DEFAULT 'current',
  constraints JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint Updates log table
CREATE TABLE IF NOT EXISTS public.constraint_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('manager_feedback', 'validation_workflow', 'system_calibration')),
  correction_id UUID REFERENCES public.manager_feedback_corrections(id),
  validation_id UUID,
  changes JSONB NOT NULL DEFAULT '{}',
  applied BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Queue table
CREATE TABLE IF NOT EXISTS public.validation_queue (
  id TEXT PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES public.bdr_scorecard_evaluations(id) ON DELETE CASCADE,
  ai_score DECIMAL NOT NULL,
  historical_average DECIMAL NOT NULL,
  variance DECIMAL NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  criteria TEXT[] NOT NULL DEFAULT '{}',
  assigned_manager UUID REFERENCES public.profiles(id),
  assigned_manager_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'validated', 'rejected')),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  manager_notes TEXT,
  score_adjustments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_at TIMESTAMP WITH TIME ZONE
);

-- Validation Alerts table
CREATE TABLE IF NOT EXISTS public.validation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('high_variance', 'pattern_anomaly', 'bias_detected', 'system_error')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  evaluation_id UUID REFERENCES public.bdr_scorecard_evaluations(id),
  recording_id UUID REFERENCES public.recordings(id),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Calibration Logs table
CREATE TABLE IF NOT EXISTS public.ai_calibration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT,
  constraints_before JSONB,
  constraints_after JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_constraint_updates_timestamp 
ON public.constraint_updates(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_constraint_updates_type 
ON public.constraint_updates(type);

CREATE INDEX IF NOT EXISTS idx_validation_queue_status 
ON public.validation_queue(status);

CREATE INDEX IF NOT EXISTS idx_validation_queue_priority 
ON public.validation_queue(priority);

CREATE INDEX IF NOT EXISTS idx_validation_queue_assigned_manager 
ON public.validation_queue(assigned_manager);

CREATE INDEX IF NOT EXISTS idx_validation_queue_created_at 
ON public.validation_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_alerts_severity 
ON public.validation_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_validation_alerts_resolved 
ON public.validation_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_validation_alerts_created_at 
ON public.validation_alerts(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.ai_calibration_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constraint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_calibration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_calibration_constraints
CREATE POLICY "Service role can manage calibration constraints" ON public.ai_calibration_constraints
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view calibration constraints" ON public.ai_calibration_constraints
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for constraint_updates
CREATE POLICY "Service role can manage constraint updates" ON public.constraint_updates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view constraint updates" ON public.constraint_updates
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for validation_queue
CREATE POLICY "Managers can view their validation queue" ON public.validation_queue
  FOR SELECT USING (auth.uid() = assigned_manager);

CREATE POLICY "Service role can manage validation queue" ON public.validation_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view validation queue" ON public.validation_queue
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for validation_alerts
CREATE POLICY "Managers can view validation alerts" ON public.validation_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage validation alerts" ON public.validation_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for ai_calibration_logs
CREATE POLICY "Service role can manage calibration logs" ON public.ai_calibration_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view calibration logs" ON public.ai_calibration_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.ai_calibration_constraints TO service_role;
GRANT SELECT ON public.ai_calibration_constraints TO authenticated;

GRANT ALL ON public.constraint_updates TO service_role;
GRANT SELECT ON public.constraint_updates TO authenticated;

GRANT ALL ON public.validation_queue TO service_role;
GRANT SELECT, UPDATE ON public.validation_queue TO authenticated;

GRANT ALL ON public.validation_alerts TO service_role;
GRANT SELECT, UPDATE ON public.validation_alerts TO authenticated;

GRANT ALL ON public.ai_calibration_logs TO service_role;
GRANT SELECT ON public.ai_calibration_logs TO authenticated;

-- Create function to automatically assign validation items
CREATE OR REPLACE FUNCTION public.auto_assign_validation_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign if no manager is assigned and priority is high or critical
  IF NEW.assigned_manager IS NULL AND NEW.priority IN ('high', 'critical') THEN
    -- Find available manager with least workload
    SELECT id INTO NEW.assigned_manager
    FROM public.profiles
    WHERE role = 'manager' 
      AND is_active = true
      AND id NOT IN (
        SELECT assigned_manager 
        FROM public.validation_queue 
        WHERE status = 'pending' 
          AND assigned_manager IS NOT NULL
      )
    ORDER BY (
      SELECT COUNT(*) 
      FROM public.validation_queue vq 
      WHERE vq.assigned_manager = profiles.id 
        AND vq.status = 'pending'
    ) ASC
    LIMIT 1;
    
    -- Update assigned_at timestamp
    IF NEW.assigned_manager IS NOT NULL THEN
      NEW.assigned_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
CREATE TRIGGER trigger_auto_assign_validation_items
  BEFORE INSERT ON public.validation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_validation_items();

-- Create function to update constraint timestamp
CREATE OR REPLACE FUNCTION public.update_constraint_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for constraint timestamp
CREATE TRIGGER trigger_update_constraint_timestamp
  BEFORE UPDATE ON public.ai_calibration_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_constraint_timestamp();

-- Add comments
COMMENT ON TABLE public.ai_calibration_constraints IS 'Stores current AI calibration constraints based on manager feedback';
COMMENT ON TABLE public.constraint_updates IS 'Logs all constraint updates for audit and debugging';
COMMENT ON TABLE public.validation_queue IS 'Queue of AI evaluations requiring manager validation';
COMMENT ON TABLE public.validation_alerts IS 'System alerts for validation issues and anomalies';
COMMENT ON TABLE public.ai_calibration_logs IS 'Audit log of AI calibration system changes';
