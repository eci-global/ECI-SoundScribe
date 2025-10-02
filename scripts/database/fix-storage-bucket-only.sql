-- ===============================================
-- Fix Supabase Storage Bucket Size Limit ONLY
-- ===============================================
-- 🚀 CRITICAL: This fixes the 413 "Payload too large" error for 70MB+ files
-- 
-- INSTRUCTIONS TO APPLY:
-- 1. Go to https://supabase.com/dashboard/project/qinkldgvejheppheykfl
-- 2. Navigate to SQL Editor in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this ENTIRE SQL script
-- 5. Click "Run" to execute
--
-- This updates ONLY the bucket configuration (no policy changes)

-- Update the recordings bucket to allow 2GB files
UPDATE storage.buckets 
SET file_size_limit = 2147483648  -- 2GB in bytes
WHERE id = 'recordings';

-- Verify the update was successful
SELECT 
  id,
  name,
  public,
  file_size_limit,
  file_size_limit / 1024 / 1024 / 1024 as size_in_gb,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'recordings';

-- This should show file_size_limit = 2147483648 and size_in_gb = 2