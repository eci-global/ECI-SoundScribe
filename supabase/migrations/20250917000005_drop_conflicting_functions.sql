-- Drop existing functions that might conflict with our new comprehensive admin functions
-- This ensures clean recreation with the correct signatures

-- Drop existing calculate_admin_kpis function if it exists
DROP FUNCTION IF EXISTS public.calculate_admin_kpis();

-- Drop other potentially conflicting functions
DROP FUNCTION IF EXISTS public.get_user_statistics();
DROP FUNCTION IF EXISTS public.get_system_health_metrics();
DROP FUNCTION IF EXISTS public.get_audit_summary();
DROP FUNCTION IF EXISTS public.get_database_stats();
DROP FUNCTION IF EXISTS public.calculate_storage_metrics();