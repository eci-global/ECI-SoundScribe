-- Force admin grant - this will work regardless of current state

-- Step 1: Create profile if it doesn't exist (using a random UUID if needed)
DO $$
DECLARE
    target_user_id UUID;
    profile_exists BOOLEAN;
    auth_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'dkoranteng@ecisolutions.com'
    ) INTO auth_user_exists;
    
    IF auth_user_exists THEN
        -- User exists in auth, get their ID
        SELECT id INTO target_user_id 
        FROM auth.users 
        WHERE email = 'dkoranteng@ecisolutions.com';
        
        RAISE NOTICE 'Found user in auth.users with ID: %', target_user_id;
    ELSE
        -- User doesn't exist in auth, this means they haven't signed up yet
        RAISE NOTICE 'User not found in auth.users. They need to sign up first at your app login page.';
        RAISE NOTICE 'After they sign up, run this script again.';
        RETURN;
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = target_user_id
    ) INTO profile_exists;
    
    -- Create profile if it doesn't exist
    IF NOT profile_exists THEN
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            target_user_id,
            'dkoranteng@ecisolutions.com',
            'Daniel Koranteng',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created profile for user';
    ELSE
        RAISE NOTICE 'Profile already exists';
    END IF;
    
    -- Grant admin role (with conflict handling)
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (target_user_id, 'admin', NOW())
    ON CONFLICT (user_id, role) DO UPDATE SET
        created_at = NOW();
    
    RAISE NOTICE 'Admin role granted successfully to dkoranteng@ecisolutions.com';
    
END $$;

-- Verification query
SELECT 
    'VERIFICATION' as status,
    u.email,
    p.full_name,
    ur.role,
    ur.created_at as role_granted_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id  
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'dkoranteng@ecisolutions.com';