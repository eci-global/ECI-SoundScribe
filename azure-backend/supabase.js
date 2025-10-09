import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Update recording status in database
 */
export async function updateRecordingStatus(recordingId, status, progress = null, errorMessage = null) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Only include processing_progress if the column exists (will be handled by error catching)
    if (progress !== null) {
      updateData.processing_progress = progress;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', recordingId)
      .select();

    if (error) {
      // If the error is about missing processing_progress column, try without it
      if (error.message && error.message.includes('processing_progress')) {
        console.warn('processing_progress column not found, updating without progress');
        delete updateData.processing_progress;
        
        const { data: retryData, error: retryError } = await supabase
          .from('recordings')
          .update(updateData)
          .eq('id', recordingId)
          .select();

        if (retryError) {
          console.error('Failed to update recording status (retry):', retryError);
          return { success: false, error: retryError.message };
        }

        console.log(`✅ Updated recording ${recordingId} status to: ${status}`);
        return { success: true, data: retryData };
      }

      console.error('Failed to update recording status:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Updated recording ${recordingId} status to: ${status}${progress !== null ? ` (${progress}%)` : ''}`);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error updating recording status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recording by ID
 */
export async function getRecording(recordingId) {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (error) {
      console.error('Failed to fetch recording:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching recording:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update recording with AI analysis results
 */
export async function updateRecordingWithAI(recordingId, results) {
  try {
    // Debug: Log what we're trying to save
    console.log('💾 updateRecordingWithAI - Input results:', {
      recordingId,
      hasTranscript: !!results.transcript,
      hasSummary: !!results.ai_summary,
      duration: results.duration,
      durationType: typeof results.duration,
      resultKeys: Object.keys(results)
    });

    const updateData = {
      status: 'completed',
      processing_progress: 100,
      updated_at: new Date().toISOString(),
      ...results
    };

    // Debug: Log the final update data
    console.log('💾 updateRecordingWithAI - Final update data:', {
      recordingId,
      status: updateData.status,
      hasTranscript: !!updateData.transcript,
      hasSummary: !!updateData.ai_summary,
      duration: updateData.duration,
      durationType: typeof updateData.duration
    });

    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', recordingId)
      .select();

    if (error) {
      console.error('Failed to update recording with AI results:', error);
      return { success: false, error: error.message };
    }

    // Debug: Log the response
    console.log('✅ updateRecordingWithAI - Success response:', {
      recordingId,
      returnedData: data?.[0] ? {
        id: data[0].id,
        status: data[0].status,
        hasTranscript: !!data[0].transcript,
        hasSummary: !!data[0].ai_summary,
        duration: data[0].duration,
        durationType: typeof data[0].duration
      } : null
    });

    console.log(`✅ Updated recording ${recordingId} with AI analysis results`);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error updating recording with AI results:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Download file from Supabase Storage
 */
export async function downloadFileFromStorage(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Failed to download file from storage:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error downloading file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Log processing activity
 */
export async function logProcessingActivity(recordingId, activity, details = null) {
  try {
    const logData = {
      recording_id: recordingId,
      activity,
      details,
      timestamp: new Date().toISOString(),
      worker_instance: process.env.WORKER_INSTANCE_ID || 'default'
    };

    // Insert into processing_logs table (create if needed)
    const { error } = await supabase
      .from('processing_logs')
      .insert([logData]);

    if (error && error.message && !error.message.includes('relation "processing_logs" does not exist')) {
      console.warn('Failed to log processing activity:', error);
    }
  } catch (error) {
    console.warn('Error logging processing activity:', error);
  }
}

/**
 * After a recording is processed, ensure employee linkage and scorecard creation.
 * - Creates employee_call_participation via Edge Function if missing
 * - Generates employee_scorecards via Edge Function if participation exists and no scorecard yet
 * Non-fatal: logs warnings and returns a summary.
 */
export async function postProcessEmployeeForRecording(recordingId) {
  const summary = { participationChecked: false, participationCreated: false, scorecardCreated: false };
  try {
    // Check existing participation
    const { data: existingParticipation, error: partErr } = await supabase
      .from('employee_call_participation')
      .select('id, employee_id')
      .eq('recording_id', recordingId);
    if (partErr) {
      console.warn('postProcessEmployeeForRecording: participation check failed:', partErr.message);
    }
    summary.participationChecked = true;

    if (!existingParticipation || existingParticipation.length === 0) {
      try {
        const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-employee-name', {
          body: { recording_id: recordingId }
        });
        if (extractError) {
          console.warn('postProcessEmployeeForRecording: extract-employee-name failed:', extractError);
        } else {
          summary.participationCreated = !!extractData?.participation_created;
        }
      } catch (invErr) {
        console.warn('postProcessEmployeeForRecording: invoke extract-employee-name error:', invErr?.message || invErr);
      }
    }

    // Re-check participation before scorecard
    const { data: partCheck } = await supabase
      .from('employee_call_participation')
      .select('id, employee_id')
      .eq('recording_id', recordingId);
    if (partCheck && partCheck.length > 0) {
      // Check if scorecard already exists
      const { data: existingScorecards, error: scErr } = await supabase
        .from('employee_scorecards')
        .select('id')
        .eq('recording_id', recordingId);
      if (scErr) {
        console.warn('postProcessEmployeeForRecording: scorecard check failed:', scErr.message);
      }
      if (!existingScorecards || existingScorecards.length === 0) {
        try {
          const { data: scData, error: scError } = await supabase.functions.invoke('generate-employee-scorecard', {
            body: { recording_id: recordingId }
          });
          if (scError) {
            console.warn('postProcessEmployeeForRecording: generate-employee-scorecard failed:', scError);
          } else {
            summary.scorecardCreated = (scData?.scorecards_created || 0) > 0;
          }
        } catch (invErr2) {
          console.warn('postProcessEmployeeForRecording: invoke generate-employee-scorecard error:', invErr2?.message || invErr2);
        }
      }
    }
  } catch (e) {
    console.warn('postProcessEmployeeForRecording: unexpected error:', e?.message || e);
  }
  return summary;
}
