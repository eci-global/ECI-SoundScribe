-- Manual Employee ID Migration for Supabase Dashboard
-- Copy and paste these statements one by one into the Supabase SQL editor

-- Step 1: Add employee_code column if it doesn't exist
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code text;

-- Step 2: Backfill employee_code from current employee_id values
UPDATE public.employees
SET employee_code = employee_id
WHERE employee_code IS NULL AND employee_id IS NOT NULL;

-- Step 3: Check current employee_id column type and structure
SELECT column_name, data_type, is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
  AND column_name = 'employee_id';

-- Step 4: Drop existing employee_id column (will be replaced)
ALTER TABLE public.employees DROP COLUMN IF EXISTS employee_id;

-- Step 5: Add new employee_id as generated column mirroring UUID
ALTER TABLE public.employees
ADD COLUMN employee_id text GENERATED ALWAYS AS (id::text) STORED;

-- Step 6: Verify the changes
SELECT
  id,
  employee_id,
  employee_code,
  first_name,
  last_name,
  email
FROM public.employees
LIMIT 5;

-- Step 7: Check that employee_id equals id::text
SELECT
  COUNT(*) as total_employees,
  COUNT(CASE WHEN employee_id = id::text THEN 1 END) as matching_ids,
  COUNT(CASE WHEN employee_code IS NOT NULL THEN 1 END) as with_codes
FROM public.employees;