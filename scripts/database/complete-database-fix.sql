-- Complete Database Fix for SoundScribe
-- This script ensures all required tables exist and are properly configured
-- Run this in your Supabase SQL Editor

-- =============================================
-- ENABLE EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES (verify they exist)
-- =============================================

-- Profiles table (should already exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User roles table (should already exist)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator', 'viewer')),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Recordings table (should already exist with all required columns)
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('audio', 'video')),
  file_size BIGINT,
  duration INTEGER,
  status TEXT CHECK (status IN ('uploading', 'processing', 'completed', 'failed')) DEFAULT 'uploading',
  summary TEXT,
  transcript TEXT,
  ai_summary TEXT,
  ai_next_steps JSONB,
  ai_insights JSONB,
  ai_generated_at TIMESTAMP WITH TIME ZONE,
  ai_moments JSONB,
  coaching_evaluation JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  content_type TEXT DEFAULT 'other',
  enable_coaching BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- ANALYTICS TABLES (already created but verify)
-- =============================================

-- Speaker segments table
CREATE TABLE IF NOT EXISTS public.speaker_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  speaker_name TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic segments table
CREATE TABLE IF NOT EXISTS public.topic_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI moments table
CREATE TABLE IF NOT EXISTS public.ai_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('chapter','objection','sentiment_neg','bookmark','action')),
  start_time INTEGER NOT NULL,
  label TEXT,
  tooltip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN TABLES
-- =============================================

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'error')) DEFAULT 'info',
  status TEXT CHECK (status IN ('success', 'failure', 'pending')) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metric_type TEXT CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')) DEFAULT 'gauge',
  labels JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT CHECK (setting_type IN ('string', 'number', 'boolean', 'object', 'array')) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS idx_speaker_segments_recording ON public.speaker_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_topic_segments_recording ON public.topic_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_ai_moments_recording_type ON public.ai_moments(recording_id, type);

-- Admin table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON public.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON public.system_metrics(recorded_at);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STORAGE BUCKET
-- =============================================

-- Create storage bucket for recordings (skip if exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- ESSENTIAL FUNCTIONS
-- =============================================

-- Function to check if user is admin (prevents RLS recursion)
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BASIC RLS POLICIES (ESSENTIAL ONES ONLY)
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Recordings policies
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.recordings;
CREATE POLICY "Users can view their own recordings" ON public.recordings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.recordings;
CREATE POLICY "Users can insert their own recordings" ON public.recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recordings" ON public.recordings;
CREATE POLICY "Users can update their own recordings" ON public.recordings
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics tables policies (users can view their own recording's analytics)
DROP POLICY IF EXISTS "Users can view analytics for their recordings" ON public.speaker_segments;
CREATE POLICY "Users can view analytics for their recordings" ON public.speaker_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recordings r 
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view analytics for their recordings" ON public.topic_segments;
CREATE POLICY "Users can view analytics for their recordings" ON public.topic_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recordings r 
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view analytics for their recordings" ON public.ai_moments;
CREATE POLICY "Users can view analytics for their recordings" ON public.ai_moments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recordings r 
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

-- System can insert analytics data
DROP POLICY IF EXISTS "System can insert analytics" ON public.speaker_segments;
CREATE POLICY "System can insert analytics" ON public.speaker_segments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert analytics" ON public.topic_segments;
CREATE POLICY "System can insert analytics" ON public.topic_segments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert analytics" ON public.ai_moments;
CREATE POLICY "System can insert analytics" ON public.ai_moments
  FOR INSERT WITH CHECK (true);

-- Admin policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (current_user_is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recordings_updated_at ON public.recordings;
CREATE TRIGGER update_recordings_updated_at 
  BEFORE UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check that all tables exist
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
  required_tables TEXT[] := ARRAY[
    'profiles', 'user_roles', 'recordings', 'speaker_segments', 
    'topic_segments', 'ai_moments', 'audit_logs', 'system_metrics', 
    'admin_settings', 'chat_sessions', 'chat_messages'
  ];
BEGIN
  FOREACH table_name IN ARRAY required_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables exist!';
  END IF;
END $$;

-- Log completion
INSERT INTO public.audit_logs (
  user_email, action, resource_type, metadata, severity, created_at
) VALUES (
  'system@admin', 
  'complete_database_setup', 
  'database', 
  '{"tables_verified": true, "indexes_created": true, "policies_updated": true}', 
  'info', 
  NOW()
) ON CONFLICT DO NOTHING;
