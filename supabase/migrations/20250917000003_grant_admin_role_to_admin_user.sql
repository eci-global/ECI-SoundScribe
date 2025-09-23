-- Grant admin role to the main admin user
-- This ensures the admin@soundscribe.com user has proper admin permissions

-- Insert admin role for the main admin user if it doesn't exist
INSERT INTO public.user_roles (user_id, role)
VALUES ('1fd13984-3457-40ea-9220-20447a1ff9ae', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure they have a profile entry
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  '1fd13984-3457-40ea-9220-20447a1ff9ae',
  'admin@soundscribe.com',
  'Derick K'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();