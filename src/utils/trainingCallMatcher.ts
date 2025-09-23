/**
 * Training Call Matching Service
 * 
 * Handles matching uploaded training calls with Excel scorecard data
 * using title-based matching for reliable pairing of recordings and scorecards.
 */

import { supabase } from '@/integrations/supabase/client';
import { findBestRecordingMatch, TitleMatchRequest, TitleMatchResult } from './titleMatcher';

export interface TrainingCallMatch {
  callId: string;
  recordingId: string;
  scorecardEvaluationId?: string;
  matchConfidence: number;
  matchType: 'exact' | 'fuzzy' | 'manual';
  matchedFields: {
    identifier?: boolean;
    duration?: boolean;
    date?: boolean;
  };
}

export interface TrainingDatasetRecord {
  recordingId: string;
  callIdentifier: string;
  trainingProgramId?: string;
  transcription?: string;
  managerScores?: {
    opening: number;
    clearConfident: number;
    patternInterrupt: number;
    toneEnergy: number;
    closing: number;
    overall: number;
  };
  aiScores?: {
    opening: number;
    clearConfident: number;
    patternInterrupt: number;
    toneEnergy: number;
    closing: number;
    overall: number;
  };
  managerNotes?: string;
  trainingStatus: 'pending_match' | 'matched' | 'validated' | 'training_ready';
  createdAt: string;
  updatedAt: string;
}

/**
 * Registers a new training call upload with title-based matching
 */
export async function registerTrainingCall(
  recordingId: string,
  callIdentifier: string,
  trainingProgramId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the recording details to extract title for matching
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('title, user_id')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found');
    }

    // Store the training call metadata
    const { error } = await supabase
      .from('training_call_registry')
      .insert({
        recording_id: recordingId,
        call_identifier: callIdentifier,
        training_program_id: trainingProgramId,
        training_status: 'pending_match',
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    // Attempt automatic matching using both title-based and legacy methods
    await attemptTitleBasedMatching(recordingId, recording.title, recording.user_id);

    return { success: true };
  } catch (error) {
    console.error('Error registering training call:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to register training call' 
    };
  }
}

/**
 * Attempts title-based matching between recording and scorecard filenames
 */
export async function attemptTitleBasedMatching(
  recordingId: string,
  recordingTitle: string,
  userId?: string
): Promise<TrainingCallMatch[]> {
  try {
    console.log('🎯 Attempting title-based matching for recording:', {
      recordingId,
      recordingTitle,
      userId
    });

    // Look for scorecard evaluations where the filename (without extension) matches the recording title
    const { data: scorecards, error: scorecardError } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('*')
      .not('filename_without_extension', 'is', null);

    if (scorecardError) {
      console.error('❌ Error querying scorecards:', scorecardError);
      throw scorecardError;
    }

    const matches: TrainingCallMatch[] = [];

    if (scorecards && scorecards.length > 0) {
      for (const scorecard of scorecards) {
        // Normalize both titles for comparison
        const normalizedRecordingTitle = recordingTitle.toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedFilename = (scorecard.filename_without_extension || '').toLowerCase().trim().replace(/\s+/g, ' ');

        if (normalizedRecordingTitle === normalizedFilename) {
          const match: TrainingCallMatch = {
            callId: scorecard.call_identifier || scorecard.id,
            recordingId: recordingId,
            scorecardEvaluationId: scorecard.id,
            matchConfidence: 1.0, // Perfect title match
            matchType: 'exact',
            matchedFields: {
              identifier: true // Title match counts as identifier match
            }
          };

          // Store the match
          await supabase
            .from('training_call_matches')
            .insert({
              recording_id: recordingId,
              scorecard_evaluation_id: scorecard.id,
              match_confidence: match.matchConfidence,
              match_type: match.matchType,
              matched_fields: match.matchedFields,
              requires_review: false, // Title matches are highly reliable
              created_at: new Date().toISOString()
            });

          matches.push(match);

          console.log('✅ Found title-based match:', {
            recordingTitle,
            filename: scorecard.source_filename,
            filenameWithoutExt: scorecard.filename_without_extension,
            scorecardId: scorecard.id
          });
        }
      }
    }

    // If no title matches found, fall back to legacy identifier matching
    if (matches.length === 0) {
      console.log('🔍 No title matches found, falling back to legacy matching...');
      const legacyMatches = await attemptAutomaticMatching(recordingId, recordingTitle);
      matches.push(...legacyMatches);
    }

    // Update training status based on matches
    const newStatus = matches.length > 0 ? 'matched' : 'pending_match';
    await supabase
      .from('training_call_registry')
      .update({ training_status: newStatus, updated_at: new Date().toISOString() })
      .eq('recording_id', recordingId);

    console.log(`🎯 Title-based matching completed: ${matches.length} matches found`);
    return matches;

  } catch (error) {
    console.error('❌ Error in title-based matching:', error);
    return [];
  }
}

/**
 * Attempts to automatically match a training call with existing scorecard data
 */
export async function attemptAutomaticMatching(
  recordingId: string,
  callIdentifier: string
): Promise<TrainingCallMatch[]> {
  try {
    // Look for exact matches in scorecard evaluations
    const { data: exactMatches, error: exactError } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('*')
      .ilike('call_identifier', callIdentifier);

    if (exactError) throw exactError;

    const matches: TrainingCallMatch[] = [];

    // Process exact matches
    if (exactMatches && exactMatches.length > 0) {
      for (const scorecard of exactMatches) {
        const match: TrainingCallMatch = {
          callId: callIdentifier,
          recordingId: recordingId,
          scorecardEvaluationId: scorecard.id,
          matchConfidence: 1.0, // Perfect match
          matchType: 'exact',
          matchedFields: {
            identifier: true
          }
        };

        // Store the match
        await supabase
          .from('training_call_matches')
          .insert({
            recording_id: recordingId,
            scorecard_evaluation_id: scorecard.id,
            match_confidence: match.matchConfidence,
            match_type: match.matchType,
            matched_fields: match.matchedFields,
            created_at: new Date().toISOString()
          });

        matches.push(match);
      }
    }

    // If no exact matches, try fuzzy matching
    if (matches.length === 0) {
      const fuzzyMatches = await attemptFuzzyMatching(recordingId, callIdentifier);
      matches.push(...fuzzyMatches);
    }

    // Update training status based on matches
    const newStatus = matches.length > 0 ? 'matched' : 'pending_match';
    await supabase
      .from('training_call_registry')
      .update({ training_status: newStatus, updated_at: new Date().toISOString() })
      .eq('recording_id', recordingId);

    return matches;
  } catch (error) {
    console.error('Error in automatic matching:', error);
    return [];
  }
}

/**
 * Attempts fuzzy matching based on similar identifiers, dates, or durations
 */
export async function attemptFuzzyMatching(
  recordingId: string,
  callIdentifier: string
): Promise<TrainingCallMatch[]> {
  try {
    const matches: TrainingCallMatch[] = [];

    // Get the recording details for comparison
    const { data: recording } = await supabase
      .from('recordings')
      .select('duration, created_at, title')
      .eq('id', recordingId)
      .single();

    if (!recording) return matches;

    // Look for similar call identifiers (edit distance, partial matches)
    const { data: potentialMatches, error } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Get recent evaluations for comparison

    if (error || !potentialMatches) return matches;

    for (const scorecard of potentialMatches) {
      let matchScore = 0;
      const matchedFields: any = {};

      // Check identifier similarity
      const identifierSimilarity = calculateStringSimilarity(
        callIdentifier.toLowerCase(),
        (scorecard.call_identifier || '').toLowerCase()
      );
      
      if (identifierSimilarity > 0.7) {
        matchScore += 0.6;
        matchedFields.identifier = true;
      }

      // Check duration similarity (within 10% tolerance)
      if (recording.duration && scorecard.call_duration) {
        const durationDiff = Math.abs(recording.duration - scorecard.call_duration) / recording.duration;
        if (durationDiff < 0.1) {
          matchScore += 0.2;
          matchedFields.duration = true;
        }
      }

      // Check date proximity (same day or close)
      if (scorecard.call_date) {
        const recordingDate = new Date(recording.created_at);
        const scorecardDate = new Date(scorecard.call_date);
        const daysDiff = Math.abs(recordingDate.getTime() - scorecardDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 1) {
          matchScore += 0.2;
          matchedFields.date = true;
        }
      }

      // If match score is above threshold, consider it a potential match
      if (matchScore >= 0.6) {
        const match: TrainingCallMatch = {
          callId: callIdentifier,
          recordingId: recordingId,
          scorecardEvaluationId: scorecard.id,
          matchConfidence: matchScore,
          matchType: 'fuzzy',
          matchedFields
        };

        // Store the fuzzy match for manual review
        await supabase
          .from('training_call_matches')
          .insert({
            recording_id: recordingId,
            scorecard_evaluation_id: scorecard.id,
            match_confidence: match.matchConfidence,
            match_type: match.matchType,
            matched_fields: match.matchedFields,
            requires_review: true, // Fuzzy matches require manual review
            created_at: new Date().toISOString()
          });

        matches.push(match);
      }
    }

    return matches;
  } catch (error) {
    console.error('Error in fuzzy matching:', error);
    return [];
  }
}

/**
 * Creates a training dataset record from matched recording and scorecard data
 */
export async function createTrainingDataset(
  recordingId: string,
  scorecardEvaluationId: string
): Promise<{ success: boolean; datasetId?: string; error?: string }> {
  try {
    // Get recording data
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('transcript, ai_analysis, title, user_id')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found or no transcript available');
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
    const { data: dataset, error: datasetError } = await supabase
      .from('bdr_training_datasets')
      .insert({
        recording_id: recordingId,
        scorecard_evaluation_id: scorecardEvaluationId,
        call_transcript: recording.transcript,
        manager_scores: {
          opening: scorecard.opening_score,
          clearConfident: scorecard.clear_confident_score,
          patternInterrupt: scorecard.pattern_interrupt_score,
          toneEnergy: scorecard.tone_energy_score,
          closing: scorecard.closing_score,
          overall: scorecard.overall_score
        },
        manager_notes: scorecard.manager_notes,
        training_status: 'training_ready',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (datasetError) throw datasetError;

    return { success: true, datasetId: dataset.id };
  } catch (error) {
    console.error('Error creating training dataset:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create training dataset' 
    };
  }
}

/**
 * Gets pending training matches that require manual review
 */
export async function getPendingTrainingMatches(userId?: string): Promise<TrainingCallMatch[]> {
  try {
    const query = supabase
      .from('training_call_matches')
      .select(`
        *,
        recordings!inner(title, created_at, user_id),
        bdr_scorecard_evaluations!inner(call_identifier, overall_score, manager_notes)
      `)
      .eq('requires_review', true);

    // Filter by user if specified
    if (userId) {
      query.eq('recordings.user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching pending matches:', error);
    return [];
  }
}

/**
 * Calculates string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Create matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
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

  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return (maxLen - distance) / maxLen;
}

/**
 * Validates and approves a training match
 */
export async function approveTrainingMatch(
  matchId: string,
  approved: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (approved) {
      // Get match details
      const { data: match, error: matchError } = await supabase
        .from('training_call_matches')
        .select('recording_id, scorecard_evaluation_id')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        throw new Error('Match not found');
      }

      // Create training dataset
      const result = await createTrainingDataset(
        match.recording_id,
        match.scorecard_evaluation_id
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update match status
      await supabase
        .from('training_call_matches')
        .update({ 
          requires_review: false, 
          approved: true,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', matchId);
    } else {
      // Reject the match
      await supabase
        .from('training_call_matches')
        .update({ 
          requires_review: false, 
          approved: false,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', matchId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving training match:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to approve match' 
    };
  }
}