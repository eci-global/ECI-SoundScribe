-- Check the actual schema of the recordings table
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'recordings'
ORDER BY ordinal_position;

-- Check what columns exist that might have metadata
SELECT 
  column_name
FROM information_schema.columns
WHERE table_name = 'recordings'
  AND (column_name LIKE '%metadata%' OR data_type = 'jsonb' OR data_type = 'json');