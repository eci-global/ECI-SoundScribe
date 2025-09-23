// Minimal BDR Scorecard Evaluation Test Function
// Used to verify deployment works before adding full complexity

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

function handleCORSPreflight(): Response {
  return new Response(null, { 
    headers: corsHeaders,
    status: 200
  });
}

function createSuccessResponse(data: any, status: number = 200): Response {
  const responseBody = {
    success: true,
    ...data
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

function createErrorResponse(
  error: string | Error,
  status: number = 500,
  additionalData?: Record<string, any>
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const responseBody = {
    success: false,
    error: errorMessage,
    ...additionalData
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    // Parse request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    const recordingId = requestBody?.recordingId;
    const programId = requestBody?.trainingProgramId;
    const forceReprocess = requestBody?.forceReprocess || false;
    
    if (!recordingId || !programId) {
      return createErrorResponse('Missing required parameters: recordingId and trainingProgramId', 400);
    }

    console.log(`🎯 BDR evaluation test for recording ${recordingId} with program ${programId}`);

    // Return mock successful evaluation
    const mockEvaluation = {
      evaluation: {
        id: 'test-eval-' + Date.now(),
        recording_id: recordingId,
        training_program_id: programId,
        overall_score: 75.5,
        criteria_scores: {
          opening_and_introduction: { score: 8, maxScore: 10, weight: 15 },
          qualifying_questions: { score: 7, maxScore: 10, weight: 25 },
          pain_point_identification: { score: 8, maxScore: 10, weight: 20 },
          value_articulation: { score: 7, maxScore: 10, weight: 20 },
          objection_handling: { score: 8, maxScore: 10, weight: 15 },
          closing_and_next_steps: { score: 6, maxScore: 10, weight: 5 }
        },
        bdr_insights: {
          keyStrengths: ['Good opening technique', 'Effective pain point identification'],
          improvementAreas: ['Closing could be stronger', 'Value articulation needs work'],
          coachingPriorities: ['Focus on closing techniques', 'Practice value propositions'],
          competencyLevel: 'developing'
        }
      },
      processingTimeMs: 1500,
      isExisting: false
    };

    return createSuccessResponse(mockEvaluation);

  } catch (error) {
    console.error('❌ BDR evaluation test failed:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'BDR evaluation test failed',
      500
    );
  }
});