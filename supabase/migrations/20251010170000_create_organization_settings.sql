-- Migration: Create organization_settings table for feature flags and configuration
-- Purpose: Store organization-level settings like support mode score visibility

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, setting_key)
);

-- Create index for faster lookups
CREATE INDEX idx_organization_settings_org_key
ON public.organization_settings(organization_id, setting_key);

-- Add RLS policies
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read settings for their organization
CREATE POLICY "Users can read own organization settings"
ON public.organization_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: Admins can manage organization settings
CREATE POLICY "Admins can manage organization settings"
ON public.organization_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_organization_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_organization_settings_timestamp
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_settings_timestamp();

-- Insert default settings for support mode
INSERT INTO public.organization_settings (organization_id, setting_key, setting_value, description)
VALUES
  ('default', 'support_mode.show_scores', '{"enabled": true}'::jsonb, 'Controls whether ECI scores are displayed in support mode coaching insights'),
  ('default', 'support_mode.score_display_style', '{"style": "percentage"}'::jsonb, 'Display style for scores: percentage, letter_grade, or qualitative')
ON CONFLICT (organization_id, setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.organization_settings IS 'Organization-level feature flags and configuration settings';
COMMENT ON COLUMN public.organization_settings.setting_key IS 'Dot-notation key for hierarchical settings (e.g., support_mode.show_scores)';
COMMENT ON COLUMN public.organization_settings.setting_value IS 'JSONB value allowing flexible configuration schemas';
