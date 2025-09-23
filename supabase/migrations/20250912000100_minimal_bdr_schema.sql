-- Minimal BDR schema for testing upload-scorecard-data function

-- Create recordings table (basic version)
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR training programs table
CREATE TABLE IF NOT EXISTS bdr_training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR upload tracking table
CREATE TABLE IF NOT EXISTS bdr_upload_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  upload_status TEXT DEFAULT 'processing',
  processed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training-data table (with hyphen)
CREATE TABLE IF NOT EXISTS "training-data" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR training batches table
CREATE TABLE IF NOT EXISTS bdr_training_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR training datasets table
CREATE TABLE IF NOT EXISTS bdr_training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id),
  manager_scores JSONB,
  ai_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR scorecard evaluations table
CREATE TABLE IF NOT EXISTS bdr_scorecard_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id),
  scores JSONB,
  evaluator_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BDR call classifications table
CREATE TABLE IF NOT EXISTS bdr_call_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id),
  classification TEXT,
  confidence DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert minimal seed data for BDR programs
INSERT INTO bdr_training_programs (id, name, description, criteria) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default BDR Program',
  'Default BDR training program for testing',
  '{"opening": {"weight": 1}, "clear_confident": {"weight": 1}, "pattern_interrupt": {"weight": 1}, "tone_energy": {"weight": 1}, "closing": {"weight": 1}}'::jsonb
) ON CONFLICT (id) DO NOTHING;