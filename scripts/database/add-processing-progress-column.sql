-- Add processing_progress column to recordings table
-- Run this in the Supabase SQL Editor

-- Add processing_progress column (stores progress percentage as integer 0-100)
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

-- Add index for efficient querying of processing progress
CREATE INDEX IF NOT EXISTS idx_recordings_processing_progress 
ON recordings (processing_progress);

-- Comment on the column
COMMENT ON COLUMN recordings.processing_progress IS 'Stores processing progress as integer percentage (0-100)';

-- Verify both columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recordings' 
AND column_name IN ('processing_metadata', 'processing_progress')
ORDER BY column_name;