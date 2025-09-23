-- Add scorecard_criteria column and other missing columns to bdr_training_programs
-- This enables storing extracted scoring rubric data from CSV uploads

-- Add missing columns that edge functions expect
ALTER TABLE bdr_training_programs
  ADD COLUMN IF NOT EXISTS scorecard_criteria JSONB,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS target_score_threshold DECIMAL(4,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS minimum_calls_required INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance on active programs
CREATE INDEX IF NOT EXISTS idx_bdr_training_programs_active
  ON bdr_training_programs(is_active)
  WHERE is_active = true;

-- Update existing records to have default values
UPDATE bdr_training_programs
SET
  is_active = COALESCE(is_active, true),
  target_score_threshold = COALESCE(target_score_threshold, 2.5),
  minimum_calls_required = COALESCE(minimum_calls_required, 5),
  version = COALESCE(version, 1),
  updated_at = COALESCE(updated_at, NOW())
WHERE scorecard_criteria IS NULL;

-- Comment for documentation
COMMENT ON COLUMN bdr_training_programs.scorecard_criteria IS 'JSONB array of BDR scoring criteria extracted from CSV uploads. Replaces hardcoded DEFAULT_BDR_CRITERIA in edge functions.';
COMMENT ON COLUMN bdr_training_programs.target_score_threshold IS 'Minimum average score (0-4 scale) required to pass the training program.';
COMMENT ON COLUMN bdr_training_programs.minimum_calls_required IS 'Number of calls required before completion evaluation.';