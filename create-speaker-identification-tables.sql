-- Create tables for enhanced speaker identification system

-- Table to store speaker confirmations for recordings
CREATE TABLE IF NOT EXISTS public.speaker_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE NOT NULL,
  confirmed_speakers JSONB NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store employee voice profiles for speaker identification
CREATE TABLE IF NOT EXISTS public.employee_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  voice_characteristics JSONB,
  is_active BOOLEAN DEFAULT true,
  recordings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store speaker identification results
CREATE TABLE IF NOT EXISTS public.speaker_identification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE NOT NULL,
  identified_speakers JSONB NOT NULL,
  identification_method TEXT NOT NULL, -- 'title_extraction', 'ai_analysis', 'voice_matching', 'manual'
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_speaker_confirmations_recording_id ON public.speaker_confirmations(recording_id);
CREATE INDEX IF NOT EXISTS idx_speaker_confirmations_confirmed_at ON public.speaker_confirmations(confirmed_at);

CREATE INDEX IF NOT EXISTS idx_employee_voice_profiles_employee_id ON public.employee_voice_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_voice_profiles_is_active ON public.employee_voice_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_speaker_identification_results_recording_id ON public.speaker_identification_results(recording_id);
CREATE INDEX IF NOT EXISTS idx_speaker_identification_results_method ON public.speaker_identification_results(identification_method);
CREATE INDEX IF NOT EXISTS idx_speaker_identification_results_status ON public.speaker_identification_results(processing_status);

-- RLS Policies
ALTER TABLE public.speaker_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_identification_results ENABLE ROW LEVEL SECURITY;

-- Policies for speaker_confirmations
CREATE POLICY "Users can view speaker confirmations for their recordings" ON public.speaker_confirmations
  FOR SELECT USING (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert speaker confirmations for their recordings" ON public.speaker_confirmations
  FOR INSERT WITH CHECK (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update speaker confirmations for their recordings" ON public.speaker_confirmations
  FOR UPDATE USING (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

-- Policies for employee_voice_profiles
CREATE POLICY "Users can view voice profiles for employees in their organization" ON public.employee_voice_profiles
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert voice profiles for their employees" ON public.employee_voice_profiles
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update voice profiles for their employees" ON public.employee_voice_profiles
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Policies for speaker_identification_results
CREATE POLICY "Users can view speaker identification results for their recordings" ON public.speaker_identification_results
  FOR SELECT USING (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert speaker identification results for their recordings" ON public.speaker_identification_results
  FOR INSERT WITH CHECK (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update speaker identification results for their recordings" ON public.speaker_identification_results
  FOR UPDATE USING (
    recording_id IN (
      SELECT id FROM public.recordings WHERE user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_speaker_confirmations_updated_at 
  BEFORE UPDATE ON public.speaker_confirmations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_voice_profiles_updated_at 
  BEFORE UPDATE ON public.employee_voice_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speaker_identification_results_updated_at 
  BEFORE UPDATE ON public.speaker_identification_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- This can be removed in production
INSERT INTO public.speaker_identification_results (
  recording_id,
  identified_speakers,
  identification_method,
  confidence_score,
  processing_status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual recording ID
  '{"speakers": [{"name": "John Smith", "confidence": 0.8, "source": "title"}]}',
  'title_extraction',
  0.8,
  'completed'
) ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Speaker identification tables created successfully!' as result;
