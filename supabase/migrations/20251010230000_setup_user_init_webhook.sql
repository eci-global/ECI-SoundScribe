-- Setup Database Webhook for Automatic User Initialization
-- This webhook calls the handle-new-user Edge Function when users are created

-- Create the webhook to trigger on auth.users INSERT
-- Note: Run this in Supabase Dashboard SQL Editor, then configure the webhook in Dashboard > Database > Webhooks

-- Step 1: The webhook needs to be created via Supabase Dashboard UI:
-- Dashboard → Database → Webhooks → "Create a new hook"
--
-- Configuration:
-- - Name: handle-new-user-webhook
-- - Table: auth.users
-- - Events: INSERT
-- - Type: HTTP Request
-- - Method: POST
-- - URL: https://qinkldgvejheppheykfl.supabase.co/functions/v1/handle-new-user
-- - Headers:
--   - Authorization: Bearer YOUR_ANON_KEY
--   - Content-Type: application/json

-- Alternatively, you can create it programmatically with this SQL:
-- Note: Replace YOUR_ANON_KEY with your actual anon key from Supabase Dashboard

-- Check if pg_net extension is enabled (required for webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the webhook trigger function
CREATE OR REPLACE FUNCTION public.trigger_user_init_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  webhook_url text := 'https://qinkldgvejheppheykfl.supabase.co/functions/v1/handle-new-user';
BEGIN
  -- Call the Edge Function via HTTP
  SELECT net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5ODg2MjYsImV4cCI6MjA0MTU2NDYyNn0.8tMx6y5FgYPxqX0fKkGm5HZwQtLcWQCkUjJvYYxAZ2Q"}'::jsonb,
    body := json_build_object(
      'type', 'INSERT',
      'table', 'users',
      'schema', 'auth',
      'record', row_to_json(NEW),
      'old_record', null
    )::text
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to trigger user init webhook: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_webhook
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_user_init_webhook();

COMMENT ON FUNCTION public.trigger_user_init_webhook() IS
  'Triggers the handle-new-user Edge Function when a new user is created via SSO or email/password';
