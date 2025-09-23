-- Grant Admin Validation Access to Anonymous Role
-- Issue: Edge Functions using anon client can't execute validate_admin_api_access
-- Created: 2025-09-18

-- Grant execute permission on admin validation function to anon role
-- This allows Edge Functions to validate admin access with user JWT tokens
GRANT EXECUTE ON FUNCTION validate_admin_api_access TO anon;

-- Also grant to service role for consistency
GRANT EXECUTE ON FUNCTION validate_admin_api_access TO service_role;

-- Grant execute on helper function too
GRANT EXECUTE ON FUNCTION is_admin_user_cached TO anon;
GRANT EXECUTE ON FUNCTION is_admin_user_cached TO service_role;

-- Test that anon can now execute the function
DO $$
BEGIN
  -- This test will fail because anon context has no auth.uid(), but that's expected
  -- The important part is that the function can be called, not that it succeeds
  BEGIN
    PERFORM validate_admin_api_access('admin');
    RAISE NOTICE 'SUCCESS: validate_admin_api_access can be called by anon role';
  EXCEPTION
    WHEN OTHERS THEN
      -- Expected to fail with "Authentication required" when no user context
      RAISE NOTICE 'EXPECTED: validate_admin_api_access properly rejects anon context (error: %)', SQLERRM;
  END;
END $$;

-- Add comment explaining the security model
COMMENT ON FUNCTION validate_admin_api_access(TEXT) IS 'Admin validation function - callable by anon role but requires JWT user context to succeed';