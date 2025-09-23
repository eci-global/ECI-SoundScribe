-- Fix AI Prompt Templates Unique Constraint
-- Created: 2025-09-18
-- Purpose: Ensure unique constraint exists for ON CONFLICT clause compatibility

-- Drop constraint if it exists (to recreate consistently)
DROP INDEX IF EXISTS ai_prompt_templates_name_category_unique CASCADE;

-- Recreate the unique constraint with explicit naming
CREATE UNIQUE INDEX ai_prompt_templates_name_category_unique
ON ai_prompt_templates(name, category);

-- Test the constraint by attempting an upsert operation
-- This will fail if the constraint doesn't work properly
INSERT INTO ai_prompt_templates (
    name,
    category,
    description,
    template,
    variables,
    is_active,
    created_by
) VALUES (
    'test_constraint_validation',
    'custom',
    'Test constraint validation',
    'Test template content',
    '[]'::jsonb,
    false,
    NULL
)
ON CONFLICT (name, category) DO UPDATE SET
    updated_at = now();

-- Clean up test record
DELETE FROM ai_prompt_templates
WHERE name = 'test_constraint_validation'
AND category = 'custom';

-- Log the constraint fix
DO $$
BEGIN
    -- Log that we've fixed the constraint
    RAISE NOTICE 'AI prompt templates unique constraint recreated and validated successfully';
END $$;