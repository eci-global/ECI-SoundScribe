-- Fixed Employee RLS Policies - Version 2
-- The previous policies used auth.role() = 'authenticated' which doesn't work with anon key
-- These policies use auth.uid() IS NOT NULL (user is logged in) which is the correct pattern

-- Step 1: Drop the problematic policies that check auth.role()
DROP POLICY IF EXISTS "Authenticated users can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON public.employees;

-- Step 2: Create proper policies that work with logged-in users (auth.uid() IS NOT NULL)
CREATE POLICY "Logged in users can view all employees" ON public.employees
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can insert employees" ON public.employees
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can update employees" ON public.employees
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can delete employees" ON public.employees
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 3: Keep service role policy (this one is correct)
-- Service role can manage employees already exists and is correct

-- Step 4: Fix related table policies to use the same pattern
DROP POLICY IF EXISTS "Authenticated users can view call participation" ON public.employee_call_participation;
DROP POLICY IF EXISTS "Authenticated users can view scorecards" ON public.employee_scorecards;
DROP POLICY IF EXISTS "Authenticated users can view performance trends" ON public.employee_performance_trends;
DROP POLICY IF EXISTS "Authenticated users can view coaching notes" ON public.manager_coaching_notes;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

CREATE POLICY "Logged in users can view call participation" ON public.employee_call_participation
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can view scorecards" ON public.employee_scorecards
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can view performance trends" ON public.employee_performance_trends
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can view coaching notes" ON public.manager_coaching_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Logged in users can view teams" ON public.teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Step 5: Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('employees', 'employee_call_participation', 'employee_scorecards', 'teams')
ORDER BY tablename, policyname;