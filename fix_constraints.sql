-- Fix Resource Permissions Table Constraints
-- The resource_permissions table was created with a unique constraint on resource_name only,
-- but we need to allow multiple permission types per resource

-- Drop the incorrect unique constraint on resource_name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'resource_permissions_resource_name_key'
    ) THEN
        ALTER TABLE public.resource_permissions
        DROP CONSTRAINT resource_permissions_resource_name_key;

        RAISE NOTICE 'Dropped incorrect unique constraint on resource_name';
    ELSE
        RAISE NOTICE 'Constraint resource_permissions_resource_name_key does not exist, skipping';
    END IF;
END $$;

-- Ensure the correct composite unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'resource_permissions_resource_name_permission_type_key'
    ) THEN
        ALTER TABLE public.resource_permissions
        ADD CONSTRAINT resource_permissions_resource_name_permission_type_key
        UNIQUE (resource_name, permission_type);

        RAISE NOTICE 'Added correct composite unique constraint';
    ELSE
        RAISE NOTICE 'Composite unique constraint already exists';
    END IF;
END $$;