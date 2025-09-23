-- Simple admin grant for dkoranteng@ecisolutions.com
-- Run this in your Supabase SQL Editor

-- Method 1: If you already have a profile
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles 
WHERE email = 'dkoranteng@ecisolutions.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Method 2: Alternative using auth.users if profile doesn't exist
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'dkoranteng@ecisolutions.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the assignment
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'dkoranteng@ecisolutions.com';