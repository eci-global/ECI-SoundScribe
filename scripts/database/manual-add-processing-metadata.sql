-- Manual SQL script to add processing_metadata column
-- Run this in the Supabase SQL Editor

-- Add processing_metadata column to recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}';

-- Add index for efficient querying of processing metadata
CREATE INDEX IF NOT EXISTS idx_recordings_processing_metadata 
ON recordings USING GIN (processing_metadata);

-- Comment on the column
COMMENT ON COLUMN recordings.processing_metadata IS 'Stores processing pipeline metadata including progress, errors, and performance metrics';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recordings' AND column_name = 'processing_metadata';