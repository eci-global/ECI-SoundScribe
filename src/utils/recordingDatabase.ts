import { supabase } from '@/integrations/supabase/client';
import type { ContentType } from '@/types/recording';

interface RecordingData {
  user_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: 'audio' | 'video';
  file_size: number;
  duration?: number | null;
  status: 'processing' | 'uploading' | 'failed';
  content_type?: ContentType;
  enable_coaching?: boolean;
  processing_progress?: number;
  error_message?: string | null;
}

export const createRecordingRecord = async (recordingData: RecordingData) => {
  console.log('Inserting recording data:', recordingData);

  // Validate authentication before database operation
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Authentication session error:', sessionError);
    throw new Error(`Authentication error: ${sessionError.message}`);
  }
  
  if (!session?.user) {
    console.error('No authenticated user session found');
    throw new Error('Authentication required: No valid user session found. Please log in and try again.');
  }
  
  // Verify the user_id matches the authenticated session
  if (session.user.id !== recordingData.user_id) {
    console.error('User ID mismatch:', { sessionUserId: session.user.id, recordingUserId: recordingData.user_id });
    throw new Error('Authentication error: User ID mismatch detected');
  }

  console.log('✅ Authentication validated for user:', session.user.id);

  const { data: newRecording, error: dbError } = await supabase
    .from('recordings')
    .insert(recordingData)
    .select()
    .single();

  if (dbError) {
    console.error('Database insert error:', dbError);
    
    // Provide specific error messages for common RLS issues
    if (dbError.message?.includes('row-level security')) {
      throw new Error(`Database security error: Unable to create recording. Please ensure you are logged in with proper permissions. Details: ${dbError.message}`);
    }
    
    throw new Error(`Database error: ${dbError.message}`);
  }

  console.log('Recording record created successfully:', newRecording);
  return newRecording;
};

export const updateRecordingStatus = async (
  recordingId: string, 
  status: 'failed' | 'completed' | 'processing' | 'uploading',
  errorMessage?: string | null
) => {
  const updateData: any = { status };
  
  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }
  
  if (status === 'processing') {
    updateData.processing_progress = 10;
  } else if (status === 'completed') {
    updateData.processing_progress = 100;
  }
  
  const { error } = await supabase
    .from('recordings')
    .update(updateData)
    .eq('id', recordingId);
    
  if (error) {
    console.error('Error updating recording status:', error);
    throw error;
  }
};

export const updateRecordingSummary = async (recordingId: string, summary: string) => {
  const { data, error } = await supabase
    .from('recordings')
    .update({ 
      summary,
      status: 'completed',
      processing_progress: 100,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordingId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating recording summary:', error);
    throw error;
  }
  
  return data;
};

export const updateRecordingProgress = async (recordingId: string, progress: number) => {
  const { error } = await supabase
    .from('recordings')
    .update({ 
      processing_progress: Math.min(progress, 100),
      updated_at: new Date().toISOString()
    })
    .eq('id', recordingId);
    
  if (error) {
    console.error('Error updating recording progress:', error);
    throw error;
  }
};
