/**
 * BDR Training Integration Utilities
 * 
 * Connects the new BDR training analytics system with existing recording 
 * and coaching systems for seamless data flow and integration.
 */

import { supabase } from '@/integrations/supabase/client';
import { Recording } from '@/types/recording';
import { BDRTrainingProgram } from '@/types/bdr-training';

/**
 * Extract BDR coaching scores from existing AI analysis
 */
export function extractBDRScoresFromRecording(recording: Recording): {
  opening: number;
  clearConfident: number;
  patternInterrupt: number;
  toneEnergy: number;
  closing: number;
  overall: number;
} | null {
  // Check if recording has AI analysis with coaching insights
  if (!recording.ai_analysis || !recording.ai_summary) {
    return null;
  }

  try {
    // Try to parse existing coaching data from AI analysis
    const analysis = typeof recording.ai_analysis === 'string' 
      ? JSON.parse(recording.ai_analysis) 
      : recording.ai_analysis;

    // Look for BDR-specific coaching scores in analysis
    if (analysis.coaching_scores) {
      return {
        opening: analysis.coaching_scores.opening || 0,
        clearConfident: analysis.coaching_scores.clarity || analysis.coaching_scores.confidence || 0,
        patternInterrupt: analysis.coaching_scores.pattern_interrupt || analysis.coaching_scores.engagement || 0,
        toneEnergy: analysis.coaching_scores.tone || analysis.coaching_scores.energy || 0,
        closing: analysis.coaching_scores.closing || analysis.coaching_scores.call_to_action || 0,
        overall: analysis.coaching_scores.overall || 0
      };
    }

    // Fallback: estimate scores from AI summary keywords
    return estimateBDRScoresFromSummary(recording.ai_summary);
  } catch (error) {
    console.error('Error extracting BDR scores from recording:', error);
    return estimateBDRScoresFromSummary(recording.ai_summary);
  }
}

/**
 * Estimate BDR scores from AI summary text using keyword analysis
 */
function estimateBDRScoresFromSummary(summary: string): {
  opening: number;
  clearConfident: number;
  patternInterrupt: number;
  toneEnergy: number;
  closing: number;
  overall: number;
} {
  const lowerSummary = summary.toLowerCase();

  // Score opening based on greeting and introduction keywords
  const openingKeywords = ['greeting', 'introduction', 'hello', 'good morning', 'professional', 'clear purpose'];
  const openingScore = Math.min(10, Math.max(0, 
    openingKeywords.reduce((score, keyword) => 
      score + (lowerSummary.includes(keyword) ? 2 : 0), 4)
  ));

  // Score clarity and confidence
  const clarityKeywords = ['clear', 'confident', 'articulate', 'well-spoken', 'professional', 'concise'];
  const clarityScore = Math.min(10, Math.max(0,
    clarityKeywords.reduce((score, keyword) => 
      score + (lowerSummary.includes(keyword) ? 1.5 : 0), 3)
  ));

  // Score pattern interrupt (engagement techniques)
  const patternKeywords = ['engaging', 'attention', 'interrupt', 'pivot', 'redirect', 'focus'];
  const patternScore = Math.min(10, Math.max(0,
    patternKeywords.reduce((score, keyword) => 
      score + (lowerSummary.includes(keyword) ? 2 : 0), 2)
  ));

  // Score tone and energy
  const toneKeywords = ['enthusiastic', 'energy', 'positive', 'upbeat', 'passionate', 'engaging'];
  const toneScore = Math.min(10, Math.max(0,
    toneKeywords.reduce((score, keyword) => 
      score + (lowerSummary.includes(keyword) ? 1.5 : 0), 4)
  ));

  // Score closing
  const closingKeywords = ['next steps', 'follow up', 'action', 'close', 'commitment', 'agreement'];
  const closingScore = Math.min(10, Math.max(0,
    closingKeywords.reduce((score, keyword) => 
      score + (lowerSummary.includes(keyword) ? 2 : 0), 3)
  ));

  const overall = (openingScore + clarityScore + patternScore + toneScore + closingScore) / 5;

  return {
    opening: Math.round(openingScore * 10) / 10,
    clearConfident: Math.round(clarityScore * 10) / 10,
    patternInterrupt: Math.round(patternScore * 10) / 10,
    toneEnergy: Math.round(toneScore * 10) / 10,
    closing: Math.round(closingScore * 10) / 10,
    overall: Math.round(overall * 10) / 10
  };
}

/**
 * Automatically create BDR scorecard evaluation from existing recording
 */
export async function createBDREvaluationFromRecording(
  recording: Recording,
  trainingProgramId: string,
  userId: string
): Promise<{ success: boolean; evaluationId?: string; error?: string }> {
  try {
    // Extract BDR scores
    const scores = extractBDRScoresFromRecording(recording);
    if (!scores) {
      return { success: false, error: 'Could not extract BDR scores from recording' };
    }

    // Create scorecard evaluation
    const { data, error } = await supabase
      .from('bdr_scorecard_evaluations')
      .insert({
        user_id: userId,
        recording_id: recording.id,
        training_program_id: trainingProgramId,
        evaluator_type: 'ai_automated',
        criteria_scores: {
          opening: scores.opening,
          clear_confident: scores.clearConfident,
          pattern_interrupt: scores.patternInterrupt,
          tone_energy: scores.toneEnergy,
          closing: scores.closing
        },
        overall_score: scores.overall,
        feedback: generateFeedbackFromScores(scores),
        evaluation_source: 'ai_analysis_integration',
        confidence_level: 0.75, // Medium confidence for AI-extracted scores
        evaluated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating BDR evaluation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, evaluationId: data.id };
  } catch (error) {
    console.error('Error in createBDREvaluationFromRecording:', error);
    return { success: false, error: 'Unexpected error creating BDR evaluation' };
  }
}

/**
 * Generate feedback text from BDR scores
 */
function generateFeedbackFromScores(scores: {
  opening: number;
  clearConfident: number;
  patternInterrupt: number;
  toneEnergy: number;
  closing: number;
  overall: number;
}): string {
  const feedback: string[] = [];

  // Overall assessment
  if (scores.overall >= 8) {
    feedback.push('Excellent overall performance! You demonstrated strong BDR skills across all areas.');
  } else if (scores.overall >= 6) {
    feedback.push('Good performance with room for improvement in specific areas.');
  } else {
    feedback.push('Focus needed on fundamental BDR techniques to improve overall effectiveness.');
  }

  // Specific feedback for each criteria
  if (scores.opening < 6) {
    feedback.push('Work on your opening - ensure clear introduction and purpose statement.');
  }
  if (scores.clearConfident < 6) {
    feedback.push('Focus on speaking more clearly and confidently to build credibility.');
  }
  if (scores.patternInterrupt < 6) {
    feedback.push('Practice pattern interrupt techniques to better capture and maintain attention.');
  }
  if (scores.toneEnergy < 6) {
    feedback.push('Increase your energy and enthusiasm to create more engaging conversations.');
  }
  if (scores.closing < 6) {
    feedback.push('Strengthen your closing with clear next steps and calls to action.');
  }

  // Highlight strengths
  const strengths = Object.entries(scores)
    .filter(([key, value]) => key !== 'overall' && value >= 8)
    .map(([key]) => {
      const labels = {
        opening: 'Opening & Introduction',
        clearConfident: 'Clear & Confident Delivery', 
        patternInterrupt: 'Pattern Interrupt',
        toneEnergy: 'Tone & Energy',
        closing: 'Closing & Next Steps'
      };
      return labels[key as keyof typeof labels];
    });

  if (strengths.length > 0) {
    feedback.push(`Strong performance in: ${strengths.join(', ')}.`);
  }

  return feedback.join(' ');
}

/**
 * Sync existing recordings to BDR training programs
 */
export async function syncRecordingsToBDRProgram(
  recordings: Recording[],
  trainingProgramId: string
): Promise<{ 
  success: boolean; 
  processed: number; 
  created: number; 
  errors: string[] 
}> {
  const results = {
    success: true,
    processed: 0,
    created: 0,
    errors: [] as string[]
  };

  for (const recording of recordings) {
    try {
      results.processed++;

      // Check if evaluation already exists
      const { data: existing } = await supabase
        .from('bdr_scorecard_evaluations')
        .select('id')
        .eq('recording_id', recording.id)
        .eq('training_program_id', trainingProgramId)
        .single();

      if (existing) {
        continue; // Skip if already exists
      }

      // Create evaluation
      const result = await createBDREvaluationFromRecording(
        recording,
        trainingProgramId,
        recording.user_id
      );

      if (result.success) {
        results.created++;
      } else {
        results.errors.push(`Recording ${recording.id}: ${result.error}`);
      }
    } catch (error) {
      results.errors.push(`Recording ${recording.id}: ${error}`);
    }
  }

  return results;
}

/**
 * Get BDR training programs that a user participates in
 */
export async function getUserBDRPrograms(userId: string): Promise<BDRTrainingProgram[]> {
  try {
    const { data: progressData, error } = await supabase
      .from('bdr_training_progress')
      .select(`
        bdr_training_programs(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return progressData?.map(p => p.bdr_training_programs).filter(Boolean) || [];
  } catch (error) {
    console.error('Error getting user BDR programs:', error);
    return [];
  }
}

/**
 * Create BDR training progress for a user in a program
 */
export async function enrollUserInBDRProgram(
  userId: string,
  trainingProgramId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('bdr_training_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('training_program_id', trainingProgramId)
      .single();

    if (existing) {
      return { success: true }; // Already enrolled
    }

    // Create progress record
    const { error } = await supabase
      .from('bdr_training_progress')
      .insert({
        user_id: userId,
        training_program_id: trainingProgramId,
        status: 'in_progress',
        current_score: 0,
        completion_percentage: 0,
        calls_completed: 0,
        started_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error enrolling user in BDR program:', error);
    return { success: false, error: (error as Error).message };
  }
}