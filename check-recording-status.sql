-- Quick SQL queries to check recording analysis status
-- Replace '756c2e77-8c48-4755-9009-312d28d47189' with your actual recording ID

-- 1. Check basic recording info
SELECT 
    id,
    title,
    status,
    created_at,
    ai_generated_at,
    length(transcript) as transcript_length,
    CASE WHEN transcript IS NOT NULL THEN 'Yes' ELSE 'No' END as has_transcript,
    CASE WHEN summary IS NOT NULL THEN 'Yes' ELSE 'No' END as has_summary,
    CASE WHEN ai_summary IS NOT NULL THEN 'Yes' ELSE 'No' END as has_ai_summary
FROM recordings 
WHERE id = '756c2e77-8c48-4755-9009-312d28d47189';

-- 2. Check topic_segments for this recording
SELECT 
    COUNT(*) as topic_count,
    STRING_AGG(topic, ', ') as topics_list
FROM topic_segments 
WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189';

-- 3. Detailed topic_segments info
SELECT 
    topic,
    category,
    start_time,
    end_time,
    confidence,
    summary,
    metadata,
    created_at
FROM topic_segments 
WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
ORDER BY start_time;

-- 4. Check speaker_segments for this recording
SELECT 
    COUNT(*) as speaker_segments_count,
    STRING_AGG(DISTINCT speaker_name, ', ') as speakers_list
FROM speaker_segments 
WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189';

-- 5. Detailed speaker_segments info
SELECT 
    speaker_name,
    start_time,
    end_time,
    LEFT(text, 100) as text_preview,
    created_at
FROM speaker_segments 
WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
ORDER BY start_time;

-- 6. Check AI usage logs for this recording
SELECT 
    operation,
    model_used,
    provider,
    total_tokens,
    estimated_cost,
    created_at
FROM ai_usage_logs 
WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
ORDER BY created_at DESC;

-- 7. Combined summary query
SELECT 
    r.id,
    r.title,
    r.status,
    r.ai_generated_at,
    COALESCE(ts.topic_count, 0) as topic_segments_count,
    COALESCE(ss.speaker_count, 0) as speaker_segments_count,
    COALESCE(ul.usage_entries, 0) as ai_usage_logs_count,
    CASE 
        WHEN r.transcript IS NULL THEN 'No transcript'
        WHEN COALESCE(ts.topic_count, 0) = 0 THEN 'Transcript exists but no topic analysis'
        ELSE 'Fully analyzed'
    END as analysis_status
FROM recordings r
LEFT JOIN (
    SELECT recording_id, COUNT(*) as topic_count 
    FROM topic_segments 
    WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
    GROUP BY recording_id
) ts ON r.id = ts.recording_id
LEFT JOIN (
    SELECT recording_id, COUNT(*) as speaker_count 
    FROM speaker_segments 
    WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
    GROUP BY recording_id
) ss ON r.id = ss.recording_id
LEFT JOIN (
    SELECT recording_id, COUNT(*) as usage_entries 
    FROM ai_usage_logs 
    WHERE recording_id = '756c2e77-8c48-4755-9009-312d28d47189'
    GROUP BY recording_id
) ul ON r.id = ul.recording_id
WHERE r.id = '756c2e77-8c48-4755-9009-312d28d47189';

-- 8. Check if tables exist and have proper structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('topic_segments', 'speaker_segments', 'ai_usage_logs')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;