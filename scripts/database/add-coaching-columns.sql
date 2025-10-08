-- Add content_type and enable_coaching fields to recordings table
-- Run this script directly in your Supabase dashboard when ready to enable the new features

-- Add the new columns
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS enable_coaching BOOLEAN DEFAULT true;

-- Create index for content_type to optimize queries
CREATE INDEX IF NOT EXISTS idx_recordings_content_type ON recordings(content_type);

-- Update existing records to have coaching enabled for call-related recordings
UPDATE recordings 
SET content_type = 'sales_call', enable_coaching = true 
WHERE LOWER(title) LIKE '%call%' OR LOWER(description) LIKE '%call%';

-- Add comments for documentation
COMMENT ON COLUMN recordings.content_type IS 'Type of content: sales_call, customer_support, team_meeting, training_session, other';
COMMENT ON COLUMN recordings.enable_coaching IS 'Whether AI coaching analysis should be performed for this recording';