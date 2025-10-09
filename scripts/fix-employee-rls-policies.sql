-- Manual RLS Policy Fix for Supabase Dashboard
-- Copy and paste these statements into the Supabase SQL editor

-- Step 1: Add policy for authenticated users to view all employees
CREATE POLICY "Authenticated users can view all employees" ON public.employees
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 2: Add policy for service role to manage employees
CREATE POLICY "Service role can manage employees" ON public.employees
  FOR ALL USING (auth.role() = 'service_role');

-- Step 3: Allow authenticated users to view call participation data
CREATE POLICY "Authenticated users can view call participation" ON public.employee_call_participation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 4: Allow authenticated users to view scorecards
CREATE POLICY "Authenticated users can view scorecards" ON public.employee_scorecards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 5: Allow authenticated users to view performance trends
CREATE POLICY "Authenticated users can view performance trends" ON public.employee_performance_trends
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 6: Allow authenticated users to view coaching notes
CREATE POLICY "Authenticated users can view coaching notes" ON public.manager_coaching_notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 7: Allow authenticated users to view teams
CREATE POLICY "Authenticated users can view teams" ON public.teams
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 8: Allow service role to manage teams
CREATE POLICY "Service role can manage teams" ON public.teams
  FOR ALL USING (auth.role() = 'service_role');

-- Step 9: Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'employees'
ORDER BY tablename, policyname;