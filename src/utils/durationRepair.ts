/**
 * Duration Repair Utility
 * 
 * Repairs recordings that have the 9-second duration bug by re-extracting duration
 * from the stored file or estimating from transcript/segment data
 */

import { supabase } from '@/integrations/supabase/client';
import { extractDurationFromUrl, isValidDuration, validateAndRecoverDuration } from './mediaDuration';

export interface DurationRepairResult {
  recordingId: string;
  oldDuration: number | null;
  newDuration: number | null;
  method: string;
  success: boolean;
  error?: string;
}

export interface DurationRepairStats {
  totalChecked: number;
  totalFixed: number;
  totalFailed: number;
  results: DurationRepairResult[];
}

/**
 * Identify recordings with suspicious durations (9-second bug and other issues)
 */
export async function identifySuspiciousRecordings(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('id, title, duration, file_url, transcript, ai_insights, created_at, file_size')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Use enhanced detection logic instead of simple database filter
    const suspicious = (data || []).filter(recording => {
      const isValid = isValidDuration(recording.duration);
      
      // CRITICAL: Specifically target the compression truncation issue
      if (recording.duration === 10 || recording.duration === 11) {
        console.log(`🚨 Found compression truncation victim: ${recording.title} (${recording.duration}s)`);
        return true;
      }
      
      // Also check for file size mismatches if available
      if (isValid && recording.file_size && recording.duration) {
        const estimatedDuration = recording.file_size / (128 * 1024 / 8); // Rough estimate
        const ratio = Math.abs(recording.duration - estimatedDuration) / estimatedDuration;
        if (ratio > 2) { // Duration differs by more than 200%
          console.log(`📊 File size mismatch detected: ${recording.title} (${recording.duration}s vs estimated ${estimatedDuration.toFixed(1)}s)`);
          return true;
        }
      }
      
      return !isValid;
    });

    console.log(`🔍 Found ${suspicious.length} recordings with suspicious durations (enhanced detection)`);
    console.log(`📊 Checked ${data?.length || 0} total recordings`);
    
    return suspicious;
  } catch (error) {
    console.error('Failed to identify suspicious recordings:', error);
    throw error;
  }
}

/**
 * Repair duration for a single recording using multiple methods
 */
export async function repairRecordingDuration(recordingId: string): Promise<DurationRepairResult> {
  try {
    // Fetch recording data
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (fetchError || !recording) {
      throw new Error(`Failed to fetch recording: ${fetchError?.message || 'Not found'}`);
    }

    const oldDuration = recording.duration;
    let newDuration: number | null = null;
    let method = 'none';

    console.log(`🔧 Repairing duration for recording: ${recording.title} (current: ${oldDuration}s)`);

    // Method 1: Re-extract from file URL if available
    if (recording.file_url && recording.file_url.trim() !== '') {
      try {
        console.log('📁 Attempting file-based duration extraction...');
        const result = await extractDurationFromUrl(recording.file_url, recording.title);
        
        if (result.success && result.duration) {
          // Use enhanced validation
          const validation = validateAndRecoverDuration(result.duration, new File([], 'dummy'), 'file_extraction');
          
          if (validation.isValid && isValidDuration(result.duration)) {
            newDuration = result.duration;
            method = `file_extraction_${result.method}_${validation.method}`;
            console.log(`✅ Duration extracted from file: ${newDuration}s (${validation.method})`);
          } else {
            console.warn(`⚠️ File extraction produced suspicious result: ${result.duration}s`);
          }
        } else {
          console.warn(`⚠️ File extraction failed: ${result.error}`);
        }
      } catch (fileError) {
        console.warn('⚠️ File extraction error:', fileError);
      }
    }

    // Method 2: Extract from Whisper segments if available
    if (!newDuration && recording.ai_insights) {
      try {
        console.log('🎵 Attempting segment-based duration extraction...');
        let segments;
        
        if (typeof recording.ai_insights === 'string') {
          try {
            segments = JSON.parse(recording.ai_insights)?.segments;
          } catch (e) {
            console.warn('Failed to parse ai_insights:', e);
          }
        } else if (recording.ai_insights && typeof recording.ai_insights === 'object') {
          segments = (recording.ai_insights as any).segments;
        }

        if (segments && Array.isArray(segments) && segments.length > 0) {
          const lastSegment = segments[segments.length - 1];
          if (lastSegment && lastSegment.end && lastSegment.end > 10) {
            const candidateDuration = Math.round(lastSegment.end);
            
            // Validate the segment-extracted duration
            if (isValidDuration(candidateDuration)) {
              newDuration = candidateDuration;
              method = 'segment_extraction';
              console.log(`✅ Duration extracted from segments: ${newDuration}s`);
            } else {
              console.warn(`⚠️ Segment extraction produced suspicious result: ${candidateDuration}s`);
            }
          }
        }
      } catch (segmentError) {
        console.warn('⚠️ Segment extraction error:', segmentError);
      }
    }

    // Method 3: Estimate from transcript length
    if (!newDuration && recording.transcript && recording.transcript.length > 1000) {
      try {
        console.log('📝 Attempting transcript-based duration estimation...');
        // Rough estimate: 150-200 words per minute, ~7 characters per word
        const estimatedDuration = Math.max(180, Math.min(7200, (recording.transcript.length / 7) * (60 / 175)));
        const candidateDuration = Math.round(estimatedDuration);
        
        // Validate the transcript-estimated duration
        if (isValidDuration(candidateDuration)) {
          newDuration = candidateDuration;
          method = 'transcript_estimation';
          console.log(`✅ Duration estimated from transcript: ${newDuration}s`);
        } else {
          console.warn(`⚠️ Transcript estimation produced suspicious result: ${candidateDuration}s`);
        }
      } catch (transcriptError) {
        console.warn('⚠️ Transcript estimation error:', transcriptError);
      }
    }

    // Update the recording if we found a better duration
    if (newDuration && newDuration !== oldDuration) {
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          duration: newDuration,
          updated_at: new Date().toISOString(),
          processing_notes: `Duration repaired: ${oldDuration}s → ${newDuration}s via ${method}`
        })
        .eq('id', recordingId);

      if (updateError) {
        throw new Error(`Failed to update recording: ${updateError.message}`);
      }

      console.log(`✅ Recording updated: ${oldDuration}s → ${newDuration}s`);
      
      return {
        recordingId,
        oldDuration,
        newDuration,
        method,
        success: true
      };
    } else {
      return {
        recordingId,
        oldDuration,
        newDuration: oldDuration,
        method: 'no_change_needed',
        success: true
      };
    }

  } catch (error) {
    console.error(`❌ Failed to repair duration for ${recordingId}:`, error);
    return {
      recordingId,
      oldDuration: null,
      newDuration: null,
      method: 'failed',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch repair durations for multiple recordings
 */
export async function batchRepairDurations(recordingIds: string[]): Promise<DurationRepairStats> {
  console.log(`🔧 Starting batch duration repair for ${recordingIds.length} recordings...`);
  
  const results: DurationRepairResult[] = [];
  
  for (let i = 0; i < recordingIds.length; i++) {
    const recordingId = recordingIds[i];
    console.log(`📊 Processing ${i + 1}/${recordingIds.length}: ${recordingId}`);
    
    const result = await repairRecordingDuration(recordingId);
    results.push(result);
    
    // Small delay to avoid overwhelming the system
    if (i < recordingIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const stats: DurationRepairStats = {
    totalChecked: results.length,
    totalFixed: results.filter(r => r.success && r.newDuration !== r.oldDuration).length,
    totalFailed: results.filter(r => !r.success).length,
    results
  };

  console.log(`✅ Batch repair complete: ${stats.totalFixed} fixed, ${stats.totalFailed} failed`);
  return stats;
}

/**
 * Auto-repair all recordings with suspicious durations
 */
export async function autoRepairAllSuspiciousDurations(): Promise<DurationRepairStats> {
  try {
    const suspiciousRecordings = await identifySuspiciousRecordings();
    const recordingIds = suspiciousRecordings.map(r => r.id);
    
    if (recordingIds.length === 0) {
      console.log('✅ No suspicious durations found to repair');
      return {
        totalChecked: 0,
        totalFixed: 0,
        totalFailed: 0,
        results: []
      };
    }

    return await batchRepairDurations(recordingIds);
  } catch (error) {
    console.error('❌ Auto-repair failed:', error);
    throw error;
  }
}

/**
 * Preview what recordings would be repaired without actually making changes
 */
export async function previewDurationRepairs(): Promise<any[]> {
  try {
    const suspiciousRecordings = await identifySuspiciousRecordings();
    
    const previews = suspiciousRecordings.map(recording => ({
      id: recording.id,
      title: recording.title,
      currentDuration: recording.duration,
      hasFileUrl: !!recording.file_url,
      hasSegments: !!(recording.ai_insights && (
        typeof recording.ai_insights === 'string' 
          ? JSON.parse(recording.ai_insights)?.segments 
          : recording.ai_insights?.segments
      )),
      hasTranscript: !!(recording.transcript && recording.transcript.length > 1000),
      repairMethods: [
        recording.file_url ? 'file_extraction' : null,
        recording.ai_insights ? 'segment_extraction' : null,
        recording.transcript?.length > 1000 ? 'transcript_estimation' : null
      ].filter(Boolean)
    }));

    console.log(`📋 Preview: ${previews.length} recordings would be processed`);
    return previews;
  } catch (error) {
    console.error('❌ Preview failed:', error);
    throw error;
  }
}

/**
 * Specifically repair recordings affected by compression truncation bug
 * Targets recordings with exactly 10 or 11 seconds duration
 */
export async function repairCompressionTruncatedFiles(): Promise<DurationRepairStats> {
  try {
    console.log('🚨 Starting compression truncation repair...');
    
    // Find recordings with exactly 10 or 11 seconds (compression bug signatures)
    const { data: truncatedRecordings, error } = await supabase
      .from('recordings')
      .select('id, title, duration, file_url, transcript, ai_insights, created_at, file_size')
      .in('duration', [10, 11])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!truncatedRecordings || truncatedRecordings.length === 0) {
      console.log('✅ No compression-truncated recordings found');
      return {
        totalChecked: 0,
        totalFixed: 0,
        totalFailed: 0,
        results: []
      };
    }

    console.log(`🔍 Found ${truncatedRecordings.length} recordings with compression truncation signatures (10-11 seconds)`);
    
    // Log details about the truncated recordings
    truncatedRecordings.forEach((recording, index) => {
      console.log(`  ${index + 1}. ${recording.title} - ${recording.duration}s (${recording.file_size ? (recording.file_size / 1024 / 1024).toFixed(1) + 'MB' : 'unknown size'})`);
    });

    // Repair each recording
    const recordingIds = truncatedRecordings.map(r => r.id);
    const repairResults = await batchRepairDurations(recordingIds);

    console.log(`🔧 Compression truncation repair complete:`);
    console.log(`  📊 Total checked: ${repairResults.totalChecked}`);
    console.log(`  ✅ Successfully fixed: ${repairResults.totalFixed}`);
    console.log(`  ❌ Failed to fix: ${repairResults.totalFailed}`);

    // Log successful fixes
    const successfulFixes = repairResults.results.filter(r => r.success && r.newDuration !== r.oldDuration);
    if (successfulFixes.length > 0) {
      console.log(`🎉 Successfully repaired recordings:`);
      successfulFixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix.recordingId}: ${fix.oldDuration}s → ${fix.newDuration}s (${fix.method})`);
      });
    }

    return repairResults;
  } catch (error) {
    console.error('❌ Compression truncation repair failed:', error);
    throw error;
  }
}