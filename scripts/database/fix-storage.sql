-- ===============================================
-- Fix Supabase Storage Configuration for Production
-- ===============================================
-- 🚀 CRITICAL: This fixes the 413 "Payload too large" error for 70MB+ files
-- 
-- INSTRUCTIONS TO APPLY:
-- 1. Go to https://supabase.com/dashboard/project/qinkldgvejheppheykfl
-- 2. Navigate to SQL Editor in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this ENTIRE SQL script
-- 5. Click "Run" to execute
-- 6. Verify success by checking the output shows "Storage configuration completed successfully! 🎉"
--
-- This will update your production storage bucket to allow 2GB file uploads

-- 1. Create the recordings bucket if it doesn't exist (with proper settings)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings', 
  'recordings', 
  true,
  2147483648, -- 2GB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 2147483648,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;

-- 3. Create new RLS policies for storage.objects

-- Allow public read access to all recordings (for playback)
CREATE POLICY "Public can view recordings" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'recordings');

-- Allow authenticated users to upload recordings to their own folder
CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own recordings
CREATE POLICY "Users can update own recordings" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'recordings'
    AND auth.role() = 'authenticated' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own recordings  
CREATE POLICY "Users can delete own recordings" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'recordings'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Verify the setup (this will show you the bucket configuration)
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'recordings';

-- 6. Show current policies (for verification)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%recording%';

-- Success message
SELECT 'Storage configuration completed successfully! 🎉' as status;