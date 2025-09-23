-- Fix existing recordings that are stuck showing "pending" but are actually complete
-- This updates recordings that have transcript and summary but wrong status

-- First, let's see what recordings will be affected (for logging)
DO $$ 
DECLARE
    affected_count INTEGER;
BEGIN 
    SELECT COUNT(*) INTO affected_count
    FROM recordings 
    WHERE transcript IS NOT NULL 
      AND (summary IS NOT NULL OR ai_summary IS NOT NULL)
      AND status NOT IN ('completed', 'failed');
      
    RAISE NOTICE 'Found % recordings that need status correction', affected_count;
END $$;

-- Update recordings that have both transcript and summary but wrong status
UPDATE recordings 
SET 
    status = 'completed',
    updated_at = NOW()
WHERE transcript IS NOT NULL 
  AND (summary IS NOT NULL OR ai_summary IS NOT NULL)
  AND status NOT IN ('completed', 'failed');

-- Also fix recordings that only have transcript (partial completion)
UPDATE recordings 
SET 
    status = 'transcribed',
    updated_at = NOW()
WHERE transcript IS NOT NULL 
  AND summary IS NULL 
  AND ai_summary IS NULL
  AND status NOT IN ('transcribed', 'completed', 'failed', 'transcription_failed');

-- Fix any remaining invalid statuses (safety net)
UPDATE recordings 
SET 
    status = CASE
        WHEN transcript IS NOT NULL AND (summary IS NOT NULL OR ai_summary IS NOT NULL) THEN 'completed'
        WHEN transcript IS NOT NULL THEN 'transcribed'
        WHEN file_url IS NOT NULL THEN 'processing'
        ELSE 'failed'
    END,
    updated_at = NOW()
WHERE status NOT IN (
    'uploading', 'processing', 'processing_large_file', 
    'transcribing', 'transcribed', 'transcription_failed', 
    'completed', 'failed'
);

-- Show results
DO $$ 
DECLARE
    completed_count INTEGER;
    transcribed_count INTEGER;
    processing_count INTEGER;
BEGIN 
    SELECT COUNT(*) INTO completed_count FROM recordings WHERE status = 'completed';
    SELECT COUNT(*) INTO transcribed_count FROM recordings WHERE status = 'transcribed';
    SELECT COUNT(*) INTO processing_count FROM recordings WHERE status IN ('processing', 'processing_large_file', 'transcribing');
    
    RAISE NOTICE 'Status update complete:';
    RAISE NOTICE '  - Completed: % recordings', completed_count;
    RAISE NOTICE '  - Transcribed: % recordings', transcribed_count;
    RAISE NOTICE '  - Processing: % recordings', processing_count;
END $$;