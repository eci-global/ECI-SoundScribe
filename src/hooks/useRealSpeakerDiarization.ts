import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedAnalysisRequest {
  recording_id: string;
}

interface EnhancedAnalysisResponse {
  message: string;
  recording_id: string;
  speakers_detected: number;
  confidence_score: number;
  analysis_method: string;
  segments_analyzed: number;
}

/**
 * Hook for triggering enhanced Whisper segment analysis
 * Uses existing Whisper segment data to detect speaker changes through timing patterns
 */
export function useRealSpeakerDiarization() {
  const queryClient = useQueryClient();

  const diarizationMutation = useMutation({
    mutationFn: async (request: EnhancedAnalysisRequest): Promise<EnhancedAnalysisResponse> => {
      console.log('🎵 Starting enhanced Whisper segment analysis for recording:', request.recording_id);

      const { data, error } = await supabase.functions.invoke('enhance-whisper-analysis', {
        body: request,
      });

      if (error) {
        console.error('❌ Enhanced analysis service error:', error);
        throw new Error(error.message || 'Enhanced speaker analysis failed');
      }

      console.log('✅ Enhanced Whisper analysis completed:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log(`🎉 Enhanced Whisper analysis success: ${data.speakers_detected} speakers detected using ${data.analysis_method}`);
      
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['recording', variables.recording_id] });
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      
      // Show success notification (if you have a notification system)
      // toast.success(`Enhanced speaker analysis completed: ${data.speakers_detected} speakers detected`);
    },
    onError: (error) => {
      console.error('❌ Enhanced Whisper analysis failed:', error);
      // Show error notification
      // toast.error(`Enhanced speaker analysis failed: ${error.message}`);
    },
  });

  return {
    triggerRealDiarization: diarizationMutation.mutate,
    isLoading: diarizationMutation.isPending,
    error: diarizationMutation.error,
    data: diarizationMutation.data,
    isSuccess: diarizationMutation.isSuccess,
  };
}

/**
 * Check if a recording is eligible for enhanced Whisper analysis
 */
export function canUseDiarization(recording: any): boolean {
  // Must be completed processing
  if (recording.status !== 'completed') return false;
  
  // Must have transcript available
  if (!recording?.transcript) return false;
  
  // Must not already have enhanced segment analysis
  if (recording.ai_speaker_analysis?.analysis_method === 'whisper_segment_analysis') return false;
  
  // Should have Whisper segments available (if processed recently)
  // If no segments, the function will still try to re-process
  
  return true;
}

/**
 * Check if enhanced Whisper analysis is available
 */
export function isDiarizationAvailable(): boolean {
  // Enhanced analysis uses existing Whisper data and doesn't require external services
  // It's always available if the edge function is deployed
  return true;
}