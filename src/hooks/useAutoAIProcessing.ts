import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';

/**
 * Hook that automatically triggers AI processing for new recordings
 * This creates the real-time data flow from upload -> AI processing -> notifications
 */
export function useAutoAIProcessing() {
  const { user } = useAuth();
  const { processRecording } = useRealtimeAI();

  const handleNewRecording = useCallback(async (recordingId: string) => {
    console.log('Auto-triggering AI processing for recording:', recordingId);
    
    // Check if recording is already processed to prevent unnecessary reprocessing
    const { data: recordingCheck } = await supabase
      .from('recordings')
      .select('id, status, transcript')
      .eq('id', recordingId)
      .single();
    
    if (recordingCheck?.status === 'completed' && recordingCheck?.transcript) {
      console.log('Recording already completed, skipping auto-processing');
      return;
    }
    
    // Add a small delay to ensure the recording is fully uploaded
    setTimeout(() => {
      processRecording(recordingId);
    }, 2000);
  }, [processRecording]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for new recordings
    const channelName = `auto-ai-processing-${user.id}`;
    const channel = createSafeChannel(channelName);
    
    if (!channel) {
      console.warn('Could not create safe channel for auto AI processing');
      return;
    }
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const recording = payload.new;
          console.log('New recording detected:', recording);
          
          // Only auto-process if the recording has an audio/video file AND is not already completed
          if (recording.file_url && recording.status === 'uploading' && !recording.transcript) {
            handleNewRecording(recording.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const recording = payload.new;
          const oldRecording = payload.old;
          
          // Trigger processing when status changes from 'uploading' to 'uploaded' (only if not already processed)
          if (oldRecording.status === 'uploading' && 
              recording.status === 'uploaded' && 
              recording.file_url &&
              !recording.transcript) {
            console.log('Recording upload completed, starting AI processing:', recording.id);
            handleNewRecording(recording.id);
          }
        }
      )
      .subscribe();

    return () => {
      removeChannel(channelName);
    };
  }, [user, handleNewRecording]);

  return {
    // This hook primarily works in the background
    // Could expose status if needed
  };
} 