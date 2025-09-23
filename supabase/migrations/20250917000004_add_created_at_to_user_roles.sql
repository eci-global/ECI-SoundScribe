-- Add missing created_at column to user_roles table
-- This ensures compatibility with the list-admin-users Edge Function

-- Add created_at column to user_roles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_roles'
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_roles
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

        -- Update existing rows to have a created_at timestamp
        UPDATE public.user_roles
        SET created_at = NOW()
        WHERE created_at IS NULL;

        RAISE NOTICE 'Added created_at column to user_roles table';
    ELSE
        RAISE NOTICE 'created_at column already exists in user_roles table';
    END IF;
END $$;