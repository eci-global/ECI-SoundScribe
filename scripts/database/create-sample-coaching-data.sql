-- Create sample coaching data to test analytics immediately
-- This script will add coaching evaluations to existing recordings

-- First, let's see what recordings exist and their status
DO $$
DECLARE
    rec RECORD;
    sample_coaching JSONB;
    coaching_variations JSONB[];
    i INTEGER := 0;
BEGIN
    -- Define various coaching evaluation samples for realistic variety
    coaching_variations := ARRAY[
        '{
            "overallScore": 85,
            "criteria": {
                "talkTimeRatio": 35,
                "objectionHandling": 8,
                "discoveryQuestions": 6,
                "valueArticulation": 9,
                "activeListening": 8,
                "nextSteps": true,
                "rapport": 9
            },
            "strengths": ["Excellent value articulation", "Strong rapport building", "Good discovery questions"],
            "improvements": ["Reduce talk time slightly", "Handle objections more systematically"],
            "actionItems": ["Practice concise explanations", "Use objection handling framework"],
            "summary": "Strong overall performance with excellent relationship building and value communication. Minor improvements needed in talk time management."
        }'::JSONB,
        '{
            "overallScore": 72,
            "criteria": {
                "talkTimeRatio": 45,
                "objectionHandling": 6,
                "discoveryQuestions": 4,
                "valueArticulation": 7,
                "activeListening": 7,
                "nextSteps": true,
                "rapport": 8
            },
            "strengths": ["Good rapport", "Clear next steps established"],
            "improvements": ["Ask more discovery questions", "Reduce talk time", "Improve objection handling"],
            "actionItems": ["Prepare discovery question framework", "Practice objection responses"],
            "summary": "Solid foundation with room for improvement in discovery and managing conversation flow."
        }'::JSONB,
        '{
            "overallScore": 91,
            "criteria": {
                "talkTimeRatio": 30,
                "objectionHandling": 9,
                "discoveryQuestions": 8,
                "valueArticulation": 9,
                "activeListening": 9,
                "nextSteps": true,
                "rapport": 9
            },
            "strengths": ["Perfect talk time ratio", "Excellent discovery", "Outstanding objection handling", "Superb active listening"],
            "improvements": ["Continue current approach"],
            "actionItems": ["Share best practices with team"],
            "summary": "Exceptional performance across all criteria. This call demonstrates best practices in sales methodology."
        }'::JSONB,
        '{
            "overallScore": 68,
            "criteria": {
                "talkTimeRatio": 50,
                "objectionHandling": 5,
                "discoveryQuestions": 3,
                "valueArticulation": 6,
                "activeListening": 6,
                "nextSteps": false,
                "rapport": 7
            },
            "strengths": ["Good initial rapport"],
            "improvements": ["Significantly reduce talk time", "Ask more discovery questions", "Establish clear next steps", "Improve objection handling"],
            "actionItems": ["Review discovery question techniques", "Practice next steps conversation", "Work on active listening skills"],
            "summary": "Areas for improvement identified in talk time management and discovery process. Focus on asking more questions and listening."
        }'::JSONB,
        '{
            "overallScore": 78,
            "criteria": {
                "talkTimeRatio": 38,
                "objectionHandling": 7,
                "discoveryQuestions": 5,
                "valueArticulation": 8,
                "activeListening": 7,
                "nextSteps": true,
                "rapport": 8
            },
            "strengths": ["Good value articulation", "Established next steps", "Solid rapport"],
            "improvements": ["More discovery questions", "Better objection handling"],
            "actionItems": ["Develop prospect pain point questions", "Practice objection response techniques"],
            "summary": "Good overall performance with strong value communication. Continue developing discovery and objection handling skills."
        }'::JSONB
    ];

    -- Update existing recordings with sample coaching data
    FOR rec IN 
        SELECT id, title, transcript, enable_coaching
        FROM recordings 
        WHERE transcript IS NOT NULL 
          AND transcript != ''
          AND coaching_evaluation IS NULL
          AND enable_coaching = true
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        -- Cycle through coaching variations for variety
        sample_coaching := coaching_variations[(i % array_length(coaching_variations, 1)) + 1];
        
        UPDATE recordings 
        SET coaching_evaluation = sample_coaching,
            updated_at = NOW()
        WHERE id = rec.id;
        
        RAISE NOTICE 'Added coaching evaluation to recording: % (Score: %)', 
            rec.title, 
            sample_coaching->>'overallScore';
        
        i := i + 1;
    END LOOP;

    -- Summary of what was updated
    RAISE NOTICE 'Updated % recordings with coaching evaluations', i;
    
    -- Show current coaching data status
    RAISE NOTICE 'Current coaching data status:';
    RAISE NOTICE 'Total recordings: %', (SELECT COUNT(*) FROM recordings);
    RAISE NOTICE 'With coaching: %', (SELECT COUNT(*) FROM recordings WHERE coaching_evaluation IS NOT NULL);
    RAISE NOTICE 'With transcripts: %', (SELECT COUNT(*) FROM recordings WHERE transcript IS NOT NULL AND transcript != '');
    RAISE NOTICE 'Coaching enabled: %', (SELECT COUNT(*) FROM recordings WHERE enable_coaching = true);
END $$;