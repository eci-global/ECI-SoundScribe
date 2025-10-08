-- Create UX Analysis table for storing interview analysis data
CREATE TABLE IF NOT EXISTS public.ux_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  employee_identification JSONB NOT NULL,
  question_analysis JSONB NOT NULL,
  solution_recommendations JSONB NOT NULL,
  call_breakdown JSONB NOT NULL,
  comprehensive_summary TEXT NOT NULL,
  next_steps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ux_analysis_recording_id ON public.ux_analysis(recording_id);
CREATE INDEX IF NOT EXISTS idx_ux_analysis_created_at ON public.ux_analysis(created_at);

-- Enable Row Level Security
ALTER TABLE public.ux_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own UX analysis" ON public.ux_analysis
  FOR SELECT USING (
    recording_id IN (
      SELECT id FROM public.recordings 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own UX analysis" ON public.ux_analysis
  FOR INSERT WITH CHECK (
    recording_id IN (
      SELECT id FROM public.recordings 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own UX analysis" ON public.ux_analysis
  FOR UPDATE USING (
    recording_id IN (
      SELECT id FROM public.recordings 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own UX analysis" ON public.ux_analysis
  FOR DELETE USING (
    recording_id IN (
      SELECT id FROM public.recordings 
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.ux_analysis TO authenticated;
GRANT ALL ON public.ux_analysis TO service_role;

-- Add comment
COMMENT ON TABLE public.ux_analysis IS 'Stores comprehensive UX interview analysis including employee identification, Q&A extraction, and solution recommendations';
