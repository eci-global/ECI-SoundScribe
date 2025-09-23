/**
 * Duration Backfill Utility
 * 
 * Processes existing recordings that don't have duration data
 * Downloads files from storage and extracts duration metadata
 */

import { supabase } from '@/integrations/supabase/client';
import { extractDurationFromUrl, DurationResult } from './mediaDuration';

export interface BackfillProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentFile?: string;
  isComplete: boolean;
  errors: string[];
}

export interface BackfillResult {
  success: boolean;
  progress: BackfillProgress;
  error?: string;
}

/**
 * Get all recordings that are missing duration data
 */
export async function getRecordingsWithoutDuration(): Promise<{ data: any[] | null; error: any }> {
  try {
    console.log('🔍 Finding recordings without duration data...');
    
    const { data, error } = await supabase
      .from('recordings')
      .select('id, title, file_url, file_type, created_at')
      .or('duration.is.null,duration.eq.0')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Failed to fetch recordings without duration:', error);
      return { data: null, error };
    }
    
    console.log(`📊 Found ${data?.length || 0} recordings without duration data`);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching recordings:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Extract duration for a single recording and update the database
 */
async function processRecordingDuration(recording: any): Promise<{ success: boolean; duration?: number; error?: string }> {
  try {
    console.log(`🎵 Processing duration for: ${recording.title} (${recording.id})`);
    
    if (!recording.file_url) {
      return {
        success: false,
        error: 'No file URL available'
      };
    }
    
    // Extract duration from the file URL
    const durationResult: DurationResult = await extractDurationFromUrl(
      recording.file_url, 
      recording.title || `recording-${recording.id}`
    );
    
    if (!durationResult.success || !durationResult.duration) {
      return {
        success: false,
        error: durationResult.error || 'Duration extraction failed'
      };
    }
    
    // Update the database with the extracted duration
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ duration: durationResult.duration })
      .eq('id', recording.id);
    
    if (updateError) {
      console.error(`❌ Failed to update duration for ${recording.id}:`, updateError);
      return {
        success: false,
        error: `Database update failed: ${updateError.message}`
      };
    }
    
    console.log(`✅ Updated duration for ${recording.title}: ${durationResult.duration} seconds`);
    return {
      success: true,
      duration: durationResult.duration
    };
  } catch (error) {
    console.error(`❌ Failed to process recording ${recording.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

/**
 * Backfill duration data for all recordings that are missing it
 * Returns a promise that resolves when complete, with progress callbacks
 */
export async function backfillAllDurations(
  onProgress?: (progress: BackfillProgress) => void
): Promise<BackfillResult> {
  try {
    console.log('🚀 Starting duration backfill process...');
    
    // Get recordings without duration
    const { data: recordings, error: fetchError } = await getRecordingsWithoutDuration();
    
    if (fetchError) {
      return {
        success: false,
        progress: {
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          isComplete: true,
          errors: [fetchError]
        },
        error: fetchError
      };
    }
    
    if (!recordings || recordings.length === 0) {
      console.log('✅ No recordings found that need duration backfill');
      const progress: BackfillProgress = {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        isComplete: true,
        errors: []
      };
      
      if (onProgress) onProgress(progress);
      return { success: true, progress };
    }
    
    // Initialize progress
    const progress: BackfillProgress = {
      total: recordings.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isComplete: false,
      errors: []
    };
    
    console.log(`📊 Processing ${recordings.length} recordings for duration backfill`);
    
    // Process each recording
    for (let i = 0; i < recordings.length; i++) {
      const recording = recordings[i];
      progress.currentFile = recording.title || `Recording ${i + 1}`;
      progress.processed = i;
      
      if (onProgress) onProgress({ ...progress });
      
      const result = await processRecordingDuration(recording);
      
      if (result.success) {
        progress.successful++;
      } else {
        progress.failed++;
        progress.errors.push(`${recording.title || recording.id}: ${result.error}`);
      }
      
      // Small delay to prevent overwhelming the system
      if (i < recordings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    
    // Final progress update
    progress.processed = recordings.length;
    progress.isComplete = true;
    progress.currentFile = undefined;
    
    if (onProgress) onProgress({ ...progress });
    
    console.log(`✅ Duration backfill complete: ${progress.successful}/${progress.total} successful`);
    
    if (progress.errors.length > 0) {
      console.warn('⚠️ Some recordings failed to process:', progress.errors);
    }
    
    return {
      success: true,
      progress
    };
  } catch (error) {
    console.error('❌ Duration backfill process failed:', error);
    return {
      success: false,
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        isComplete: true,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Backfill duration for a specific recording by ID
 */
export async function backfillRecordingDuration(recordingId: string): Promise<{ success: boolean; duration?: number; error?: string }> {
  try {
    console.log(`🎯 Backfilling duration for recording: ${recordingId}`);
    
    // Get the recording
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, title, file_url, file_type')
      .eq('id', recordingId)
      .single();
    
    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch recording: ${fetchError.message}`
      };
    }
    
    if (!recording) {
      return {
        success: false,
        error: 'Recording not found'
      };
    }
    
    return await processRecordingDuration(recording);
  } catch (error) {
    console.error(`❌ Failed to backfill duration for ${recordingId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get statistics about duration data coverage
 */
export async function getDurationStatistics(): Promise<{
  total: number;
  withDuration: number;
  withoutDuration: number;
  percentage: number;
}> {
  try {
    // Get total count
    const { count: total, error: totalError } = await supabase
      .from('recordings')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('Failed to get total count:', totalError);
      return { total: 0, withDuration: 0, withoutDuration: 0, percentage: 0 };
    }
    
    // Get count without duration
    const { count: withoutDuration, error: withoutError } = await supabase
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .or('duration.is.null,duration.eq.0');
    
    if (withoutError) {
      console.error('Failed to get without duration count:', withoutError);
      return { total: total || 0, withDuration: 0, withoutDuration: 0, percentage: 0 };
    }
    
    const totalRecordings = total || 0;
    const missingDuration = withoutDuration || 0;
    const hasDuration = totalRecordings - missingDuration;
    const percentage = totalRecordings > 0 ? (hasDuration / totalRecordings) * 100 : 0;
    
    return {
      total: totalRecordings,
      withDuration: hasDuration,
      withoutDuration: missingDuration,
      percentage: Math.round(percentage * 100) / 100
    };
  } catch (error) {
    console.error('Failed to get duration statistics:', error);
    return { total: 0, withDuration: 0, withoutDuration: 0, percentage: 0 };
  }
}