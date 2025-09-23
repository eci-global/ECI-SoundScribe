import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a recording has sentiment analysis data
 */
export async function hassSentimentAnalysis(recordingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ai_moments')
      .select('id')
      .eq('recording_id', recordingId)
      .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment'])
      .limit(1);

    if (error) {
      console.error('Error checking sentiment analysis:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking sentiment analysis:', error);
    return false;
  }
}

/**
 * Retry sentiment analysis for a recording
 */
export async function retrySentimentAnalysis(recordingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if recording exists and has transcript
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('id, transcript, status')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      return { success: false, error: 'Recording not found' };
    }

    if (!recording.transcript) {
      return { success: false, error: 'Recording has no transcript' };
    }

    if (recording.status !== 'completed') {
      return { success: false, error: 'Recording processing not completed' };
    }

    // Invoke the sentiment analysis edge function
    console.log('Retrying sentiment analysis for recording:', recordingId);
    
    const { data, error } = await supabase.functions.invoke('analyze-speakers-topics', {
      body: {
        recording_id: recordingId,
        transcript: recording.transcript
      }
    });

    if (error) {
      console.error('Sentiment analysis retry failed:', error);
      return { success: false, error: error.message };
    }

    console.log('Sentiment analysis retry completed successfully');
    return { success: true };

  } catch (error) {
    console.error('Unexpected error during sentiment analysis retry:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Batch retry sentiment analysis for multiple recordings
 */
export async function batchRetrySentimentAnalysis(recordingIds: string[]): Promise<{
  successful: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  // Process in batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < recordingIds.length; i += batchSize) {
    const batch = recordingIds.slice(i, i + batchSize);
    
    const promises = batch.map(async (id) => {
      const result = await retrySentimentAnalysis(id);
      if (result.success) {
        successful.push(id);
      } else {
        failed.push({ id, error: result.error || 'Unknown error' });
      }
    });

    await Promise.all(promises);
    
    // Add a small delay between batches
    if (i + batchSize < recordingIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { successful, failed };
}

/**
 * Find recordings without sentiment analysis
 */
export async function findRecordingsWithoutSentiment(userId: string): Promise<string[]> {
  try {
    // Get all completed recordings for the user
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('transcript', 'is', null);

    if (recordingsError || !recordings) {
      console.error('Error fetching recordings:', recordingsError);
      return [];
    }

    // Check each recording for sentiment data
    const recordingsWithoutSentiment: string[] = [];
    
    for (const recording of recordings) {
      const hasSentiment = await hassSentimentAnalysis(recording.id);
      if (!hasSentiment) {
        recordingsWithoutSentiment.push(recording.id);
      }
    }

    return recordingsWithoutSentiment;
  } catch (error) {
    console.error('Error finding recordings without sentiment:', error);
    return [];
  }
}