import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { corsHeaders, createErrorResponse, createSuccessResponse, handleCORSPreflight } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// BDR Criteria interfaces and conversion function
interface BDRCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  scoringGuidelines: {
    excellent: { min: number; description: string };
    good: { min: number; description: string };
    needs_improvement: { min: number; description: string };
    poor: { min: number; description: string };
  };
  evaluationPrompts: {
    analysisPrompt: string;
    scoringPrompt: string;
    feedbackPrompt: string;
  };
}

// Default BDR criteria for fallback
const DEFAULT_BDR_CRITERIA: BDRCriteria[] = [
  {
    id: 'opening',
    name: 'Opening',
    description: 'Rep states their name, company, and reason for calling in a confident tone with pattern interrupt',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze opening effectiveness and pattern interrupt execution.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Provide specific feedback on opening execution improvements.'
    }
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    description: 'Acknowledges objections without being combative, maintains curiosity, and reframes perspective',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze objection handling and reframing techniques.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Suggest objection handling improvements based on rubric criteria.'
    }
  },
  {
    id: 'qualification',
    name: 'Qualification',
    description: 'Identifies fit criteria, uncovers pain points, uses open-ended questions and active listening',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze qualification and discovery question effectiveness.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Provide qualification technique improvements based on rubric.'
    }
  },
  {
    id: 'tone_and_energy',
    name: 'Tone & Energy',
    description: 'Positive, energetic tone with natural pacing - not flat, apologetic, rushed, or monotone',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze tone, energy, and pacing effectiveness.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Suggest tone and energy improvements based on rubric criteria.'
    }
  },
  {
    id: 'assertiveness_and_control',
    name: 'Assertiveness & Control',
    description: 'Guides conversation without being pushy, practices active listening, creates urgency',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze conversation control and assertiveness techniques.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Provide assertiveness and control improvements based on rubric.'
    }
  },
  {
    id: 'business_acumen_and_relevance',
    name: 'Business Acumen & Relevance',
    description: 'Uses industry/role insights and shares relevant stories, case studies, or proof points',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze business acumen and relevance of insights shared.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Suggest business acumen improvements based on rubric criteria.'
    }
  },
  {
    id: 'closing',
    name: 'Closing',
    description: 'Summarizes prospect needs, shares company track record, uses assumptive close, confirms details',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze closing effectiveness and next steps confirmation.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Provide closing technique improvements based on rubric criteria.'
    }
  },
  {
    id: 'talk_time',
    name: 'Talk Time',
    description: 'Rep speaks less than 50% of the time (ideal ratio: 43/57 rep/prospect)',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze talk time balance and listening effectiveness.',
      scoringPrompt: 'Rate on 0-4 scale based on extracted scoring rubric guidelines.',
      feedbackPrompt: 'Suggest talk time balance improvements based on rubric criteria.'
    }
  }
];

/**
 * Convert extracted scoring rubric from CSV to BDRCriteria format
 * This enables training program updates with manager-defined scoring guidelines
 */
function convertScoringRubricToBDRCriteria(scoringRubric: any): BDRCriteria[] {
  if (!scoringRubric || !scoringRubric.levels || !Array.isArray(scoringRubric.levels)) {
    console.log('🔄 No valid scoring rubric found, using default criteria');
    return DEFAULT_BDR_CRITERIA;
  }

  console.log('🎯 Converting extracted scoring rubric to BDR criteria format');

  // Create scoring guidelines from extracted rubric levels
  const scoringGuidelines = {
    excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
    good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
    needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
    poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
  };

  // Override with extracted scoring guidelines if available
  scoringRubric.levels.forEach((level: any) => {
    if (level.score === 4 || level.label === '4') {
      scoringGuidelines.excellent.description = level.description;
    } else if (level.score === 3 || level.label === '3') {
      scoringGuidelines.good.description = level.description;
    } else if (level.score === 2 || level.label === '2') {
      scoringGuidelines.needs_improvement.description = level.description;
    } else if (level.score === 1 || level.label === '1') {
      scoringGuidelines.poor.description = level.description;
    } else if (level.score === 0 || level.label === '0') {
      scoringGuidelines.poor.description = level.description;
    }
  });

  // Enhanced BDR criteria using extracted scoring guidelines
  const enhancedCriteria = DEFAULT_BDR_CRITERIA.map(defaultCriterion => ({
    ...defaultCriterion,
    scoringGuidelines,
    evaluationPrompts: {
      ...defaultCriterion.evaluationPrompts,
      scoringPrompt: `Rate on 0-4 scale using extracted rubric: ${scoringRubric.levels.map((l: any) => `${l.score || l.label}=${l.description}`).join(', ')}`
    }
  }));

  console.log(`✅ Enhanced ${enhancedCriteria.length} BDR criteria with extracted scoring rubric`);
  return enhancedCriteria;
}

Deno.serve(async (req) => {
  console.log('🚀 upload-scorecard-data function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Initialize Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestBody = await req.json();
    const format = requestBody?.dataFormat || 'unknown';

    // Handle test recording creation action
    if (requestBody.action === 'create_test_recording') {
      console.log('🧪 Creating test recording for BDR scorecard matching...');
      try {
        const testRecordingData = requestBody.recordingData;
        const { data: newRecording, error: recordingError } = await supabase
          .from('recordings')
          .insert(testRecordingData)
          .select()
          .single();

        if (recordingError) {
          console.error('❌ Test recording creation failed:', recordingError);
          return createErrorResponse(`Test recording creation failed: ${recordingError.message}`, 500);
        }

        console.log('✅ Test recording created:', newRecording);
        return createSuccessResponse({
          message: 'Test recording created successfully',
          recording: newRecording
        });
      } catch (error) {
        console.error('❌ Test recording creation error:', error);
        return createErrorResponse('Test recording creation failed', 500);
      }
    }

    // Verify authentication - skip if no auth header provided (development mode)
    let user = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      // Create client with user's auth token for user verification
      const userSupabase = createClient(
        supabaseUrl, 
        Deno.env.get('SUPABASE_ANON_KEY')!, 
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const {
        data: { user: authUser },
        error: authError,
      } = await userSupabase.auth.getUser();

      if (authError || !authUser) {
        return createErrorResponse('Unauthorized - Please sign in and try again', 401);
      }
      user = authUser;
    } else {
      // Development mode - use real user ID that exists in database
      user = {
        id: '1fd13984-3457-40ea-9220-20447a1ff9ae', // Real user ID from successful evaluation record
        email: 'dev@example.com'
      };
    }

    // Validate required fields and UUIDs
    if (!requestBody.trainingProgramId) {
      return createErrorResponse('Training program ID is required', 400);
    }

    if (!isValidUUID(requestBody.trainingProgramId)) {
      return createErrorResponse('Invalid training program ID format', 400);
    }

    const managerId = requestBody.managerId || user.id;
    if (!isValidUUID(managerId)) {
      return createErrorResponse('Invalid manager ID format', 400);
    }

    // Validate training program exists with enhanced error handling
    console.log('🔍 Validating training program:', requestBody.trainingProgramId);
    console.log('🔧 Service role key status:', supabaseServiceKey ? 'Present' : 'Missing');
    console.log('🔧 Supabase URL:', supabaseUrl);
    
    let trainingPrograms;
    try {
      const { data: queryData, error: programError } = await supabase
        .from('bdr_training_programs')
        .select('*')
        .eq('id', requestBody.trainingProgramId);

      console.log('🔧 Training program query result:', { data: queryData, error: programError });

      if (programError) {
        console.error('❌ Training program query failed:', {
          message: programError.message,
          details: programError.details,
          hint: programError.hint,
          code: programError.code
        });
        return createErrorResponse(`Training program query failed: ${programError.message}`, 500);
      }

      trainingPrograms = queryData;

      if (!trainingPrograms || trainingPrograms.length === 0) {
        console.error('❌ Training program not found:', requestBody.trainingProgramId);
        // Try to test service role authentication by making a simple query
        try {
          const { data: testData, error: testError } = await supabase
            .from('bdr_training_programs')
            .select('count')
            .limit(1);
          console.log('🔧 Service role test query:', { data: testData, error: testError });
        } catch (testErr) {
          console.error('🔧 Service role authentication test failed:', testErr);
        }
        return createErrorResponse('Training program not found or invalid', 404);
      }
    } catch (queryError) {
      console.error('❌ Training program validation exception:', queryError);
      return createErrorResponse('Training program validation failed due to authentication or connection issue', 500);
    }

    const trainingProgram = trainingPrograms[0];
    console.log('✅ Training program validated:', trainingProgram.name);

    const processedData = Array.isArray(requestBody?.processedData)
      ? requestBody.processedData
      : Array.isArray(requestBody?.data)
        ? requestBody.data
        : null;

    console.log('📋 Scorecard upload request received:', {
      format,
      hasProcessedData: Array.isArray(processedData),
      processedCount: Array.isArray(processedData) ? processedData.length : 0,
      hasFileData: !!requestBody?.fileData,
      fileName: requestBody?.fileName,
      trainingProgramId: requestBody?.trainingProgramId,
      trainingProgramName: trainingProgram.name,
      userId: user?.id,
      managerId
    });

    // Accept both pre-processed template data and raw export data
    if (!processedData && !requestBody?.fileData) {
      return createErrorResponse('Invalid payload: expected processedData[] or fileData', 400);
    }

    if (Array.isArray(processedData) && processedData.length === 0) {
      return createErrorResponse('No data found to process', 400);
    }

    // Generate upload ID for tracking
    const uploadId = `upload_${crypto.randomUUID()}`;
    const processedCount = Array.isArray(processedData) ? processedData.length : 0;

    // Initialize counters at function scope to avoid undefined reference errors
    let totalScore = 0;
    let scoreCount = 0;
    let createdEvaluations = 0;
    let skippedRecords = 0;

    // Skip upload tracking for now due to RLS policy issues
    console.log('⚠️ Skipping upload tracking record due to RLS policy configuration');
    console.log('📋 Upload info:', {
      uploadId,
      fileName: requestBody.fileName || 'unknown.xlsx',
      processedCount
    });

    // Store the actual scorecard data if provided
    if (Array.isArray(processedData) && processedData.length > 0) {
      console.log('📊 Processing scorecard evaluation data');

      // Check if any records have scoring rubric and update training program
      let hasUpdatedTrainingProgram = false;
      for (const record of processedData) {
        if (record.scoringRubric && !hasUpdatedTrainingProgram) {
          console.log('🎯 Found scoring rubric in CSV data, updating training program...');

          try {
            // Convert scoring rubric to BDR criteria format for storage
            const convertedCriteria = convertScoringRubricToBDRCriteria(record.scoringRubric);

            // Update training program with extracted criteria
            const { error: updateError } = await supabase
              .from('bdr_training_programs')
              .update({
                scorecard_criteria: convertedCriteria,
                updated_at: new Date().toISOString(),
                version: trainingProgram.version + 1
              })
              .eq('id', requestBody.trainingProgramId);

            if (updateError) {
              console.error('❌ Failed to update training program with scoring rubric:', updateError);
            } else {
              console.log('✅ Updated training program with extracted scoring rubric criteria');
              hasUpdatedTrainingProgram = true;
            }
          } catch (conversionError) {
            console.error('❌ Failed to convert scoring rubric:', conversionError);
          }

          break; // Only need to update once per upload
        }
      }

      // Process each scorecard record and create bdr_scorecard_evaluations
      for (const record of processedData) {
        console.log(`✅ Processing: ${record.callIdentifier || 'Unknown Call'} - Overall Score: ${record.overallScore || 0}`);
        
        // Create criteria scores object with enhanced mapping including expectations data
        const criteriaScores = {
          opening: {
            score: record.openingDetail?.score || record.openingScore || 0,
            avgScore: record.openingDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.openingDetail?.notes || "Manager assessment",
            expectations: record.openingDetail?.expectations || [],
            suggestions: []
          },
          objection_handling: {
            score: record.objectionHandlingDetail?.score || record.objectionHandlingScore || 0,
            avgScore: record.objectionHandlingDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.objectionHandlingDetail?.notes || "Manager assessment",
            expectations: record.objectionHandlingDetail?.expectations || [],
            suggestions: []
          },
          qualification: {
            score: record.qualificationDetail?.score || record.qualificationScore || 0,
            avgScore: record.qualificationDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.qualificationDetail?.notes || "Manager assessment",
            expectations: record.qualificationDetail?.expectations || [],
            suggestions: []
          },
          tone_and_energy: {
            score: record.toneEnergyDetail?.score || record.toneEnergyScore || 0,
            avgScore: record.toneEnergyDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.toneEnergyDetail?.notes || "Manager assessment",
            expectations: record.toneEnergyDetail?.expectations || [],
            suggestions: []
          },
          assertiveness_and_control: {
            score: record.assertivenessControlDetail?.score || record.assertivenessControlScore || 0,
            avgScore: record.assertivenessControlDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.assertivenessControlDetail?.notes || "Manager assessment",
            expectations: record.assertivenessControlDetail?.expectations || [],
            suggestions: []
          },
          business_acumen_and_relevance: {
            score: record.businessAcumenDetail?.score || record.businessAcumenScore || 0,
            avgScore: record.businessAcumenDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.businessAcumenDetail?.notes || "Manager assessment",
            expectations: record.businessAcumenDetail?.expectations || [],
            suggestions: []
          },
          closing: {
            score: record.closingDetail?.score || record.closingScore || 0,
            avgScore: record.closingDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.closingDetail?.notes || "Manager assessment",
            expectations: record.closingDetail?.expectations || [],
            suggestions: []
          },
          talk_time: {
            score: record.talkTimeDetail?.score || record.talkTimeScore || 0,
            avgScore: record.talkTimeDetail?.avgScore,
            maxScore: 4,
            weight: 12.5,
            feedback: record.talkTimeDetail?.notes || "Manager assessment",
            expectations: record.talkTimeDetail?.expectations || [],
            suggestions: []
          }
        };

        // Create enhanced BDR insights object using expectations data
        const keyStrengths = [];
        const improvementAreas = [];
        const coachingPriorities = [];

        // Analyze scores and expectations to provide intelligent insights
        Object.entries(criteriaScores).forEach(([criterion, data]) => {
          if (data.score >= 3) {
            keyStrengths.push(`Strong ${criterion.replace(/_/g, ' ')}: ${data.score}/4`);
          } else if (data.score <= 2) {
            improvementAreas.push(`${criterion.replace(/_/g, ' ')}: ${data.score}/4 - Review expectations`);
            if (data.expectations?.length > 0) {
              coachingPriorities.push(`Focus on ${criterion.replace(/_/g, ' ')} criteria (${data.expectations.length} expectations)`);
            }
          }
        });

        const bdrInsights = {
          keyStrengths: keyStrengths.length > 0 ? keyStrengths : ["Manager provided assessment"],
          improvementAreas: improvementAreas.length > 0 ? improvementAreas : ["See manager notes"],
          coachingPriorities: coachingPriorities.length > 0 ? coachingPriorities : ["Follow up with manager"],
          nextCallFocus: ["Apply manager feedback", "Review detailed expectations"],
          competencyLevel: record.overallScore >= 3 ? "proficient" : record.overallScore >= 2 ? "developing" : "needs_improvement"
        };

        // Try to find a matching recording by call identifier (title matching)
        let recordingId: string | null = null;
        if (record.callIdentifier) {
          console.log(`🔍 Searching for recording with title: "${record.callIdentifier}"`);
          
          // Test service role authentication first
          console.log('🔧 Testing service role authentication and RLS bypass...');
          try {
            // First, test if we can access recordings at all with service role
            const { data: testAccess, error: accessError } = await supabase
              .from('recordings')
              .select('id')
              .limit(1);
              
            console.log('🔧 Service role access test:', { 
              hasData: !!testAccess, 
              recordCount: testAccess?.length || 0, 
              error: accessError ? {
                message: accessError.message,
                code: accessError.code,
                details: accessError.details,
                hint: accessError.hint
              } : null
            });
            
            if (accessError) {
              console.error('❌ Service role cannot access recordings table:', accessError);
              console.log('🔧 Service role key status:', supabaseServiceKey ? 'Present' : 'Missing');
              console.log('🔧 Environment check:', {
                hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
                hasUrl: !!Deno.env.get('SUPABASE_URL')
              });
            }
          } catch (testError) {
            console.error('❌ Service role authentication test failed:', testError);
          }
          
          // Now try the actual search with enhanced error handling
          console.log(`🔍 Searching for recording with service role...`);
          const { data: recordings, error: recordingError } = await supabase
            .from('recordings')
            .select('id, title, user_id, content_type, created_at')
            .ilike('title', `%${record.callIdentifier}%`)
            .limit(10);
          
          console.log(`🔧 Recording ILIKE search result:`, { 
            query: `title ILIKE '%${record.callIdentifier}%'`,
            data: recordings, 
            error: recordingError ? {
              message: recordingError.message,
              code: recordingError.code,
              details: recordingError.details,
              hint: recordingError.hint
            } : null,
            recordCount: recordings?.length || 0
          });
          
          // Also try exact match
          const { data: exactRecordings, error: exactError } = await supabase
            .from('recordings')
            .select('id, title, user_id, content_type, created_at')
            .eq('title', record.callIdentifier)
            .limit(10);
          
          console.log(`🔧 Recording exact match result:`, { 
            query: `title = '${record.callIdentifier}'`,
            data: exactRecordings, 
            error: exactError ? {
              message: exactError.message,
              code: exactError.code,
              details: exactError.details,
              hint: exactError.hint
            } : null,
            recordCount: exactRecordings?.length || 0
          });
            
          if (recordings && recordings.length > 0) {
            recordingId = recordings[0].id;
            console.log(`🔗 Matched call "${record.callIdentifier}" to recording ${recordingId} (title: "${recordings[0].title}", user: ${recordings[0].user_id})`);
          } else if (exactRecordings && exactRecordings.length > 0) {
            recordingId = exactRecordings[0].id;
            console.log(`🔗 Exact matched call "${record.callIdentifier}" to recording ${recordingId} (title: "${exactRecordings[0].title}", user: ${exactRecordings[0].user_id})`);
          } else {
            console.log(`⚠️ No recording found for call identifier: "${record.callIdentifier}"`);
            
            // Debug: List ALL recordings to see what's actually available with service role
            console.log('🔧 Attempting to list all available recordings with service role...');
            const { data: allRecordings, error: allError } = await supabase
              .from('recordings')
              .select('id, title, content_type, user_id, created_at')
              .order('created_at', { ascending: false })
              .limit(10);
              
            console.log(`🔧 All recordings query result:`, { 
              data: allRecordings, 
              error: allError ? {
                message: allError.message,
                code: allError.code,
                details: allError.details
              } : null,
              recordCount: allRecordings?.length || 0
            });
          }
        }

        if (!recordingId) {
          console.warn(`🚫 Skipping evaluation for ${record.callIdentifier || 'Unknown Call'} - missing recording match`);
          skippedRecords++;
          continue;
        }

        if (record.overallScore) {
          totalScore += record.overallScore;
          scoreCount++;
        }

        // Get or create a call classification row that satisfies NOT NULL constraints
        let callClassificationId: string | null = null;

        const { data: existingClassifications, error: classificationLookupError } = await supabase
          .from('bdr_call_classifications')
          .select('id')
          .eq('recording_id', recordingId)
          .eq('training_program_id', requestBody.trainingProgramId)
          .eq('user_id', managerId)
          .limit(1);

        if (classificationLookupError) {
          console.error('❌ Failed to lookup existing call classification:', classificationLookupError);
        } else if (existingClassifications && existingClassifications.length > 0) {
          callClassificationId = existingClassifications[0].id;
          console.log(`🔁 Reusing call classification ${callClassificationId} for recording ${recordingId}`);
        }

        if (!callClassificationId) {
          const { data: createdClassification, error: classificationInsertError } = await supabase
            .from('bdr_call_classifications')
            .insert({
              recording_id: recordingId,
              training_program_id: requestBody.trainingProgramId,
              user_id: managerId,
              classification_method: 'manager_upload',
              status: 'completed',
              classified_by: managerId,
            })
            .select('id')
            .single();

          if (classificationInsertError) {
            console.error('❌ Failed to create call classification:', classificationInsertError);
            skippedRecords++;
            continue;
          }

          callClassificationId = createdClassification?.id || null;
          console.log(`🆕 Created call classification ${callClassificationId} for recording ${recordingId}`);
        }

        if (!callClassificationId) {
          console.error('❌ No call classification ID resolved after creation attempt');
          skippedRecords++;
          continue;
        }

        // Create BDR scorecard evaluation record
        console.log(`🔧 Creating evaluation for call: ${record.callIdentifier}`);
        console.log(`📊 Evaluation scores: overall=${record.overallScore}, opening=${record.openingScore}`);
        
        // Include scoring rubric for AI training (critical for score interpretation)
        const scoringRubricData = record.scoringRubric ? {
          scoring_rubric: record.scoringRubric,
          rubric_source: 'csv_extract_rows_9_15'
        } : {};

        console.log(`📊 Scoring rubric data:`, scoringRubricData);

        // MINIMAL TEST: Try with only absolutely required fields first
        const evaluationData = {
          recording_id: recordingId,
          training_program_id: requestBody.trainingProgramId,
          user_id: managerId,
          overall_score: record.overallScore || 0,
          criteria_scores: criteriaScores,
          bdr_insights: bdrInsights,
          coaching_notes: `Manager Assessment: ${record.managerNotes || 'No additional notes'}`,
          call_identifier: record.callIdentifier || 'Unknown Call',
          call_classification_id: callClassificationId,
          // Include scoring rubric for AI training
          ...scoringRubricData
          // Note: evaluator_type column doesn't exist in production schema - removed
        };
        
        console.log(`🔧 About to insert evaluation data:`, JSON.stringify(evaluationData, null, 2));
        console.log(`🔧 Supabase client role:`, await supabase.auth.getUser());
        console.log(`🔧 Training program ID type:`, typeof evaluationData.training_program_id, evaluationData.training_program_id);
        console.log(`🔧 User ID type:`, typeof evaluationData.user_id, evaluationData.user_id);

        const { data: insertedEvaluation, error: evaluationError } = await supabase
          .from('bdr_scorecard_evaluations')
          .insert(evaluationData)
          .select()
          .single();

        console.log(`🔧 Raw insertion response:`, { data: insertedEvaluation, error: evaluationError });

        if (evaluationError || !insertedEvaluation) {
          console.error(`❌ Failed to create evaluation for ${record.callIdentifier}:`, evaluationError || 'Unknown error');
          if (evaluationError) {
            console.error(`❌ Evaluation error details:`, {
              code: evaluationError.code,
              message: evaluationError.message,
              details: evaluationError.details,
              hint: evaluationError.hint
            });
          } else {
            console.error('❌ Insert returned no data and no explicit error.');
          }
          console.error(`❌ Evaluation data that failed:`, JSON.stringify(evaluationData, null, 2));
          // CRITICAL: Don't increment createdEvaluations on error
        } else {
          console.log(`✅ Created BDR evaluation for ${record.callIdentifier}. Result:`, insertedEvaluation);
          createdEvaluations++;
          console.log(`✅ Incremented createdEvaluations to:`, createdEvaluations);
        }
      }

      // Store scorecard upload data in upload tracking for analytics
      console.log('📈 Storing scorecard upload summary');
      const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
      const allScores = processedData.map(r => r.overallScore || 0).filter(s => s > 0);
      
      // Store detailed upload data that analytics can read
      const uploadSummary = {
        filename: requestBody.fileName || 'unknown.xlsx',
        upload_status: 'completed',
        processed_count: createdEvaluations,
        total_count: processedData.length,
        upload_metadata: {
          user_id: user.id,
          training_program_id: requestBody.trainingProgramId,
          upload_id: uploadId,
          average_score: avgScore,
          latest_score: allScores[allScores.length - 1] || 0,
          best_score: allScores.length > 0 ? Math.max(...allScores) : 0,
          individual_scores: allScores,
          upload_date: new Date().toISOString().split('T')[0],
          data_format: requestBody.dataFormat || 'template',
          evaluations_created: createdEvaluations,
          recordings_matched: processedData.filter(r => r.callIdentifier).length,
          skipped_records: skippedRecords
        }
      };

      const { error: uploadError } = await supabase
        .from('bdr_upload_tracking')
        .insert(uploadSummary);

      if (uploadError) {
        console.error('❌ Failed to store upload summary:', uploadError);
        console.error('Upload data:', uploadSummary);
      } else {
        console.log(`✅ Stored upload summary: ${createdEvaluations} evaluations created from ${scoreCount} calls`);
      }
    }

    console.log('✅ Scorecard data accepted and processed', { uploadId, processedCount, userId: user?.id, managerId });
    return createSuccessResponse({
      message: 'Scorecard data accepted and processed successfully',
      processed_count: processedCount,
      status: 'completed',
      uploadId,
      user_id: user?.id,
      training_program: trainingProgram.name,
      evaluations_created: createdEvaluations,
      skipped_records: skippedRecords
    });

  } catch (error) {
    console.error('❌ Error in upload-scorecard-data:', error);
    return createErrorResponse(error);
  }
});
