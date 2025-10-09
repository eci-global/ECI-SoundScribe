-- Fix Employee RLS Policies to Allow Proper Access
-- This migration adds policies to allow managers and authenticated users to view employee data

BEGIN;

-- Add policy for authenticated users to view all employees for admin/management purposes
-- This is needed for UI components like TrendAnalytics, user management, etc.
CREATE POLICY "Authenticated users can view all employees" ON public.employees
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add policy for service role to manage employees (for data import/management)
CREATE POLICY "Service role can manage employees" ON public.employees
  FOR ALL USING (auth.role() = 'service_role');

-- Update existing policies to be more permissive for admin functions
-- Admin users (users with admin email patterns) can view all employees
CREATE POLICY "Admin users can view all employees" ON public.employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email LIKE '%@admin%'
        OR email LIKE '%@manager%'
        OR email LIKE '%admin@%'
        OR email LIKE '%manager@%'
      )
    )
  );

-- Allow authenticated users to view call participation data for analytics
CREATE POLICY "Authenticated users can view call participation" ON public.employee_call_participation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to view scorecards for management purposes
CREATE POLICY "Authenticated users can view scorecards" ON public.employee_scorecards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to view performance trends for analytics
CREATE POLICY "Authenticated users can view performance trends" ON public.employee_performance_trends
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow managers and authenticated users to view coaching notes for oversight
CREATE POLICY "Authenticated users can view coaching notes" ON public.manager_coaching_notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to view teams for organizational structure
CREATE POLICY "Authenticated users can view teams" ON public.teams
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role full access to teams for management
CREATE POLICY "Service role can manage teams" ON public.teams
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- After this migration:
-- - All authenticated users can view employee data (needed for UI)
-- - Service role can manage all data (needed for imports/admin functions)
-- - Admin users have full access to employee data
-- - Management and analytics interfaces will work properly