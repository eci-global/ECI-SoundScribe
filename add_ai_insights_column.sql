-- Add ai_insights column to recordings table for storing structured transcription data
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS ai_insights JSONB;

-- Add comment to describe the column
COMMENT ON COLUMN recordings.ai_insights IS 'Stores structured AI processing data including transcription segments, words, timing, and metadata'; 