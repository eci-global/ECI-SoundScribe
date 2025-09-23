-- Debug script to check user status for dkoranteng@ecisolutions.com

-- 1. Check if user exists in auth.users
SELECT 'AUTH USERS CHECK' as check_type;
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'dkoranteng@ecisolutions.com';

-- 2. Check if user exists in profiles
SELECT 'PROFILES CHECK' as check_type;
SELECT id, email, full_name, created_at
FROM profiles 
WHERE email = 'dkoranteng@ecisolutions.com';

-- 3. Check current user roles for this email
SELECT 'USER ROLES CHECK' as check_type;
SELECT ur.id, ur.user_id, ur.role, ur.created_at, p.email
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.id
WHERE p.email = 'dkoranteng@ecisolutions.com';

-- 4. Check all admin users (to see if anyone has admin access)
SELECT 'ALL ADMIN USERS' as check_type;
SELECT ur.role, p.email, ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin';

-- 5. Show all users in the system
SELECT 'ALL USERS IN SYSTEM' as check_type;
SELECT u.email, u.created_at, ur.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC
LIMIT 10;