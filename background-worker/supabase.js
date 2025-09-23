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
    const updateData = {
      status: 'completed',
      processing_progress: 100,
      updated_at: new Date().toISOString(),
      ...results
    };

    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', recordingId)
      .select();

    if (error) {
      console.error('Failed to update recording with AI results:', error);
      return { success: false, error: error.message };
    }

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

    if (error && !error.message.includes('relation "processing_logs" does not exist')) {
      console.warn('Failed to log processing activity:', error);
    }
  } catch (error) {
    console.warn('Error logging processing activity:', error);
  }
}