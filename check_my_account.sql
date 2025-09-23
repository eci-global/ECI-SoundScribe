-- Run this in your Supabase SQL Editor to check your account status

-- 1. Check if you exist in auth.users
SELECT 
    'AUTH.USERS' as table_name,
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'dkoranteng@ecisolutions.com';

-- 2. Check if you exist in profiles table  
SELECT 
    'PROFILES' as table_name,
    id,
    email,
    full_name,
    created_at
FROM profiles 
WHERE email = 'dkoranteng@ecisolutions.com';

-- 3. Check your roles in user_roles table
SELECT 
    'USER_ROLES' as table_name,
    ur.id as role_id,
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.id
WHERE p.email = 'dkoranteng@ecisolutions.com'
   OR ur.user_id IN (SELECT id FROM auth.users WHERE email = 'dkoranteng@ecisolutions.com');

-- 4. Show ALL admin users currently in system
SELECT 
    'ALL_ADMINS' as table_name,
    ur.user_id,
    COALESCE(p.email, au.email) as email,
    ur.role,
    ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.id
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- 5. Count total users and admins
SELECT 
    'COUNTS' as info,
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') as total_admins;