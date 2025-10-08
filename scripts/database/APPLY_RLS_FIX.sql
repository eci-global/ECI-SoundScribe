-- ============================================================================
-- IMPORTANT: Run this SQL in Supabase Dashboard SQL Editor
-- ============================================================================
-- This fixes RLS policies to allow the analyze-speakers-topics Edge function 
-- to insert topic segments and speaker segments using the service role.
-- Without this fix, the Edge function will fail silently when trying to save data.
-- ============================================================================

-- Add service role policy for topic_segments table
CREATE POLICY "Service role can manage topic segments" ON topic_segments
  FOR ALL USING (
    -- Allow service role full access
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Add service role policy for speaker_segments table  
CREATE POLICY "Service role can manage speaker segments" ON speaker_segments
  FOR ALL USING (
    -- Allow service role full access
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Add service role policy for ai_moments table (for consistency)
CREATE POLICY "Service role can manage ai moments" ON ai_moments
  FOR ALL USING (
    -- Allow service role full access
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- Verification: Check that policies were created successfully
-- ============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('topic_segments', 'speaker_segments', 'ai_moments')
AND policyname LIKE '%Service role%';

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Verify the policies were created in the results
-- 5. Test the Call Outline auto-generation
-- ============================================================================