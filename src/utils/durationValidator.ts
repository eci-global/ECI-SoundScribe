/**
 * Duration Validation and Correction Utility
 * 
 * Ensures recording durations match actual media file durations
 * Detects and corrects common issues like the 9-second bug
 */

import { extractMediaDuration, extractDurationFromUrl, formatDuration } from './mediaDuration';
import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/recording';

export interface DurationValidationResult {
  recording_id: string;
  current_duration: number | null;
  actual_duration: number | null;
  mismatch: boolean;
  error?: string;
  corrected: boolean;
}

/**
 * Validate a single recording's duration against its actual media file
 */
export async function validateRecordingDuration(recording: Recording): Promise<DurationValidationResult> {
  console.log(`🔍 Validating duration for recording: ${recording.id}`);
  
  const result: DurationValidationResult = {
    recording_id: recording.id,
    current_duration: recording.duration,
    actual_duration: null,
    mismatch: false,
    corrected: false
  };

  try {
    // Skip validation if no file URL
    if (!recording.file_url) {
      result.error = 'No file URL available';
      return result;
    }

    // Extract actual duration from the media file
    console.log(`📊 Extracting actual duration from: ${recording.file_url}`);
    const durationResult = await extractDurationFromUrl(recording.file_url, recording.title || 'recording');
    
    if (!durationResult.success || !durationResult.duration) {
      result.error = `Failed to extract actual duration: ${durationResult.error}`;
      return result;
    }

    result.actual_duration = durationResult.duration;
    
    // Check for mismatch
    const currentDuration = recording.duration;
    const actualDuration = durationResult.duration;
    
    // Consider a mismatch if:
    // 1. Current duration is null/missing
    // 2. Difference is more than 5 seconds (accounting for rounding)
    // 3. Current duration is exactly 9 (the known bug)
    const tolerance = 5;
    result.mismatch = !currentDuration || 
                     Math.abs(currentDuration - actualDuration) > tolerance ||
                     currentDuration === 9;

    if (result.mismatch) {
      console.warn(`⚠️ Duration mismatch detected:`, {
        recordingId: recording.id,
        currentDuration,
        actualDuration,
        difference: currentDuration ? Math.abs(currentDuration - actualDuration) : 'N/A'
      });
    } else {
      console.log(`✅ Duration validation passed: ${currentDuration}s vs ${actualDuration}s`);
    }

    return result;
  } catch (error) {
    console.error('❌ Duration validation error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown validation error';
    return result;
  }
}

/**
 * Correct a recording's duration in the database
 */
export async function correctRecordingDuration(recordingId: string, actualDuration: number): Promise<boolean> {
  try {
    console.log(`🔧 Correcting duration for recording ${recordingId}: ${actualDuration}s`);
    
    const { error } = await supabase
      .from('recordings')
      .update({ 
        duration: actualDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (error) {
      console.error('❌ Failed to update recording duration:', error);
      return false;
    }

    console.log(`✅ Successfully corrected duration for recording ${recordingId}`);
    return true;
  } catch (error) {
    console.error('❌ Duration correction error:', error);
    return false;
  }
}

/**
 * Batch validate and correct multiple recordings
 */
export async function batchValidateAndCorrect(recordings: Recording[]): Promise<DurationValidationResult[]> {
  console.log(`🔍 Batch validating ${recordings.length} recordings`);
  
  const results: DurationValidationResult[] = [];
  
  for (const recording of recordings) {
    try {
      const result = await validateRecordingDuration(recording);
      
      // Attempt correction if mismatch detected and we have actual duration
      if (result.mismatch && result.actual_duration) {
        const corrected = await correctRecordingDuration(recording.id, result.actual_duration);
        result.corrected = corrected;
      }
      
      results.push(result);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Validation failed for recording ${recording.id}:`, error);
      results.push({
        recording_id: recording.id,
        current_duration: recording.duration,
        actual_duration: null,
        mismatch: false,
        corrected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const mismatches = results.filter(r => r.mismatch).length;
  const corrected = results.filter(r => r.corrected).length;
  
  console.log(`📊 Batch validation complete: ${mismatches} mismatches found, ${corrected} corrected`);
  
  return results;
}

/**
 * Find recordings with suspicious durations that need validation
 */
export async function findSuspiciousRecordings(): Promise<Recording[]> {
  try {
    console.log('🔍 Finding recordings with suspicious durations...');
    
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('*')
      .or('duration.is.null,duration.eq.9,duration.lt.10')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Failed to fetch suspicious recordings:', error);
      return [];
    }

    console.log(`🔍 Found ${recordings?.length || 0} recordings with suspicious durations`);
    return (recordings || []).map(r => ({
      ...r,
      file_type: (r.file_type as 'audio' | 'video') || 'audio',
      status: (r.status as 'uploading' | 'processing' | 'completed' | 'failed') || 'completed',
      coaching_evaluation: r.coaching_evaluation ? 
        (typeof r.coaching_evaluation === 'string' ? JSON.parse(r.coaching_evaluation) : r.coaching_evaluation) : 
        undefined
    })) as unknown as Recording[];
  } catch (error) {
    console.error('❌ Error finding suspicious recordings:', error);
    return [];
  }
}

/**
 * Real-time duration validation for uploaded files
 */
export async function validateUploadedFile(file: File, recordingId?: string): Promise<number | null> {
  try {
    console.log(`📊 Validating uploaded file duration: ${file.name}`);
    
    const result = await extractMediaDuration(file);
    
    if (!result.success || !result.duration) {
      console.warn(`⚠️ Could not extract duration from uploaded file: ${result.error}`);
      return null;
    }
    
    // If we have a recording ID, update it immediately
    if (recordingId && result.duration) {
      console.log(`🔧 Auto-correcting duration for recording ${recordingId}: ${result.duration}s`);
      await correctRecordingDuration(recordingId, result.duration);
    }
    
    console.log(`✅ Uploaded file duration validated: ${result.duration}s`);
    return result.duration;
  } catch (error) {
    console.error('❌ Upload validation error:', error);
    return null;
  }
}

/**
 * Check if a duration value is likely incorrect
 */
export function isDurationSuspicious(duration: number | null): boolean {
  if (duration === null || duration === undefined) return true;
  if (duration === 9) return true; // Known bug value
  if (duration < 5) return true; // Unrealistically short
  if (duration > 86400) return true; // Longer than 24 hours
  return false;
}

/**
 * Generate a duration validation report
 */
export function generateValidationReport(results: DurationValidationResult[]): string {
  const total = results.length;
  const mismatches = results.filter(r => r.mismatch).length;
  const corrected = results.filter(r => r.corrected).length;
  const errors = results.filter(r => r.error).length;
  
  const report = `
📊 Duration Validation Report
=====================================
Total Recordings: ${total}
Mismatches Found: ${mismatches}
Successfully Corrected: ${corrected}
Errors: ${errors}

Accuracy Rate: ${((total - mismatches) / total * 100).toFixed(1)}%
Correction Rate: ${corrected > 0 ? ((corrected / mismatches) * 100).toFixed(1) : 0}%
`;

  return report;
}