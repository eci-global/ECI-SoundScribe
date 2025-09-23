-- ============================================================================
-- CHECK RLS POLICIES STATUS
-- ============================================================================
-- Run this in Supabase Dashboard SQL Editor to check if policies exist
-- ============================================================================

-- Check all policies for topic_segments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'topic_segments'
ORDER BY policyname;

-- Check all policies for speaker_segments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'speaker_segments'
ORDER BY policyname;

-- Check if service role policies exist
SELECT COUNT(*) as service_role_policies_count
FROM pg_policies 
WHERE tablename IN ('topic_segments', 'speaker_segments')
AND policyname LIKE '%Service role%';

-- Check recent topic_segments data to see if auto-generation is working
SELECT id, recording_id, topic, category, confidence, 
       metadata ? 'key_points' as has_key_points,
       metadata ? 'decisions' as has_decisions,
       metadata ? 'action_items' as has_action_items,
       created_at
FROM topic_segments 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================================================
-- If policies already exist but data isn't showing:
-- 1. The auto-generation might be working but UI isn't displaying it
-- 2. Check browser console for any JavaScript errors
-- 3. Verify recording has transcript and auto-generation is triggering
-- ============================================================================