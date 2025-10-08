-- Employee Tracking and Scorecard System Migration
-- This migration adds comprehensive employee tracking capabilities

-- =============================================
-- EMPLOYEE MANAGEMENT TABLES
-- =============================================

-- Employee profiles table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL, -- Company employee ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT,
  role TEXT,
  manager_id UUID REFERENCES public.employees(id),
  team_id UUID REFERENCES public.teams(id),
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  voice_profile JSONB, -- Voice characteristics for identification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table for employee grouping
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES public.employees(id),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee call participation tracking
CREATE TABLE IF NOT EXISTS public.employee_call_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  participation_type TEXT NOT NULL CHECK (participation_type IN ('primary', 'secondary', 'observer')),
  talk_time_seconds INTEGER DEFAULT 0,
  talk_time_percentage NUMERIC(5,2) DEFAULT 0,
  speaker_segments JSONB, -- Array of speaker segments for this employee
  confidence_score NUMERIC(3,2) DEFAULT 0, -- AI confidence in identification
  manually_tagged BOOLEAN DEFAULT FALSE, -- Whether manually tagged vs auto-detected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee performance scorecards
CREATE TABLE IF NOT EXISTS public.employee_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  participation_id UUID NOT NULL REFERENCES public.employee_call_participation(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,2) NOT NULL,
  criteria_scores JSONB NOT NULL, -- Detailed scoring breakdown
  strengths TEXT[],
  improvements TEXT[],
  coaching_notes TEXT,
  manager_feedback TEXT,
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  evaluator_id UUID REFERENCES public.employees(id), -- Who evaluated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee performance trends and analytics
CREATE TABLE IF NOT EXISTS public.employee_performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  total_calls INTEGER DEFAULT 0,
  average_score NUMERIC(4,2) DEFAULT 0,
  score_trend NUMERIC(4,2) DEFAULT 0, -- Positive/negative trend
  top_strengths TEXT[],
  improvement_areas TEXT[],
  coaching_sessions INTEGER DEFAULT 0,
  manager_feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager coaching notes and feedback
CREATE TABLE IF NOT EXISTS public.manager_coaching_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.recordings(id),
  note_type TEXT NOT NULL CHECK (note_type IN ('coaching', 'feedback', 'recognition', 'improvement')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  action_items TEXT[],
  follow_up_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee voice profiles for identification
CREATE TABLE IF NOT EXISTS public.employee_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  voice_characteristics JSONB NOT NULL, -- Voice fingerprint data
  sample_recordings UUID[] DEFAULT '{}', -- Array of recording IDs used for training
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON public.employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Call participation indexes
CREATE INDEX IF NOT EXISTS idx_employee_call_participation_recording_id ON public.employee_call_participation(recording_id);
CREATE INDEX IF NOT EXISTS idx_employee_call_participation_employee_id ON public.employee_call_participation(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_call_participation_type ON public.employee_call_participation(participation_type);

-- Scorecard indexes
CREATE INDEX IF NOT EXISTS idx_employee_scorecards_employee_id ON public.employee_scorecards(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_scorecards_recording_id ON public.employee_scorecards(recording_id);
CREATE INDEX IF NOT EXISTS idx_employee_scorecards_evaluation_date ON public.employee_scorecards(evaluation_date);

-- Performance trends indexes
CREATE INDEX IF NOT EXISTS idx_employee_performance_trends_employee_id ON public.employee_performance_trends(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_performance_trends_period ON public.employee_performance_trends(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_employee_performance_trends_type ON public.employee_performance_trends(period_type);

-- Coaching notes indexes
CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_employee_id ON public.manager_coaching_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_manager_id ON public.manager_coaching_notes(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_status ON public.manager_coaching_notes(status);
CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_created_at ON public.manager_coaching_notes(created_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_call_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_voice_profiles ENABLE ROW LEVEL SECURITY;

-- Employee policies
CREATE POLICY "Users can view their own employee profile" ON public.employees
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own employee profile" ON public.employees
  FOR UPDATE USING (user_id = auth.uid());

-- Managers can view their team members
CREATE POLICY "Managers can view team members" ON public.employees
  FOR SELECT USING (
    id IN (
      SELECT id FROM public.employees 
      WHERE manager_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Call participation policies
CREATE POLICY "Users can view their own call participation" ON public.employee_call_participation
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Scorecard policies
CREATE POLICY "Users can view their own scorecards" ON public.employee_scorecards
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Performance trends policies
CREATE POLICY "Users can view their own performance trends" ON public.employee_performance_trends
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Coaching notes policies
CREATE POLICY "Users can view notes about them" ON public.manager_coaching_notes
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can view notes they created" ON public.manager_coaching_notes
  FOR SELECT USING (
    manager_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update employee updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_employee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employee updated_at
CREATE TRIGGER trigger_update_employee_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_employee_updated_at();

-- Function to calculate employee performance trends
CREATE OR REPLACE FUNCTION public.calculate_employee_performance_trend(
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_period_type TEXT
)
RETURNS TABLE (
  total_calls BIGINT,
  average_score NUMERIC,
  score_trend NUMERIC,
  top_strengths TEXT[],
  improvement_areas TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(es.id)::BIGINT as total_calls,
    COALESCE(AVG(es.overall_score), 0) as average_score,
    COALESCE(
      (AVG(es.overall_score) - LAG(AVG(es.overall_score)) OVER (ORDER BY es.evaluation_date)),
      0
    ) as score_trend,
    ARRAY_AGG(DISTINCT unnest(es.strengths)) as top_strengths,
    ARRAY_AGG(DISTINCT unnest(es.improvements)) as improvement_areas
  FROM public.employee_scorecards es
  WHERE es.employee_id = p_employee_id
    AND es.evaluation_date::DATE BETWEEN p_period_start AND p_period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to get employee performance summary
CREATE OR REPLACE FUNCTION public.get_employee_performance_summary(p_employee_id UUID)
RETURNS TABLE (
  employee_name TEXT,
  total_calls BIGINT,
  current_score NUMERIC,
  score_trend NUMERIC,
  recent_strengths TEXT[],
  recent_improvements TEXT[],
  coaching_notes_count BIGINT,
  last_evaluation_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    COUNT(es.id)::BIGINT as total_calls,
    COALESCE(AVG(es.overall_score), 0) as current_score,
    COALESCE(
      (AVG(es.overall_score) - LAG(AVG(es.overall_score)) OVER (ORDER BY es.evaluation_date)),
      0
    ) as score_trend,
    ARRAY_AGG(DISTINCT unnest(es.strengths)) as recent_strengths,
    ARRAY_AGG(DISTINCT unnest(es.improvements)) as recent_improvements,
    COUNT(mcn.id)::BIGINT as coaching_notes_count,
    MAX(es.evaluation_date) as last_evaluation_date
  FROM public.employees e
  LEFT JOIN public.employee_scorecards es ON e.id = es.employee_id
  LEFT JOIN public.manager_coaching_notes mcn ON e.id = mcn.employee_id
  WHERE e.id = p_employee_id
  GROUP BY e.id, e.first_name, e.last_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample teams
INSERT INTO public.teams (name, description, department) VALUES
  ('Sales Team Alpha', 'Primary sales team for enterprise accounts', 'Sales'),
  ('BDR Team Beta', 'Business Development Representatives', 'Sales'),
  ('Support Team Gamma', 'Customer support and success', 'Support')
ON CONFLICT DO NOTHING;

-- Insert sample employees (these would typically be created through the application)
-- Note: These are just examples - actual implementation would use real user data
INSERT INTO public.employees (employee_id, first_name, last_name, email, department, role, team_id) VALUES
  ('EMP001', 'John', 'Smith', 'john.smith@company.com', 'Sales', 'Sales Manager', (SELECT id FROM public.teams WHERE name = 'Sales Team Alpha')),
  ('EMP002', 'Sarah', 'Johnson', 'sarah.johnson@company.com', 'Sales', 'BDR', (SELECT id FROM public.teams WHERE name = 'BDR Team Beta')),
  ('EMP003', 'Mike', 'Davis', 'mike.davis@company.com', 'Sales', 'BDR', (SELECT id FROM public.teams WHERE name = 'BDR Team Beta'))
ON CONFLICT (employee_id) DO NOTHING;
