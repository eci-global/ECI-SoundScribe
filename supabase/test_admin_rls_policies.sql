-- Test script to verify admin RLS policies are working correctly
-- This script should be run after applying the admin RLS migration
-- Run this via Supabase SQL Editor or psql

-- =============================================
-- TEST ADMIN FUNCTION ACCESSIBILITY
-- =============================================

-- Test 1: Verify admin check functions exist and are accessible
SELECT 'Testing admin helper functions...' as test_phase;

-- Test is_admin function
SELECT 
  'is_admin function test' as test_name,
  CASE 
    WHEN is_admin() IS NOT NULL THEN 'PASS: Function exists and returns boolean'
    ELSE 'FAIL: Function not accessible'
  END as result;

-- Test current_user_is_admin function
SELECT 
  'current_user_is_admin function test' as test_name,
  CASE 
    WHEN current_user_is_admin() IS NOT NULL THEN 'PASS: Function exists and returns boolean'
    ELSE 'FAIL: Function not accessible'
  END as result;

-- =============================================
-- TEST ADMIN POLICY COVERAGE
-- =============================================

SELECT 'Testing policy coverage on core tables...' as test_phase;

-- Check if admin policies exist for profiles table
SELECT 
  'profiles table admin policies' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 6 THEN 'PASS: Admin policies found'
    ELSE 'FAIL: Missing admin policies'
  END as result
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles' 
  AND policyname LIKE '%admin%';

-- Check if admin policies exist for recordings table  
SELECT 
  'recordings table admin policies' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 8 THEN 'PASS: Admin policies found'
    ELSE 'FAIL: Missing admin policies'
  END as result
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'recordings' 
  AND policyname LIKE '%admin%';

-- Check if admin policies exist for user_roles table
SELECT 
  'user_roles table admin policies' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN 'PASS: Admin policies found'
    ELSE 'FAIL: Missing admin policies'
  END as result
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_roles' 
  AND policyname LIKE '%admin%';

-- =============================================
-- TEST ADMIN MANAGEMENT FUNCTIONS
-- =============================================

SELECT 'Testing admin management functions...' as test_phase;

-- Test elevate_user_to_admin function exists
SELECT 
  'elevate_user_to_admin function' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'elevate_user_to_admin'
    ) THEN 'PASS: Function exists'
    ELSE 'FAIL: Function missing'
  END as result;

-- Test revoke_admin_access function exists
SELECT 
  'revoke_admin_access function' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'revoke_admin_access'
    ) THEN 'PASS: Function exists'
    ELSE 'FAIL: Function missing'
  END as result;

-- Test get_admin_dashboard_summary function exists
SELECT 
  'get_admin_dashboard_summary function' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'get_admin_dashboard_summary'
    ) THEN 'PASS: Function exists'
    ELSE 'FAIL: Function missing'
  END as result;

-- =============================================
-- TEST AUDIT LOGGING INTEGRATION
-- =============================================

SELECT 'Testing audit logging integration...' as test_phase;

-- Test that audit logs table has proper admin policies
SELECT 
  'audit_logs admin access' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN 'PASS: Admin audit policies found'
    ELSE 'FAIL: Missing audit policies'
  END as result
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'audit_logs' 
  AND policyname LIKE '%admin%';

-- Test log_audit_event function exists
SELECT 
  'log_audit_event function' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'log_audit_event'
    ) THEN 'PASS: Function exists'
    ELSE 'FAIL: Function missing'
  END as result;

-- =============================================
-- TEST STORAGE POLICY COVERAGE
-- =============================================

SELECT 'Testing storage policy coverage...' as test_phase;

-- Check storage policies for admin access
SELECT 
  'storage admin policies' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 1 THEN 'PASS: Admin storage policies found'
    ELSE 'FAIL: Missing storage admin policies'
  END as result
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%admin%';

-- =============================================
-- TEST INDEX OPTIMIZATION
-- =============================================

SELECT 'Testing performance optimizations...' as test_phase;

-- Check for admin-specific indexes
SELECT 
  'admin performance indexes' as test_name,
  COUNT(*) as index_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN 'PASS: Admin indexes found'
    ELSE 'FAIL: Missing performance indexes'
  END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE '%admin%' OR indexname LIKE '%user_roles%');

-- =============================================
-- SUMMARY REPORT
-- =============================================

SELECT 'ADMIN RLS POLICY TEST SUMMARY' as test_phase;

WITH test_results AS (
  SELECT 
    COUNT(*) FILTER (WHERE policyname LIKE '%admin%') as total_admin_policies,
    COUNT(DISTINCT tablename) FILTER (WHERE policyname LIKE '%admin%') as tables_with_admin_policies
  FROM pg_policies 
  WHERE schemaname = 'public'
),
function_results AS (
  SELECT 
    COUNT(*) FILTER (WHERE proname IN (
      'is_admin', 'current_user_is_admin', 'elevate_user_to_admin', 
      'revoke_admin_access', 'get_admin_dashboard_summary'
    )) as admin_functions_count
  FROM pg_proc p 
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE n.nspname = 'public'
)
SELECT 
  tr.total_admin_policies,
  tr.tables_with_admin_policies,
  fr.admin_functions_count,
  CASE 
    WHEN tr.total_admin_policies >= 20 
     AND tr.tables_with_admin_policies >= 8 
     AND fr.admin_functions_count >= 5 
    THEN 'PASS: Admin RLS policies properly configured'
    ELSE 'REVIEW NEEDED: Some admin configurations may be missing'
  END as overall_status
FROM test_results tr, function_results fr;

-- =============================================
-- CURRENT ADMIN USERS CHECK
-- =============================================

SELECT 'Current admin users in system:' as info;

SELECT 
  p.email,
  p.full_name,
  ur.assigned_at,
  ur.assigned_by
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin'
ORDER BY ur.assigned_at DESC;

-- Show total admin count
SELECT 
  COUNT(*) as total_admin_users,
  CASE 
    WHEN COUNT(*) = 0 THEN 'WARNING: No admin users found - use grant_admin_role() to create first admin'
    WHEN COUNT(*) = 1 THEN 'OK: Single admin user (be careful not to lock yourself out)'
    ELSE 'GOOD: Multiple admin users configured'
  END as admin_status
FROM public.user_roles 
WHERE role = 'admin';

-- =============================================
-- RECENT AUDIT EVENTS CHECK
-- =============================================

SELECT 'Recent admin-related audit events:' as info;

SELECT 
  created_at,
  user_email,
  action,
  resource_type,
  severity
FROM public.audit_logs 
WHERE action LIKE '%admin%' 
   OR resource_type = 'user_role'
   OR metadata->>'admin_action' = 'true'
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'Admin RLS policy test completed.' as completion_status;