-- Recreate the recordings table with all necessary columns
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    file_url TEXT,
    file_type TEXT CHECK (file_type IN ('audio', 'video')),
    file_size BIGINT,
    duration NUMERIC,
    status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
    transcript TEXT,
    summary TEXT,
    ai_summary TEXT,
    ai_next_steps JSONB,
    ai_insights TEXT,
    ai_generated_at TIMESTAMP WITH TIME ZONE,
    ai_moments JSONB,
    coaching_evaluation JSONB,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS recordings_user_id_idx ON recordings(user_id);
CREATE INDEX IF NOT EXISTS recordings_status_idx ON recordings(status);
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recordings" ON recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings" ON recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" ON recordings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" ON recordings
    FOR DELETE USING (auth.uid() = user_id); 