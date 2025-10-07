-- Migrate Existing Users to Policy System
-- This migration runs the actual migration of existing users to the new policy system
-- while preserving all existing access levels and providing rollback capabilities

-- 1. CREATE BACKUP FUNCTIONS FOR ROLLBACK CAPABILITY

-- Create a backup of current user roles before migration
CREATE TABLE IF NOT EXISTS public.user_roles_backup_pre_policy_migration AS
SELECT
  id,
  user_id,
  role,
  organization_id,
  granted_by,
  granted_at,
  created_at,
  NOW() as backed_up_at
FROM public.user_roles;

-- Function to rollback migration if needed
CREATE OR REPLACE FUNCTION public.rollback_policy_migration()
RETURNS TABLE (
  action TEXT,
  affected_count INTEGER,
  details TEXT
) AS $$
DECLARE
  assignments_deleted INTEGER;
  roles_restored INTEGER;
BEGIN
  -- Delete all policy assignments created during migration
  DELETE FROM public.user_policy_assignments
  WHERE assigned_at >= (
    SELECT MIN(backed_up_at) FROM public.user_roles_backup_pre_policy_migration
  );
  GET DIAGNOSTICS assignments_deleted = ROW_COUNT;

  -- Restore original user roles if needed
  INSERT INTO public.user_roles (id, user_id, role, organization_id, granted_by, granted_at, created_at)
  SELECT id, user_id, role, organization_id, granted_by, granted_at, created_at
  FROM public.user_roles_backup_pre_policy_migration
  ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS roles_restored = ROW_COUNT;

  -- Return results
  action := 'policy_assignments_deleted';
  affected_count := assignments_deleted;
  details := 'Deleted policy assignments created during migration';
  RETURN NEXT;

  action := 'roles_restored';
  affected_count := roles_restored;
  details := 'Restored user roles from backup';
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PRE-MIGRATION VALIDATION

-- Function to validate current system state before migration
CREATE OR REPLACE FUNCTION public.validate_pre_migration_state()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT,
  user_count INTEGER
) AS $$
BEGIN
  -- Check 1: Count users with roles
  SELECT
    'users_with_roles' as check_name,
    'info' as status,
    'Users who have assigned roles' as details,
    COUNT(DISTINCT user_id)::INTEGER
  FROM public.user_roles
  INTO check_name, status, details, user_count;
  RETURN NEXT;

  -- Check 2: Count admin users
  SELECT
    'admin_users' as check_name,
    'info' as status,
    'Users with admin role' as details,
    COUNT(DISTINCT user_id)::INTEGER
  FROM public.user_roles
  WHERE role = 'admin'
  INTO check_name, status, details, user_count;
  RETURN NEXT;

  -- Check 3: Count manager users
  SELECT
    'manager_users' as check_name,
    'info' as status,
    'Users with manager role' as details,
    COUNT(DISTINCT user_id)::INTEGER
  FROM public.user_roles
  WHERE role = 'manager'
  INTO check_name, status, details, user_count;
  RETURN NEXT;

  -- Check 4: Count regular users
  SELECT
    'regular_users' as check_name,
    'info' as status,
    'Users with user role' as details,
    COUNT(DISTINCT user_id)::INTEGER
  FROM public.user_roles
  WHERE role = 'user'
  INTO check_name, status, details, user_count;
  RETURN NEXT;

  -- Check 5: Verify policies exist
  SELECT
    'available_policies' as check_name,
    CASE WHEN COUNT(*) > 0 THEN 'ok' ELSE 'error' END as status,
    'Default policies available for assignment' as details,
    COUNT(*)::INTEGER
  FROM public.access_policies
  WHERE enabled = true
  INTO check_name, status, details, user_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. EXECUTE PRE-MIGRATION VALIDATION
DO $$
DECLARE
  validation_record RECORD;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== PRE-MIGRATION VALIDATION ===';

  FOR validation_record IN SELECT * FROM public.validate_pre_migration_state() LOOP
    RAISE NOTICE 'Check: % | Status: % | Count: % | Details: %',
      validation_record.check_name,
      validation_record.status,
      validation_record.user_count,
      validation_record.details;

    IF validation_record.status = 'error' THEN
      error_count := error_count + 1;
    END IF;
  END LOOP;

  IF error_count > 0 THEN
    RAISE EXCEPTION 'Pre-migration validation failed with % errors. Migration aborted.', error_count;
  END IF;

  RAISE NOTICE '✅ Pre-migration validation passed. Proceeding with migration...';
END $$;

-- 4. EXECUTE THE MIGRATION
DO $$
DECLARE
  migration_record RECORD;
  total_users INTEGER := 0;
  total_assignments INTEGER := 0;
  start_time TIMESTAMP := NOW();
BEGIN
  RAISE NOTICE '=== STARTING USER POLICY MIGRATION ===';
  RAISE NOTICE 'Migration started at: %', start_time;

  -- Execute the migration for all users
  FOR migration_record IN
    SELECT * FROM public.migrate_all_users_to_policy_system()
  LOOP
    total_users := total_users + 1;
    total_assignments := total_assignments + migration_record.policies_assigned;

    RAISE NOTICE 'Migrated user: % (%) | Roles: % | Policies assigned: %',
      migration_record.email,
      migration_record.user_id,
      migration_record.roles,
      migration_record.policies_assigned;
  END LOOP;

  RAISE NOTICE '=== MIGRATION COMPLETED ===';
  RAISE NOTICE 'Duration: %', NOW() - start_time;
  RAISE NOTICE 'Users migrated: %', total_users;
  RAISE NOTICE 'Total policy assignments created: %', total_assignments;
END $$;

-- 5. POST-MIGRATION VALIDATION

-- Function to validate migration results
CREATE OR REPLACE FUNCTION public.validate_post_migration_state()
RETURNS TABLE (
  validation_name TEXT,
  status TEXT,
  before_count INTEGER,
  after_count INTEGER,
  details TEXT
) AS $$
BEGIN
  -- Validate that no users lost their roles
  SELECT
    'user_roles_preserved' as validation_name,
    CASE WHEN backup_count = current_count THEN 'ok' ELSE 'error' END as status,
    backup_count as before_count,
    current_count as after_count,
    'User roles should be preserved during migration' as details
  FROM (
    SELECT COUNT(*) as backup_count FROM public.user_roles_backup_pre_policy_migration
  ) backup
  CROSS JOIN (
    SELECT COUNT(*) as current_count FROM public.user_roles
  ) current
  INTO validation_name, status, before_count, after_count, details;
  RETURN NEXT;

  -- Validate that policy assignments were created
  SELECT
    'policy_assignments_created' as validation_name,
    CASE WHEN assignment_count > 0 THEN 'ok' ELSE 'warning' END as status,
    0 as before_count,
    assignment_count as after_count,
    'Policy assignments should be created for users with roles' as details
  FROM (
    SELECT COUNT(*) as assignment_count FROM public.user_policy_assignments
  ) assignments
  INTO validation_name, status, before_count, after_count, details;
  RETURN NEXT;

  -- Validate that all users with roles have policy assignments
  SELECT
    'users_have_policies' as validation_name,
    CASE WHEN users_with_roles = users_with_policies THEN 'ok' ELSE 'warning' END as status,
    users_with_roles as before_count,
    users_with_policies as after_count,
    'All users with roles should have corresponding policy assignments' as details
  FROM (
    SELECT COUNT(DISTINCT user_id) as users_with_roles FROM public.user_roles
  ) roles
  CROSS JOIN (
    SELECT COUNT(DISTINCT user_id) as users_with_policies FROM public.user_policy_assignments WHERE is_active = true
  ) policies
  INTO validation_name, status, before_count, after_count, details;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. EXECUTE POST-MIGRATION VALIDATION
DO $$
DECLARE
  validation_record RECORD;
  error_count INTEGER := 0;
  warning_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';

  FOR validation_record IN SELECT * FROM public.validate_post_migration_state() LOOP
    RAISE NOTICE 'Validation: % | Status: % | Before: % | After: % | Details: %',
      validation_record.validation_name,
      validation_record.status,
      validation_record.before_count,
      validation_record.after_count,
      validation_record.details;

    IF validation_record.status = 'error' THEN
      error_count := error_count + 1;
    ELSIF validation_record.status = 'warning' THEN
      warning_count := warning_count + 1;
    END IF;
  END LOOP;

  IF error_count > 0 THEN
    RAISE EXCEPTION 'Post-migration validation failed with % errors. Consider running rollback.', error_count;
  END IF;

  IF warning_count > 0 THEN
    RAISE NOTICE '⚠️  Post-migration validation completed with % warnings.', warning_count;
  ELSE
    RAISE NOTICE '✅ Post-migration validation passed successfully.';
  END IF;
END $$;

-- 7. CREATE MONITORING AND REPORTING FUNCTIONS

-- Function to get migration status summary
CREATE OR REPLACE FUNCTION public.get_migration_status_summary()
RETURNS TABLE (
  metric_name TEXT,
  value INTEGER,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_users'::TEXT, COUNT(DISTINCT p.id)::INTEGER, 'Total users in system'::TEXT
  FROM public.profiles p

  UNION ALL

  SELECT 'users_with_roles'::TEXT, COUNT(DISTINCT ur.user_id)::INTEGER, 'Users with assigned roles'::TEXT
  FROM public.user_roles ur

  UNION ALL

  SELECT 'users_with_policies'::TEXT, COUNT(DISTINCT upa.user_id)::INTEGER, 'Users with policy assignments'::TEXT
  FROM public.user_policy_assignments upa
  WHERE upa.is_active = true

  UNION ALL

  SELECT 'active_policies'::TEXT, COUNT(*)::INTEGER, 'Active policies available'::TEXT
  FROM public.access_policies
  WHERE enabled = true

  UNION ALL

  SELECT 'total_policy_assignments'::TEXT, COUNT(*)::INTEGER, 'Total active policy assignments'::TEXT
  FROM public.user_policy_assignments
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.rollback_policy_migration() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_pre_migration_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_post_migration_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_migration_status_summary() TO authenticated, service_role;

-- 8. FINAL SUMMARY
DO $$
DECLARE
  summary_record RECORD;
BEGIN
  RAISE NOTICE '=== MIGRATION SUMMARY ===';

  FOR summary_record IN SELECT * FROM public.get_migration_status_summary() LOOP
    RAISE NOTICE '%: % (%)', summary_record.metric_name, summary_record.value, summary_record.description;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ User policy migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the new unified User Access Management UI';
  RAISE NOTICE '2. Verify users can access their resources as before';
  RAISE NOTICE '3. If issues arise, run: SELECT * FROM public.rollback_policy_migration()';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration can be monitored with: SELECT * FROM public.get_migration_status_summary()';
END $$;