-- Fix missing RLS policies for bdr_scorecard_evaluations table
-- This was preventing the upload-scorecard-data Edge Function from inserting evaluation records

-- Add the missing service role policy for bdr_scorecard_evaluations (same pattern as other BDR tables)
CREATE POLICY "Service role full access to scorecard evaluations" ON bdr_scorecard_evaluations
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

-- Also add INSERT policy for authenticated users (managers creating evaluations)
CREATE POLICY "Authenticated users can create evaluations" ON bdr_scorecard_evaluations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

-- Ensure service role has all permissions
GRANT ALL ON bdr_scorecard_evaluations TO service_role;

-- Add comment explaining the fix
COMMENT ON POLICY "Service role full access to scorecard evaluations" ON bdr_scorecard_evaluations IS 
'Allows Edge Functions (service role) to create BDR evaluation records from manager scorecard uploads. Fixed 2025-09-17 - was missing this critical policy causing silent insertion failures.';