// Pre-process recordings during upload for instant data availability
import { performInstantAnalysis } from './instantAnalysis';
import { supabase } from '@/integrations/supabase/client';

export interface PreProcessedData {
  instant_speakers: any[];
  instant_topics: any[];
  instant_moments: any[];
  processed_at: string;
  // Json compatibility
  [key: string]: any;
}

export async function preProcessRecording(
  recordingId: string, 
  transcript: string
): Promise<PreProcessedData> {
  console.log('Pre-processing recording for instant availability...');
  
  try {
    // Perform instant analysis
    const analysis = performInstantAnalysis(transcript, recordingId);
    
    // Store in database immediately
    const preProcessedData: PreProcessedData = {
      instant_speakers: analysis.speakers,
      instant_topics: analysis.topics,
      instant_moments: analysis.moments,
      processed_at: new Date().toISOString()
    };
    
    // Update recording with instant analysis
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        instant_analysis: preProcessedData,
        instant_analysis_complete: true
      })
      .eq('id', recordingId);
    
    if (updateError) {
      console.error('Error storing instant analysis:', updateError);
      throw updateError;
    }
    
    console.log('Instant analysis stored successfully');
    return preProcessedData;
    
  } catch (error) {
    console.error('Error in pre-processing:', error);
    throw error;
  }
}

// Hook into upload process
export async function enhanceUploadWithInstantAnalysis(
  recordingId: string,
  transcript?: string
): Promise<void> {
  if (!transcript) {
    console.log('No transcript available for instant analysis');
    return;
  }
  
  try {
    await preProcessRecording(recordingId, transcript);
  } catch (error) {
    console.error('Failed to enhance upload with instant analysis:', error);
    // Don't throw - this is an enhancement, not critical
  }
}

// Call this during transcript processing
export async function processTranscriptWithInstantAnalysis(
  recordingId: string,
  transcript: string
) {
  // Save transcript
  const { supabase } = await import('@/integrations/supabase/client');
  
  await supabase
    .from('recordings')
    .update({ transcript })
    .eq('id', recordingId);
  
  // Immediately run instant analysis
  await preProcessRecording(recordingId, transcript);
  
  // Trigger AI processing in background (non-blocking)
  triggerAIProcessing(recordingId, transcript);
}

async function triggerAIProcessing(recordingId: string, transcript: string) {
  // This runs in background without blocking
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Trigger all AI functions
    const promises = [
      supabase.functions.invoke('analyze-speakers-topics', {
        body: { recording_id: recordingId, transcript }
      }),
      supabase.functions.invoke('generate-ai-moments', {
        body: { recording_id: recordingId, transcript }
      }),
      supabase.functions.invoke('generate-call-brief', {
        body: { recordingId, transcript }
      })
    ];
    
    // Don't await - let them run in background
    Promise.allSettled(promises).then(() => {
      console.log('AI processing completed for recording:', recordingId);
    });
    
  } catch (error) {
    console.error('AI processing failed:', error);
  }
} 