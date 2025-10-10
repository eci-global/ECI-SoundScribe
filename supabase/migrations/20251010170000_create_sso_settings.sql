-- Create SSO Settings System
-- Tracks which users are required to use SSO and their Okta mappings

-- 1. USER SSO SETTINGS TABLE
-- Stores SSO requirements and Okta user mappings
CREATE TABLE IF NOT EXISTS public.user_sso_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- SSO Configuration
  sso_required BOOLEAN DEFAULT false,
  sso_provider TEXT CHECK (sso_provider IN ('okta', 'email', NULL)),

  -- Okta Mapping
  okta_user_id TEXT UNIQUE,
  okta_email TEXT,
  okta_groups TEXT[] DEFAULT '{}',

  -- Audit Fields
  enforce_reason TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SSO ENFORCEMENT LOG TABLE
-- Tracks when SSO requirements are changed
CREATE TABLE IF NOT EXISTS public.sso_enforcement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('enabled', 'disabled', 'login_attempt', 'login_success', 'login_failure')),
  sso_required BOOLEAN,
  previous_sso_required BOOLEAN,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sso_settings_okta_id ON public.user_sso_settings(okta_user_id);
CREATE INDEX IF NOT EXISTS idx_user_sso_settings_sso_required ON public.user_sso_settings(sso_required) WHERE sso_required = true;
CREATE INDEX IF NOT EXISTS idx_sso_enforcement_log_user ON public.sso_enforcement_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_enforcement_log_created ON public.sso_enforcement_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sso_enforcement_log_action ON public.sso_enforcement_log(action);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sso_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_sso_settings_updated_at
  BEFORE UPDATE ON public.user_sso_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sso_settings_updated_at();

-- Function to log SSO enforcement changes
CREATE OR REPLACE FUNCTION public.log_sso_enforcement_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.sso_required != NEW.sso_required) OR TG_OP = 'INSERT' THEN
    INSERT INTO public.sso_enforcement_log (
      user_id,
      action,
      sso_required,
      previous_sso_required,
      reason,
      performed_by
    ) VALUES (
      NEW.user_id,
      CASE WHEN NEW.sso_required THEN 'enabled' ELSE 'disabled' END,
      NEW.sso_required,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.sso_required ELSE NULL END,
      NEW.enforce_reason,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log enforcement changes
CREATE TRIGGER log_sso_enforcement_changes
  AFTER INSERT OR UPDATE ON public.user_sso_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sso_enforcement_change();

-- Enable RLS on both tables
ALTER TABLE public.user_sso_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_enforcement_log ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- User SSO Settings: Users can view their own, admins can manage all
CREATE POLICY "Users can view own SSO settings"
  ON public.user_sso_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all SSO settings"
  ON public.user_sso_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage SSO settings"
  ON public.user_sso_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- SSO Enforcement Log: Users can view their own, admins can view all
CREATE POLICY "Users can view own SSO log"
  ON public.sso_enforcement_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all SSO logs"
  ON public.sso_enforcement_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert SSO logs"
  ON public.sso_enforcement_log FOR INSERT
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.user_sso_settings TO authenticated;
GRANT ALL ON public.sso_enforcement_log TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_sso_settings IS 'Tracks SSO requirements and Okta mappings for users';
COMMENT ON TABLE public.sso_enforcement_log IS 'Audit log for SSO requirement changes and login attempts';
COMMENT ON COLUMN public.user_sso_settings.sso_required IS 'Whether this user must authenticate via SSO';
COMMENT ON COLUMN public.user_sso_settings.sso_provider IS 'SSO provider (okta) or email for password auth';
COMMENT ON COLUMN public.user_sso_settings.okta_user_id IS 'Okta user ID for mapping';
COMMENT ON COLUMN public.user_sso_settings.oktagroups IS 'Okta groups this user belongs to';
