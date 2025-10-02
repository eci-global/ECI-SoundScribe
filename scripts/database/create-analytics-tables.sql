-- Create missing analytics tables for SoundScribe
-- Run this in your Supabase SQL Editor

-- 1. Create speaker_segments table
CREATE TABLE IF NOT EXISTS public.speaker_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  speaker_name TEXT NOT NULL,
  start_time INTEGER NOT NULL, -- in seconds
  end_time INTEGER NOT NULL,   -- in seconds
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create topic_segments table
CREATE TABLE IF NOT EXISTS public.topic_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create ai_moments table
CREATE TABLE IF NOT EXISTS public.ai_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('chapter','objection','sentiment_neg','bookmark','action','decision','quote')),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  label TEXT,
  tooltip TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_speaker_segments_recording ON public.speaker_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_speaker_segments_time ON public.speaker_segments(recording_id, start_time);
CREATE INDEX IF NOT EXISTS idx_topic_segments_recording ON public.topic_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_topic_segments_time ON public.topic_segments(recording_id, start_time);
CREATE INDEX IF NOT EXISTS idx_ai_moments_recording ON public.ai_moments(recording_id);
CREATE INDEX IF NOT EXISTS idx_ai_moments_time ON public.ai_moments(recording_id, start_time);

-- 5. Enable Row-Level Security
ALTER TABLE public.speaker_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (users can access data for their own recordings)
-- Speaker segments policies
CREATE POLICY "Users can view speaker segments for their recordings" ON public.speaker_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recordings 
            WHERE recordings.id = speaker_segments.recording_id 
            AND recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert speaker segments" ON public.speaker_segments
    FOR INSERT WITH CHECK (true);

-- Topic segments policies  
CREATE POLICY "Users can view topic segments for their recordings" ON public.topic_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recordings 
            WHERE recordings.id = topic_segments.recording_id 
            AND recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert topic segments" ON public.topic_segments
    FOR INSERT WITH CHECK (true);

-- AI moments policies
CREATE POLICY "Users can view ai moments for their recordings" ON public.ai_moments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recordings 
            WHERE recordings.id = ai_moments.recording_id 
            AND recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert ai moments" ON public.ai_moments
    FOR INSERT WITH CHECK (true);

-- 7. Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('speaker_segments', 'topic_segments', 'ai_moments')
ORDER BY tablename; 