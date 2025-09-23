-- Fix the foreign key relationship between recordings and profiles
-- This ensures Supabase's schema cache recognizes the relationship for joins

-- First, check if the constraint exists and drop it if it does
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'recordings_user_id_fkey' 
        AND table_name = 'recordings'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE recordings DROP CONSTRAINT recordings_user_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint recordings_user_id_fkey';
    END IF;
END $$;

-- Recreate the foreign key constraint with explicit naming
ALTER TABLE recordings 
ADD CONSTRAINT recordings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add a comment to document the relationship
COMMENT ON CONSTRAINT recordings_user_id_fkey ON recordings IS 
'Foreign key relationship: recordings.user_id -> profiles.id';

-- Verify the constraint was created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'recordings'
    AND tc.constraint_name = 'recordings_user_id_fkey';