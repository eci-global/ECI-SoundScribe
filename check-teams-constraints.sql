-- Check existing constraints on teams table
-- Run this in Supabase Dashboard -> SQL Editor

-- Check if teams table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for check constraints on teams table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.teams'::regclass
AND contype = 'c';

-- Check what values are currently in the department column
SELECT DISTINCT department FROM public.teams;
