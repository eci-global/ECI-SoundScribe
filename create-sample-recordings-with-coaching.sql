-- Create sample recordings with coaching data for immediate analytics testing
-- This ensures we have data to display even if no recordings exist

-- Note: Replace 'your-user-id-here' with actual user ID from auth.users table
-- You can find user ID by running: SELECT id, email FROM auth.users;

DO $$
DECLARE
    sample_user_id UUID;
    recording_id UUID;
BEGIN
    -- Get the first user ID (or create one if needed)
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, create a sample one
    IF sample_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Please create a user account first or run this script after signing up.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using user ID: %', sample_user_id;

    -- Create sample recording 1: High performer
    INSERT INTO recordings (
        id, user_id, title, description, file_type, status, duration,
        transcript, summary, coaching_evaluation, ai_moments, enable_coaching,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'Q4 Sales Review Call - Enterprise Client',
        'Quarterly business review with major enterprise client discussing renewal and expansion opportunities',
        'audio',
        'completed',
        1847, -- ~30 minutes
        'Thank you for joining our Q4 review today. I wanted to start by understanding your current priorities... [Sample transcript content] ...The key pain points I''m hearing are around scalability and integration. Our enterprise solution directly addresses these challenges with... Based on our discussion, I''d like to schedule a technical deep-dive for next week. Does Tuesday at 2 PM work for your team?',
        'Successful quarterly review call with enterprise client. Strong discovery revealed scalability concerns and integration challenges. Positioned enterprise solution effectively. Next steps: technical deep-dive scheduled for next Tuesday.',
        '{
            "overallScore": 89,
            "criteria": {
                "talkTimeRatio": 32,
                "objectionHandling": 9,
                "discoveryQuestions": 8,
                "valueArticulation": 9,
                "activeListening": 9,
                "nextSteps": true,
                "rapport": 9
            },
            "strengths": ["Excellent discovery questions", "Strong value articulation", "Perfect talk time ratio", "Outstanding active listening"],
            "improvements": ["Continue current approach"],
            "actionItems": ["Share discovery framework with team", "Document client technical requirements"],
            "summary": "Exceptional performance demonstrating best practices in enterprise sales. Strong discovery uncovered key pain points and positioned solution effectively."
        }'::JSONB,
        '[
            {
                "id": "moment-1-1",
                "type": "chapter",
                "start_time": 45,
                "tooltip": "Meeting Introduction & Agenda"
            },
            {
                "id": "moment-1-2", 
                "type": "bookmark",
                "start_time": 234,
                "tooltip": "Key Discovery Question About Scalability"
            },
            {
                "id": "moment-1-3",
                "type": "objection",
                "start_time": 567,
                "tooltip": "Client Concern About Integration Complexity"
            },
            {
                "id": "moment-1-4",
                "type": "action",
                "start_time": 1203,
                "tooltip": "Technical Deep-dive Scheduled"
            }
        ]'::JSONB,
        true,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    );

    -- Create sample recording 2: Good performer with areas for improvement
    INSERT INTO recordings (
        id, user_id, title, description, file_type, status, duration,
        transcript, summary, coaching_evaluation, ai_moments, enable_coaching,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'New Prospect Discovery Call - SMB',
        'Initial discovery call with small business prospect interested in our standard solution',
        'audio',
        'completed',
        1245, -- ~20 minutes
        'Hi there, thanks for your interest in our solution. Let me tell you about our features... [Sample transcript] ...We have amazing capabilities that I think you''ll love. Our platform does X, Y, and Z... Oh, you have concerns about pricing? Well, let me explain why our value justifies the cost... I think we should move forward. What do you think?',
        'Discovery call with SMB prospect. Presented solution features but limited discovery of specific needs. Price objection emerged. Some interest expressed but needs follow-up.',
        '{
            "overallScore": 71,
            "criteria": {
                "talkTimeRatio": 47,
                "objectionHandling": 6,
                "discoveryQuestions": 4,
                "valueArticulation": 7,
                "activeListening": 6,
                "nextSteps": true,
                "rapport": 7
            },
            "strengths": ["Established next steps", "Good product knowledge"],
            "improvements": ["Reduce talk time significantly", "Ask more discovery questions", "Improve objection handling", "Focus on prospect needs before presenting"],
            "actionItems": ["Practice discovery question framework", "Develop objection handling responses", "Work on active listening skills"],
            "summary": "Solid foundation but needs improvement in discovery and talk time management. Too much presenting before understanding prospect needs."
        }'::JSONB,
        '[
            {
                "id": "moment-2-1",
                "type": "chapter",
                "start_time": 23,
                "tooltip": "Call Opening & Introduction"
            },
            {
                "id": "moment-2-2",
                "type": "sentiment_neg",
                "start_time": 456,
                "tooltip": "Prospect Shows Pricing Concerns"
            },
            {
                "id": "moment-2-3",
                "type": "objection",
                "start_time": 789,
                "tooltip": "Price Objection Raised"
            },
            {
                "id": "moment-2-4",
                "type": "action",
                "start_time": 1100,
                "tooltip": "Follow-up Call Scheduled"
            }
        ]'::JSONB,
        true,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    );

    -- Create sample recording 3: Average performer
    INSERT INTO recordings (
        id, user_id, title, description, file_type, status, duration,
        transcript, summary, coaching_evaluation, ai_moments, enable_coaching,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'Follow-up Call - Mid-market Prospect',
        'Second call with mid-market prospect to address questions and discuss implementation',
        'audio',
        'completed',
        1654, -- ~27 minutes
        'Thanks for making time today. I wanted to follow up on our last conversation... [Sample transcript] ...You mentioned concerns about implementation timeline. Let me walk through our typical process... I hear that integration is important. Can you tell me more about your current systems? ...That makes sense. I think our solution can work well for you. Let me send over some additional information.',
        'Follow-up call addressing implementation concerns. Good questions about current systems. Provided process overview. Sent additional information for review.',
        '{
            "overallScore": 76,
            "criteria": {
                "talkTimeRatio": 40,
                "objectionHandling": 7,
                "discoveryQuestions": 6,
                "valueArticulation": 7,
                "activeListening": 7,
                "nextSteps": true,
                "rapport": 8
            },
            "strengths": ["Good rapport building", "Addressed specific concerns", "Asked relevant follow-up questions"],
            "improvements": ["Reduce talk time", "More systematic discovery", "Stronger value articulation"],
            "actionItems": ["Develop implementation timeline framework", "Practice value-based selling approach"],
            "summary": "Good follow-up approach with solid rapport. Opportunity to improve discovery depth and value articulation for stronger positioning."
        }'::JSONB,
        '[
            {
                "id": "moment-3-1",
                "type": "chapter",
                "start_time": 34,
                "tooltip": "Follow-up Call Opening"
            },
            {
                "id": "moment-3-2",
                "type": "bookmark",
                "start_time": 312,
                "tooltip": "Implementation Timeline Discussion"
            },
            {
                "id": "moment-3-3",
                "type": "bookmark",
                "start_time": 890,
                "tooltip": "Integration Requirements Covered"
            },
            {
                "id": "moment-3-4",
                "type": "action",
                "start_time": 1500,
                "tooltip": "Additional Information Sent"
            }
        ]'::JSONB,
        true,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours'
    );

    -- Create sample recording 4: Needs significant improvement
    INSERT INTO recordings (
        id, user_id, title, description, file_type, status, duration,
        transcript, summary, coaching_evaluation, ai_moments, enable_coaching,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'Cold Outreach Call - Technology Startup',
        'Cold call to technology startup CEO to introduce our solution',
        'audio',
        'completed',
        892, -- ~15 minutes
        'Hi, I''m calling about our amazing software solution... [Sample transcript] ...We''ve helped hundreds of companies like yours... Let me tell you all about our features... Our ROI is incredible... I think you should definitely consider us... Can I send you a proposal? No? Well, maybe we can talk again next month...',
        'Cold outreach call to startup CEO. Heavy focus on product features. Limited engagement from prospect. No clear next steps established.',
        '{
            "overallScore": 58,
            "criteria": {
                "talkTimeRatio": 65,
                "objectionHandling": 4,
                "discoveryQuestions": 2,
                "valueArticulation": 5,
                "activeListening": 4,
                "nextSteps": false,
                "rapport": 5
            },
            "strengths": ["Product knowledge"],
            "improvements": ["Drastically reduce talk time", "Ask discovery questions first", "Build rapport before presenting", "Establish clear next steps", "Improve objection handling"],
            "actionItems": ["Learn consultative selling approach", "Practice opening questions", "Develop rapport building techniques", "Work on active listening"],
            "summary": "Significant improvement needed. Focus on discovery and listening rather than presenting. Need to build rapport and understand prospect needs first."
        }'::JSONB,
        '[
            {
                "id": "moment-4-1",
                "type": "chapter",
                "start_time": 12,
                "tooltip": "Cold Call Opening"
            },
            {
                "id": "moment-4-2",
                "type": "sentiment_neg",
                "start_time": 189,
                "tooltip": "Prospect Disengagement Detected"
            },
            {
                "id": "moment-4-3",
                "type": "objection",
                "start_time": 456,
                "tooltip": "Not Interested Response"
            },
            {
                "id": "moment-4-4",
                "type": "sentiment_neg",
                "start_time": 780,
                "tooltip": "Call Ending Abruptly"
            }
        ]'::JSONB,
        true,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
    );

    -- Create sample recording 5: Very strong performer
    INSERT INTO recordings (
        id, user_id, title, description, file_type, status, duration,
        transcript, summary, coaching_evaluation, ai_moments, enable_coaching,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        sample_user_id,
        'Closing Call - Strategic Partnership',
        'Final discussion to close strategic partnership deal with key enterprise client',
        'audio',
        'completed',
        2156, -- ~36 minutes
        'Thank you for your time today. I know this partnership decision is important for your organization... [Sample transcript] ...Help me understand - what would success look like for you in this partnership? ...That''s a great point about ROI measurement. Based on our previous discussions, it sounds like the key metrics are... I''m hearing some hesitation. What concerns do you have? ...I completely understand that concern. Here''s how we''ve addressed similar situations... Given everything we''ve discussed, what do you think makes the most sense as a next step?',
        'Strategic closing call with excellent discovery and objection handling. Addressed ROI concerns systematically. Strong partnership positioning. Mutual agreement on next steps.',
        '{
            "overallScore": 94,
            "criteria": {
                "talkTimeRatio": 28,
                "objectionHandling": 10,
                "discoveryQuestions": 9,
                "valueArticulation": 9,
                "activeListening": 10,
                "nextSteps": true,
                "rapport": 9
            },
            "strengths": ["Masterful discovery questions", "Exceptional objection handling", "Perfect talk time ratio", "Outstanding active listening", "Strategic partnership positioning"],
            "improvements": ["Continue excellence"],
            "actionItems": ["Document methodology for team training", "Create case study from this approach"],
            "summary": "Exceptional demonstration of consultative selling mastery. Perfect balance of discovery, listening, and strategic positioning. Textbook example of enterprise sales excellence."
        }'::JSONB,
        '[
            {
                "id": "moment-5-1",
                "type": "chapter",
                "start_time": 67,
                "tooltip": "Strategic Partnership Discussion Opening"
            },
            {
                "id": "moment-5-2",
                "type": "bookmark",
                "start_time": 445,
                "tooltip": "Success Metrics Discovery"
            },
            {
                "id": "moment-5-3",
                "type": "objection",
                "start_time": 987,
                "tooltip": "ROI Concern Raised"
            },
            {
                "id": "moment-5-4",
                "type": "bookmark",
                "start_time": 1234,
                "tooltip": "Objection Successfully Handled"
            },
            {
                "id": "moment-5-5",
                "type": "action",
                "start_time": 1890,
                "tooltip": "Partnership Next Steps Agreed"
            }
        ]'::JSONB,
        true,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour'
    );

    RAISE NOTICE 'Created 5 sample recordings with coaching evaluations for user: %', sample_user_id;
    RAISE NOTICE 'Scores: 89, 71, 76, 58, 94 - providing good variety for analytics testing';
    RAISE NOTICE 'You can now test the analytics page with real data!';

END $$;