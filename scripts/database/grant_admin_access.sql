-- Grant admin access to dkoranteng@ecisolutions.com
-- This script will assign admin role to your account

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID based on email
    SELECT id INTO target_user_id 
    FROM profiles 
    WHERE email = 'dkoranteng@ecisolutions.com'
    LIMIT 1;
    
    -- If user exists in profiles table
    IF target_user_id IS NOT NULL THEN
        -- Check if user already has admin role
        IF NOT EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = target_user_id AND role = 'admin'
        ) THEN
            -- Grant admin role
            INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
            VALUES (
                target_user_id, 
                'admin', 
                target_user_id, -- Self-assigned for initial setup
                NOW()
            );
            
            RAISE NOTICE 'Admin role granted to dkoranteng@ecisolutions.com (ID: %)', target_user_id;
        ELSE
            RAISE NOTICE 'User dkoranteng@ecisolutions.com already has admin role';
        END IF;
    ELSE
        -- User not found in profiles, try to find in auth.users and create profile
        SELECT id INTO target_user_id
        FROM auth.users
        WHERE email = 'dkoranteng@ecisolutions.com'
        LIMIT 1;
        
        IF target_user_id IS NOT NULL THEN
            -- Create profile entry if it doesn't exist
            INSERT INTO profiles (id, email, full_name, created_at, updated_at)
            VALUES (
                target_user_id,
                'dkoranteng@ecisolutions.com',
                'Daniel Koranteng',
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                updated_at = NOW();
            
            -- Grant admin role
            INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
            VALUES (
                target_user_id,
                'admin',
                target_user_id,
                NOW()
            )
            ON CONFLICT (user_id, role) DO NOTHING;
            
            RAISE NOTICE 'Profile created and admin role granted to dkoranteng@ecisolutions.com (ID: %)', target_user_id;
        ELSE
            RAISE NOTICE 'User dkoranteng@ecisolutions.com not found in auth.users. Please sign up first.';
        END IF;
    END IF;
END $$;

-- Verify the admin role assignment
SELECT 
    p.email,
    p.full_name,
    ur.role,
    ur.assigned_at,
    ur.created_at
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'dkoranteng@ecisolutions.com';