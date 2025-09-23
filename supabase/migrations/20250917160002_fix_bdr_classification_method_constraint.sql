-- Fix existing data and add proper check constraint for classification_method
-- The table has invalid values that violate the constraint

-- Update any invalid classification_method values to 'manual' 
UPDATE bdr_call_classifications 
SET classification_method = 'manual' 
WHERE classification_method IS NULL 
   OR classification_method NOT IN ('manager_upload', 'ai_analysis', 'automated', 'manual');

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'bdr_call_classifications_classification_method_check') THEN
    ALTER TABLE bdr_call_classifications DROP CONSTRAINT bdr_call_classifications_classification_method_check;
  END IF;
END $$;

-- Add the proper check constraint
ALTER TABLE bdr_call_classifications 
ADD CONSTRAINT bdr_call_classifications_classification_method_check 
CHECK (classification_method IN ('manager_upload', 'ai_analysis', 'automated', 'manual'));

-- Add status constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'bdr_call_classifications_status_check') THEN
    ALTER TABLE bdr_call_classifications 
    ADD CONSTRAINT bdr_call_classifications_status_check 
    CHECK (status IN ('pending', 'completed', 'failed'));
  END IF;
END $$;