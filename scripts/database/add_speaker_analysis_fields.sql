-- Add AI speaker analysis fields to recordings table
-- This migration adds fields to store enhanced AI speaker identification data

ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS ai_speaker_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_speakers_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance on AI speaker analysis
CREATE INDEX IF NOT EXISTS idx_recordings_ai_speaker_analysis 
ON recordings USING GIN (ai_speaker_analysis) 
WHERE ai_speaker_analysis IS NOT NULL;

-- Add index for speakers updated timestamp
CREATE INDEX IF NOT EXISTS idx_recordings_ai_speakers_updated_at 
ON recordings (ai_speakers_updated_at) 
WHERE ai_speakers_updated_at IS NOT NULL;

-- Update existing recordings to have empty speaker analysis if needed
-- This is optional and can be run if you want to initialize existing records
-- UPDATE recordings 
-- SET ai_speaker_analysis = '{"identified_speakers": [], "unidentified_segments": [], "confidence_score": 0, "analysis_method": "not_analyzed"}'::jsonb
-- WHERE ai_speaker_analysis IS NULL AND transcript IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN recordings.ai_speaker_analysis IS 'JSONB field containing AI-analyzed speaker identification data including names, confidence scores, and segments';
COMMENT ON COLUMN recordings.ai_speakers_updated_at IS 'Timestamp when AI speaker analysis was last updated or corrected by user';