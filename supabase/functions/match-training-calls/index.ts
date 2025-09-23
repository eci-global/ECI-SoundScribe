/**
 * Match Training Calls Edge Function
 * 
 * Handles automatic matching of uploaded training calls with existing scorecard data.
 * Implements both exact and fuzzy matching algorithms.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Inline CORS utilities to avoid shared import issues during deployment
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

interface MatchRequest {
  recording_id: string;
  call_identifier: string;
  training_program_id?: string;
  transcript?: string;
  user_id: string;
}

interface TrainingMatch {
  scorecard_evaluation_id: string;
  match_confidence: number;
  match_type: 'exact' | 'fuzzy';
  matched_fields: {
    identifier?: boolean;
    duration?: boolean;
    date?: boolean;
  };
}

interface MatchResponse {
  success: boolean;
  matches: TrainingMatch[];
  registry_id: string;
  message: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { 
      recording_id, 
      call_identifier, 
      training_program_id, 
      transcript, 
      user_id 
    }: MatchRequest = await req.json();

    console.log('🎓 Starting training call matching for:', {
      recording_id,
      call_identifier,
      training_program_id,
      user_id
    });

    // Step 1: Register the training call
    const { data: registryData, error: registryError } = await supabase
      .from('training_call_registry')
      .insert({
        recording_id,
        call_identifier,
        training_program_id,
        user_id,
        training_status: 'pending_match'
      })
      .select()
      .single();

    if (registryError) {
      console.error('❌ Failed to register training call:', registryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to register training call',
          matches: []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Training call registered:', registryData.id);

    // Step 2: Get recording details for title-based matching
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('title, user_id')
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      console.error('❌ Failed to get recording details:', recordingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Recording not found',
          matches: []
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 3: Attempt title-based matching first
    const titleMatches = await findTitleBasedMatches(supabase, recording.title);
    let allMatches: TrainingMatch[] = titleMatches;

    // Step 4: If no title matches, try exact identifier matching
    if (titleMatches.length === 0) {
      console.log('🔍 No title matches found, attempting exact identifier matching...');
      const exactMatches = await findExactMatches(supabase, call_identifier);
      allMatches = [...allMatches, ...exactMatches];
    }

    // Step 5: If still no matches, try fuzzy matching as last resort
    if (allMatches.length === 0) {
      console.log('🔍 No exact matches found, attempting fuzzy matching...');
      const fuzzyMatches = await findFuzzyMatches(
        supabase, 
        recording_id, 
        call_identifier
      );
      allMatches = [...allMatches, ...fuzzyMatches];
    }

    // Step 4: Store matches in database
    for (const match of allMatches) {
      const { error: matchError } = await supabase
        .from('training_call_matches')
        .insert({
          recording_id,
          scorecard_evaluation_id: match.scorecard_evaluation_id,
          match_confidence: match.match_confidence,
          match_type: match.match_type,
          matched_fields: match.matched_fields,
          requires_review: match.match_type === 'fuzzy' || match.match_confidence < 1.0
        });

      if (matchError) {
        console.warn('⚠️ Failed to store match:', matchError);
      }
    }

    // Step 5: Update training status based on results
    const newStatus = allMatches.length > 0 ? 'matched' : 'pending_match';
    await supabase
      .from('training_call_registry')
      .update({ 
        training_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', registryData.id);

    // Step 6: For high-confidence exact matches, automatically create training datasets
    for (const match of allMatches) {
      if (match.match_type === 'exact' && match.match_confidence === 1.0) {
        try {
          await createTrainingDataset(supabase, recording_id, match.scorecard_evaluation_id);
          console.log('✅ Automatically created training dataset for exact match');
        } catch (datasetError) {
          console.warn('⚠️ Failed to auto-create training dataset:', datasetError);
        }
      }
    }

    const response: MatchResponse = {
      success: true,
      matches: allMatches,
      registry_id: registryData.id,
      message: allMatches.length > 0 
        ? `Found ${allMatches.length} potential matches` 
        : 'No matches found, waiting for scorecard data'
    };

    console.log('🎯 Training call matching completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Training call matching failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        matches: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Find matches based on title comparison (primary method)
 */
async function findTitleBasedMatches(
  supabase: any,
  recordingTitle: string
): Promise<TrainingMatch[]> {
  try {
    console.log('🎯 Attempting title-based matching for:', recordingTitle);

    // Normalize the recording title
    const normalizedTitle = recordingTitle.toLowerCase().trim().replace(/\s+/g, ' ');

    // Look for scorecard evaluations where the filename (without extension) matches the recording title
    const { data: scorecards, error } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('id, call_identifier, source_filename, filename_without_extension, overall_score')
      .not('filename_without_extension', 'is', null);

    if (error) throw error;

    const matches: TrainingMatch[] = [];

    for (const scorecard of scorecards || []) {
      // Normalize the filename without extension
      const normalizedFilename = (scorecard.filename_without_extension || '').toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Check for exact title match
      if (normalizedTitle === normalizedFilename) {
        matches.push({
          scorecard_evaluation_id: scorecard.id,
          match_confidence: 1.0,
          match_type: 'exact',
          matched_fields: { identifier: true } // Title match counts as identifier
        });

        console.log('✅ Found title-based match:', {
          recordingTitle,
          filename: scorecard.source_filename,
          filenameWithoutExt: scorecard.filename_without_extension,
          scorecard_id: scorecard.id
        });
      }
    }

    console.log(`🎯 Title-based matching found ${matches.length} matches`);
    return matches;
  } catch (error) {
    console.error('❌ Error in title-based matching:', error);
    return [];
  }
}

/**
 * Find exact matches based on call identifier
 */
async function findExactMatches(
  supabase: any, 
  callIdentifier: string
): Promise<TrainingMatch[]> {
  try {
    const { data: exactMatches, error } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('id, call_identifier, overall_score')
      .ilike('call_identifier', callIdentifier);

    if (error) throw error;

    const matches: TrainingMatch[] = [];

    for (const scorecard of exactMatches || []) {
      // Check for exact identifier match (case-insensitive)
      if (scorecard.call_identifier?.toLowerCase().trim() === callIdentifier.toLowerCase().trim()) {
        matches.push({
          scorecard_evaluation_id: scorecard.id,
          match_confidence: 1.0,
          match_type: 'exact',
          matched_fields: { identifier: true }
        });

        console.log('✅ Found exact match:', {
          scorecard_id: scorecard.id,
          identifier: scorecard.call_identifier
        });
      }
    }

    return matches;
  } catch (error) {
    console.error('❌ Error in exact matching:', error);
    return [];
  }
}

/**
 * Find fuzzy matches based on similarity algorithms
 */
async function findFuzzyMatches(
  supabase: any,
  recordingId: string,
  callIdentifier: string
): Promise<TrainingMatch[]> {
  try {
    // Get the recording details for comparison
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('duration, created_at, title')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      console.warn('⚠️ Could not retrieve recording for fuzzy matching');
      return [];
    }

    // Get recent scorecard evaluations for comparison
    const { data: potentialMatches, error: scorecardError } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('id, call_identifier, call_date, call_duration, overall_score')
      .order('created_at', { ascending: false })
      .limit(100); // Check last 100 evaluations

    if (scorecardError || !potentialMatches) {
      console.warn('⚠️ Could not retrieve scorecard evaluations for fuzzy matching');
      return [];
    }

    const fuzzyMatches: TrainingMatch[] = [];

    for (const scorecard of potentialMatches) {
      let matchScore = 0;
      const matchedFields: any = {};

      // 1. Identifier similarity (using Levenshtein distance)
      const identifierSimilarity = calculateStringSimilarity(
        callIdentifier.toLowerCase().trim(),
        (scorecard.call_identifier || '').toLowerCase().trim()
      );

      if (identifierSimilarity > 0.7) {
        matchScore += 0.6; // 60% weight for identifier similarity
        matchedFields.identifier = true;
      }

      // 2. Duration similarity (within 15% tolerance)
      if (recording.duration && scorecard.call_duration) {
        const durationDiff = Math.abs(recording.duration - scorecard.call_duration) / Math.max(recording.duration, scorecard.call_duration);
        if (durationDiff <= 0.15) {
          matchScore += 0.2; // 20% weight for duration match
          matchedFields.duration = true;
        }
      }

      // 3. Date proximity (within 2 days)
      if (scorecard.call_date) {
        try {
          const recordingDate = new Date(recording.created_at);
          const scorecardDate = new Date(scorecard.call_date);
          const daysDiff = Math.abs(recordingDate.getTime() - scorecardDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 2) {
            matchScore += 0.2; // 20% weight for date proximity
            matchedFields.date = true;
          }
        } catch (dateError) {
          // Invalid date format, skip date matching
        }
      }

      // If match score meets threshold, consider it a fuzzy match
      if (matchScore >= 0.6) {
        fuzzyMatches.push({
          scorecard_evaluation_id: scorecard.id,
          match_confidence: Number(matchScore.toFixed(2)),
          match_type: 'fuzzy',
          matched_fields
        });

        console.log('🔍 Found fuzzy match:', {
          scorecard_id: scorecard.id,
          confidence: matchScore.toFixed(2),
          matched_fields
        });
      }
    }

    return fuzzyMatches;
  } catch (error) {
    console.error('❌ Error in fuzzy matching:', error);
    return [];
  }
}

/**
 * Create a training dataset from matched recording and scorecard
 */
async function createTrainingDataset(
  supabase: any,
  recordingId: string,
  scorecardEvaluationId: string
): Promise<void> {
  // Get recording data
  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('transcript, ai_analysis')
    .eq('id', recordingId)
    .single();

  if (recordingError || !recording?.transcript) {
    throw new Error('Recording transcript not available');
  }

  // Get scorecard evaluation data
  const { data: scorecard, error: scorecardError } = await supabase
    .from('bdr_scorecard_evaluations')
    .select('*')
    .eq('id', scorecardEvaluationId)
    .single();

  if (scorecardError || !scorecard) {
    throw new Error('Scorecard evaluation not found');
  }

  // Create training dataset record
  const { error: datasetError } = await supabase
    .from('bdr_training_datasets')
    .insert({
      recording_id: recordingId,
      scorecard_evaluation_id: scorecardEvaluationId,
      call_transcript: recording.transcript,
      manager_scores: {
        opening: scorecard.opening_score || null,
        objectionHandling: scorecard.objection_handling_score || null,
        qualification: scorecard.qualification_score || null,
        toneEnergy: scorecard.tone_energy_score || null,
        assertivenessControl: scorecard.assertiveness_control_score || null,
        businessAcumen: scorecard.business_acumen_score || null,
        closing: scorecard.closing_score || null,
        talkTime: scorecard.talk_time_score || null,
        overall: scorecard.overall_score || null,
        // Legacy compatibility fields
        clearConfident: scorecard.clear_confident_score || null,
        patternInterrupt: scorecard.pattern_interrupt_score || null
      },
      manager_notes: scorecard.manager_notes,
      training_status: 'training_ready'
    });

  if (datasetError) {
    throw datasetError;
  }

  console.log('✅ Training dataset created successfully');
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix using dynamic programming
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const maxLength = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return (maxLength - distance) / maxLength;
}