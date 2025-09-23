-- Fix BDR Scorecard Evaluations Schema
-- Add missing structured columns that the Edge Functions expect but don't exist in current schema

-- Add all missing columns to bdr_scorecard_evaluations table
ALTER TABLE bdr_scorecard_evaluations 
ADD COLUMN IF NOT EXISTS call_classification_id UUID,
ADD COLUMN IF NOT EXISTS training_program_id UUID REFERENCES bdr_training_programs(id),
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS overall_score DECIMAL,
ADD COLUMN IF NOT EXISTS criteria_scores JSONB,
ADD COLUMN IF NOT EXISTS bdr_insights JSONB,
ADD COLUMN IF NOT EXISTS improvement_areas JSONB,
ADD COLUMN IF NOT EXISTS strengths JSONB,
ADD COLUMN IF NOT EXISTS coaching_notes TEXT,
ADD COLUMN IF NOT EXISTS ai_model_version TEXT,
ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bdr_scorecard_evaluations_recording_id 
ON bdr_scorecard_evaluations(recording_id);

CREATE INDEX IF NOT EXISTS idx_bdr_scorecard_evaluations_user_id 
ON bdr_scorecard_evaluations(user_id);

CREATE INDEX IF NOT EXISTS idx_bdr_scorecard_evaluations_training_program_id 
ON bdr_scorecard_evaluations(training_program_id);

CREATE INDEX IF NOT EXISTS idx_bdr_scorecard_evaluations_evaluated_at 
ON bdr_scorecard_evaluations(evaluated_at DESC);

-- Update RLS policies to include new columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bdr_scorecard_evaluations' 
    AND policyname = 'Users can view their BDR evaluations'
  ) THEN
    CREATE POLICY "Users can view their BDR evaluations" ON bdr_scorecard_evaluations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant permissions for new columns
GRANT ALL ON bdr_scorecard_evaluations TO service_role;
GRANT SELECT ON bdr_scorecard_evaluations TO authenticated;

-- Add a comment explaining the schema fix
COMMENT ON TABLE bdr_scorecard_evaluations IS 'BDR scorecard evaluations with structured columns for overallScore, criteriaScores, and bdrInsights. Updated 2025-01-16 to fix schema mismatch between Edge Functions and database.';