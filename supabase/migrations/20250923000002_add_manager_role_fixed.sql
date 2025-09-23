-- Add Manager Role for BDR Data Access (Fixed Version)
-- Creates manager role and updates RLS policies to allow manager access to BDR training data

-- Add organization_id column to user_roles if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN organization_id TEXT;
  END IF;
END $$;

-- Add granted_by and granted_at columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'granted_by'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN granted_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'granted_at'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN granted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update the role constraint to include manager
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'manager', 'user'));

-- Add RLS policies for user_roles if they don't exist
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
  DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
  DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;
  DROP POLICY IF EXISTS "Allow anon read for validation" ON user_roles;

  -- Enable RLS
  ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

  -- Users can view their own roles
  CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

  -- Admins can manage all roles within their organization
  CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
        AND (ur.organization_id = user_roles.organization_id OR user_roles.organization_id IS NULL)
      )
    );

  -- Service role can manage all roles (for admin functions)
  CREATE POLICY "Service role can manage roles" ON user_roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

  -- Allow anonymous read for role validation functions
  CREATE POLICY "Allow anon read for validation" ON user_roles
    FOR SELECT USING (true);
END $$;

-- Update BDR training tables to allow manager access

-- BDR Training Programs: Managers can view and edit programs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bdr_training_programs') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Admins can manage training programs" ON bdr_training_programs;
    DROP POLICY IF EXISTS "Users can view active programs" ON bdr_training_programs;
    DROP POLICY IF EXISTS "Managers can manage training programs" ON bdr_training_programs;

    -- Admins have full access
    CREATE POLICY "Admins can manage training programs" ON bdr_training_programs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    -- Managers can manage training programs
    CREATE POLICY "Managers can manage training programs" ON bdr_training_programs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
      );

    -- Users can view active programs
    CREATE POLICY "Users can view active programs" ON bdr_training_programs
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- BDR Scorecard Evaluations: Managers can view and manage all evaluations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bdr_scorecard_evaluations') THEN
    DROP POLICY IF EXISTS "Users can view own evaluations" ON bdr_scorecard_evaluations;
    DROP POLICY IF EXISTS "Admins can view all evaluations" ON bdr_scorecard_evaluations;
    DROP POLICY IF EXISTS "Managers can view all evaluations" ON bdr_scorecard_evaluations;
    DROP POLICY IF EXISTS "Service role access for functions" ON bdr_scorecard_evaluations;

    -- Users can view their own evaluations
    CREATE POLICY "Users can view own evaluations" ON bdr_scorecard_evaluations
      FOR SELECT USING (auth.uid() = user_id);

    -- Admins can manage all evaluations
    CREATE POLICY "Admins can view all evaluations" ON bdr_scorecard_evaluations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    -- Managers can view and manage all evaluations
    CREATE POLICY "Managers can view all evaluations" ON bdr_scorecard_evaluations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
      );

    -- Service role access for Edge Functions
    CREATE POLICY "Service role access for functions" ON bdr_scorecard_evaluations
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- BDR Training Progress: Managers can view all progress
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bdr_training_progress') THEN
    DROP POLICY IF EXISTS "Users can view own progress" ON bdr_training_progress;
    DROP POLICY IF EXISTS "Admins can view all progress" ON bdr_training_progress;
    DROP POLICY IF EXISTS "Managers can view all progress" ON bdr_training_progress;

    -- Users can view their own progress
    CREATE POLICY "Users can view own progress" ON bdr_training_progress
      FOR SELECT USING (auth.uid() = user_id);

    -- Admins can manage all progress
    CREATE POLICY "Admins can view all progress" ON bdr_training_progress
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    -- Managers can view all progress
    CREATE POLICY "Managers can view all progress" ON bdr_training_progress
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- BDR Call Classifications: Managers can view all classifications
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bdr_call_classifications') THEN
    DROP POLICY IF EXISTS "Users can view own classifications" ON bdr_call_classifications;
    DROP POLICY IF EXISTS "Admins can manage classifications" ON bdr_call_classifications;
    DROP POLICY IF EXISTS "Managers can view classifications" ON bdr_call_classifications;
    DROP POLICY IF EXISTS "Service role access" ON bdr_call_classifications;

    -- Users can view their own classifications
    CREATE POLICY "Users can view own classifications" ON bdr_call_classifications
      FOR SELECT USING (auth.uid() = user_id);

    -- Admins can manage all classifications
    CREATE POLICY "Admins can manage classifications" ON bdr_call_classifications
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    -- Managers can view all classifications
    CREATE POLICY "Managers can view classifications" ON bdr_call_classifications
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
      );

    -- Service role access for Edge Functions
    CREATE POLICY "Service role access" ON bdr_call_classifications
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Create function to assign manager role
CREATE OR REPLACE FUNCTION assign_manager_role(
  p_user_id UUID,
  p_organization_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
  LIMIT 1;

  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Only admins can assign manager roles';
  END IF;

  -- Insert or update manager role
  INSERT INTO user_roles (user_id, role, organization_id, granted_by, granted_at)
  VALUES (p_user_id, 'manager', p_organization_id, auth.uid(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    role = 'manager',
    organization_id = p_organization_id,
    granted_by = auth.uid(),
    granted_at = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has manager or admin access
CREATE OR REPLACE FUNCTION has_manager_access(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  check_user_id UUID;
BEGIN
  -- Use provided user_id or current auth user
  check_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if user has admin or manager role
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for manager validation (similar to admin validation)
CREATE OR REPLACE FUNCTION validate_manager_access(
  required_permission TEXT DEFAULT 'manager'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow service role to bypass
  IF auth.jwt() ->> 'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Check if current user has manager or admin role
  RETURN has_manager_access(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION assign_manager_role(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_manager_access(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION validate_manager_access(TEXT) TO authenticated, service_role, anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization ON user_roles(organization_id);

COMMENT ON FUNCTION assign_manager_role IS 'Assigns manager role to a user. Only admins can call this function.';
COMMENT ON FUNCTION has_manager_access IS 'Checks if user has manager or admin access for BDR data.';
COMMENT ON FUNCTION validate_manager_access IS 'Validates if current user has manager access. Used in RLS policies and Edge Functions.';