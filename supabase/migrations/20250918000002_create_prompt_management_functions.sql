-- AI Control Center - Prompt Template Management Functions
-- Created: 2025-09-18

-- Function to create a new prompt template
CREATE OR REPLACE FUNCTION create_prompt_template(
  p_name TEXT,
  p_category TEXT,
  p_description TEXT,
  p_template_content TEXT,
  p_variables JSONB DEFAULT '[]'::jsonb,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_id UUID;
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can create prompt templates';
  END IF;

  -- Insert new template
  INSERT INTO ai_prompt_templates (
    name,
    category,
    description,
    template_content,
    variables,
    is_active,
    created_by
  ) VALUES (
    p_name,
    p_category,
    p_description,
    p_template_content,
    p_variables,
    p_is_active,
    auth.uid()
  )
  RETURNING id INTO template_id;

  RETURN template_id;
END;
$$;

-- Function to update a prompt template
CREATE OR REPLACE FUNCTION update_prompt_template(
  p_template_id UUID,
  p_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_template_content TEXT DEFAULT NULL,
  p_variables JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can update prompt templates';
  END IF;

  -- Update template (only non-null values)
  UPDATE ai_prompt_templates SET
    name = COALESCE(p_name, name),
    category = COALESCE(p_category, category),
    description = COALESCE(p_description, description),
    template_content = COALESCE(p_template_content, template_content),
    variables = COALESCE(p_variables, variables),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_template_id;

  -- Record in configuration history
  INSERT INTO ai_configuration_history (
    configuration_type,
    configuration_id,
    action_type,
    changed_by,
    changes
  ) VALUES (
    'prompt_template',
    p_template_id,
    'update',
    auth.uid(),
    jsonb_build_object(
      'template_id', p_template_id,
      'updated_fields', jsonb_build_object(
        'name', p_name,
        'category', p_category,
        'description', p_description,
        'is_active', p_is_active
      )
    )
  );

  RETURN TRUE;
END;
$$;

-- Function to delete a prompt template (soft delete)
CREATE OR REPLACE FUNCTION delete_prompt_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can delete prompt templates';
  END IF;

  -- Soft delete by setting is_active to false
  UPDATE ai_prompt_templates
  SET
    is_active = false,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_template_id;

  -- Record in configuration history
  INSERT INTO ai_configuration_history (
    configuration_type,
    configuration_id,
    action_type,
    changed_by,
    changes
  ) VALUES (
    'prompt_template',
    p_template_id,
    'delete',
    auth.uid(),
    jsonb_build_object('template_id', p_template_id, 'action', 'soft_delete')
  );

  RETURN TRUE;
END;
$$;

-- Function to get prompt templates with filtering
CREATE OR REPLACE FUNCTION get_prompt_templates(
  p_category TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  template_content TEXT,
  variables JSONB,
  is_active BOOLEAN,
  usage_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can view prompt templates';
  END IF;

  RETURN QUERY
  SELECT
    pt.id,
    pt.name,
    pt.category,
    pt.description,
    pt.template_content,
    pt.variables,
    pt.is_active,
    pt.usage_count,
    pt.created_at,
    pt.updated_at,
    pt.created_by,
    pt.updated_by
  FROM ai_prompt_templates pt
  WHERE
    (p_category IS NULL OR pt.category = p_category)
    AND (p_is_active IS NULL OR pt.is_active = p_is_active)
  ORDER BY pt.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get prompt template by ID
CREATE OR REPLACE FUNCTION get_prompt_template_by_id(p_template_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  template_content TEXT,
  variables JSONB,
  is_active BOOLEAN,
  usage_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can view prompt templates';
  END IF;

  RETURN QUERY
  SELECT
    pt.id,
    pt.name,
    pt.category,
    pt.description,
    pt.template_content,
    pt.variables,
    pt.is_active,
    pt.usage_count,
    pt.created_at,
    pt.updated_at,
    pt.created_by,
    pt.updated_by
  FROM ai_prompt_templates pt
  WHERE pt.id = p_template_id;
END;
$$;

-- Function to render prompt template with variables
CREATE OR REPLACE FUNCTION render_prompt_template(
  p_template_id UUID,
  p_variable_values JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_content TEXT;
  rendered_content TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Get template content
  SELECT template_content INTO template_content
  FROM ai_prompt_templates
  WHERE id = p_template_id AND is_active = true;

  IF template_content IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  rendered_content := template_content;

  -- Replace variables in format {{variable_name}}
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variable_values)
  LOOP
    rendered_content := replace(rendered_content, '{{' || var_key || '}}', var_value);
  END LOOP;

  -- Update usage count
  UPDATE ai_prompt_templates
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = p_template_id;

  RETURN rendered_content;
END;
$$;

-- Function to get prompt template categories
CREATE OR REPLACE FUNCTION get_prompt_categories()
RETURNS TABLE(category TEXT, template_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can view prompt categories';
  END IF;

  RETURN QUERY
  SELECT
    pt.category,
    COUNT(*) as template_count
  FROM ai_prompt_templates pt
  WHERE pt.is_active = true
  GROUP BY pt.category
  ORDER BY pt.category;
END;
$$;

-- Function to duplicate a prompt template
CREATE OR REPLACE FUNCTION duplicate_prompt_template(
  p_template_id UUID,
  p_new_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_record RECORD;
  new_template_id UUID;
  admin_role BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin_user(auth.uid()) INTO admin_role;

  IF NOT admin_role THEN
    RAISE EXCEPTION 'Only admins can duplicate prompt templates';
  END IF;

  -- Get the original template
  SELECT * INTO template_record
  FROM ai_prompt_templates
  WHERE id = p_template_id;

  IF template_record IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Create duplicate
  INSERT INTO ai_prompt_templates (
    name,
    category,
    description,
    template_content,
    variables,
    is_active,
    created_by
  ) VALUES (
    p_new_name,
    template_record.category,
    'Copy of: ' || template_record.description,
    template_record.template_content,
    template_record.variables,
    false, -- Start as inactive
    auth.uid()
  )
  RETURNING id INTO new_template_id;

  RETURN new_template_id;
END;
$$;

-- Grant execute permissions to authenticated users (admin check is in functions)
GRANT EXECUTE ON FUNCTION create_prompt_template TO authenticated;
GRANT EXECUTE ON FUNCTION update_prompt_template TO authenticated;
GRANT EXECUTE ON FUNCTION delete_prompt_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_prompt_templates TO authenticated;
GRANT EXECUTE ON FUNCTION get_prompt_template_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION render_prompt_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_prompt_categories TO authenticated;
GRANT EXECUTE ON FUNCTION duplicate_prompt_template TO authenticated;