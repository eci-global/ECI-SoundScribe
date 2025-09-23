-- Run this in the Supabase SQL editor to add missing columns
-- Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/editor

-- Add missing whisper analysis columns to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS whisper_segments JSONB,
ADD COLUMN IF NOT EXISTS whisper_metadata JSONB,
ADD COLUMN IF NOT EXISTS ai_speaker_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_speakers_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS recordings_whisper_segments_idx ON recordings USING GIN (whisper_segments);
CREATE INDEX IF NOT EXISTS recordings_ai_speaker_analysis_idx ON recordings USING GIN (ai_speaker_analysis);
CREATE INDEX IF NOT EXISTS recordings_ai_speakers_updated_at_idx ON recordings(ai_speakers_updated_at);

-- Update status constraint to include all possible statuses
ALTER TABLE recordings 
DROP CONSTRAINT IF EXISTS recordings_status_check;

ALTER TABLE recordings 
ADD CONSTRAINT recordings_status_check 
CHECK (status IN ('uploading', 'processing', 'queued', 'completed', 'failed', 'transcribing', 'transcribed', 'transcription_failed', 'processing_large_file'));

-- Fix duration column type if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recordings' 
        AND column_name = 'duration' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE recordings ALTER COLUMN duration TYPE NUMERIC USING duration::NUMERIC;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recordings' 
AND column_name IN ('whisper_segments', 'whisper_metadata', 'ai_speaker_analysis', 'duration', 'error_message')
ORDER BY column_name;