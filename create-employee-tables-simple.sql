-- Create Employee Tables (Simplified - No Foreign Keys)
-- Run this in Supabase Dashboard -> SQL Editor

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT,
  role TEXT,
  manager_id UUID,
  team_id UUID,
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  voice_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee call participation table
CREATE TABLE IF NOT EXISTS public.employee_call_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  participation_type TEXT NOT NULL CHECK (participation_type IN ('primary', 'secondary', 'observer')),
  talk_time_seconds INTEGER DEFAULT 0,
  talk_time_percentage NUMERIC(5,2) DEFAULT 0,
  speaker_segments JSONB,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  manually_tagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee scorecards table
CREATE TABLE IF NOT EXISTS public.employee_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  scorecard_type TEXT NOT NULL CHECK (scorecard_type IN ('bdr', 'sales', 'customer_service', 'custom')),
  overall_score NUMERIC(5,2),
  criteria_scores JSONB,
  feedback TEXT,
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee performance trends table
CREATE TABLE IF NOT EXISTS public.employee_performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(10,2),
  metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create manager coaching notes table
CREATE TABLE IF NOT EXISTS public.manager_coaching_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  note_type TEXT NOT NULL CHECK (note_type IN ('positive', 'improvement', 'action_item', 'general')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee voice profiles table
CREATE TABLE IF NOT EXISTS public.employee_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  voice_characteristics JSONB NOT NULL,
  sample_recordings TEXT[],
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  last_trained TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_teams_department ON public.teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);

CREATE INDEX IF NOT EXISTS idx_employee_call_participation_employee_id ON public.employee_call_participation(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_call_participation_recording_id ON public.employee_call_participation(recording_id);

CREATE INDEX IF NOT EXISTS idx_employee_scorecards_employee_id ON public.employee_scorecards(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_scorecards_recording_id ON public.employee_scorecards(recording_id);

CREATE INDEX IF NOT EXISTS idx_employee_performance_trends_employee_id ON public.employee_performance_trends(employee_id);

CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_employee_id ON public.manager_coaching_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_coaching_notes_status ON public.manager_coaching_notes(status);

CREATE INDEX IF NOT EXISTS idx_employee_voice_profiles_employee_id ON public.employee_voice_profiles(employee_id);

-- Insert sample teams (only if teams table is empty)
INSERT INTO public.teams (id, name, description, department) 
SELECT * FROM (VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Sales Team Alpha', 'Primary sales team for enterprise accounts', 'Sales'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Customer Success', 'Customer success and retention team', 'Customer Success'),
  ('550e8400-e29b-41d4-a716-446655440003', 'BDR Team', 'Business Development Representatives', 'Sales')
) AS t(id, name, description, department)
WHERE NOT EXISTS (SELECT 1 FROM public.teams LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Employee tracking tables created successfully! You can now use the Employee Management features.' as result;
