-- Create manager feedback corrections table
-- This table stores manager corrections to AI-generated BDR evaluations

CREATE TABLE IF NOT EXISTS public.manager_feedback_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.bdr_scorecard_evaluations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  
  -- Original AI scores for comparison
  original_ai_scores JSONB NOT NULL,
  original_overall_score DECIMAL NOT NULL,
  
  -- Manager corrections
  corrected_scores JSONB NOT NULL,
  corrected_overall_score DECIMAL NOT NULL,
  
  -- Individual criteria adjustments (0-4 scale)
  criteria_adjustments JSONB NOT NULL DEFAULT '{}',
  
  -- Coaching notes corrections
  original_coaching_notes TEXT,
  corrected_coaching_notes TEXT,
  
  -- Reason for changes
  change_reason TEXT NOT NULL CHECK (change_reason IN (
    'too_lenient', 
    'too_strict', 
    'missed_context', 
    'inaccurate_assessment', 
    'bias_detected', 
    'missing_criteria', 
    'other'
  )),
  
  -- Additional context
  manager_notes TEXT,
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5) DEFAULT 3,
  
  -- Variance tracking
  score_variance DECIMAL GENERATED ALWAYS AS (ABS(corrected_overall_score - original_overall_score)) STORED,
  high_variance BOOLEAN GENERATED ALWAYS AS (ABS(corrected_overall_score - original_overall_score) > 1.0) STORED,
  
  -- Status and metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'under_review')),
  applied_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_evaluation_id 
ON public.manager_feedback_corrections(evaluation_id);

CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_manager_id 
ON public.manager_feedback_corrections(manager_id);

CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_recording_id 
ON public.manager_feedback_corrections(recording_id);

CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_high_variance 
ON public.manager_feedback_corrections(high_variance) WHERE high_variance = true;

CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_status 
ON public.manager_feedback_corrections(status);

CREATE INDEX IF NOT EXISTS idx_manager_feedback_corrections_created_at 
ON public.manager_feedback_corrections(created_at DESC);

-- Create RLS policies
ALTER TABLE public.manager_feedback_corrections ENABLE ROW LEVEL SECURITY;

-- Managers can view their own feedback corrections
CREATE POLICY "Managers can view their feedback corrections" ON public.manager_feedback_corrections
  FOR SELECT USING (auth.uid() = manager_id);

-- Managers can create feedback corrections
CREATE POLICY "Managers can create feedback corrections" ON public.manager_feedback_corrections
  FOR INSERT WITH CHECK (auth.uid() = manager_id);

-- Managers can update their own feedback corrections (before applied)
CREATE POLICY "Managers can update their feedback corrections" ON public.manager_feedback_corrections
  FOR UPDATE USING (auth.uid() = manager_id AND status = 'pending');

-- Service role can manage all feedback corrections
CREATE POLICY "Service role can manage feedback corrections" ON public.manager_feedback_corrections
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.manager_feedback_corrections TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.manager_feedback_corrections TO authenticated;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_manager_feedback_corrections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_manager_feedback_corrections_updated_at
  BEFORE UPDATE ON public.manager_feedback_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_manager_feedback_corrections_updated_at();

-- Create function to apply manager corrections to AI calibration
CREATE OR REPLACE FUNCTION public.apply_manager_corrections_to_calibration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply corrections when status changes to 'applied'
  IF NEW.status = 'applied' AND OLD.status != 'applied' THEN
    -- Update the evaluation with corrected scores
    UPDATE public.bdr_scorecard_evaluations 
    SET 
      criteria_scores = NEW.corrected_scores,
      overall_score = NEW.corrected_overall_score,
      coaching_notes = COALESCE(NEW.corrected_coaching_notes, coaching_notes),
      updated_at = NOW()
    WHERE id = NEW.evaluation_id;
    
    -- Log the application
    NEW.applied_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply corrections
CREATE TRIGGER trigger_apply_manager_corrections
  AFTER UPDATE ON public.manager_feedback_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_manager_corrections_to_calibration();

-- Add comment explaining the table purpose
COMMENT ON TABLE public.manager_feedback_corrections IS 'Stores manager corrections to AI-generated BDR evaluations for calibration and training';
COMMENT ON COLUMN public.manager_feedback_corrections.score_variance IS 'Absolute difference between original and corrected overall scores';
COMMENT ON COLUMN public.manager_feedback_corrections.high_variance IS 'True when score variance exceeds 1.0 points, indicating significant disagreement';
