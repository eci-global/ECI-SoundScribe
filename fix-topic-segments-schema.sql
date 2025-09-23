-- Fix missing 'category' column in topic_segments table
-- This should resolve the Edge function error: "Could not find the 'category' column"

-- Add the missing category column if it doesn't exist
ALTER TABLE topic_segments 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'discussion';

-- Add metadata column if it doesn't exist (for enhanced outline data)
ALTER TABLE topic_segments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add summary column if it doesn't exist
ALTER TABLE topic_segments 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topic_segments_category ON topic_segments(category);
CREATE INDEX IF NOT EXISTS idx_topic_segments_metadata ON topic_segments USING gin(metadata);

-- Add comment to document the metadata structure
COMMENT ON COLUMN topic_segments.metadata IS 'JSON structure: {key_points: string[], speakers: string[], decisions: string[], questions: string[], objections: string[], action_items: string[], sentiment: string, is_ai_generated: boolean, outline_quality: string}';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'topic_segments' 
AND table_schema = 'public'
ORDER BY ordinal_position;