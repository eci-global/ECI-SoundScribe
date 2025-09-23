-- Fix RLS policies for recordings table to allow authenticated users to insert/update/select

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can view all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can insert recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can update all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can delete all recordings" ON public.recordings;

-- Create comprehensive policies for recordings table

-- Users can view their own recordings
CREATE POLICY "Users can view their own recordings" ON public.recordings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own recordings
CREATE POLICY "Users can insert their own recordings" ON public.recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recordings
CREATE POLICY "Users can update their own recordings" ON public.recordings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own recordings
CREATE POLICY "Users can delete their own recordings" ON public.recordings
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies (admins can access all recordings)
CREATE POLICY "Admins can view all recordings" ON public.recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert any recording" ON public.recordings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all recordings" ON public.recordings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete all recordings" ON public.recordings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Ensure the recordings table has the correct structure
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recordings' AND column_name = 'user_id') THEN
        ALTER TABLE public.recordings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

SELECT 'Recordings RLS policies updated successfully' as status; 