
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel, recordConnectionFailure } from '@/utils/realtimeUtils';
import { useRecordingDetail } from './useRecordingDetail';

export function useRealtimeUpdates(recordingId: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<string | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!recordingId) return;

    console.log('🔄 Setting up real-time updates for recording:', recordingId);

    const channelName = `recording-${recordingId}`;
    channelRef.current = channelName;

    const channel = createSafeChannel(channelName);
    
    if (!channel) {
      console.warn(`Could not create realtime channel for ${channelName}`);
      return;
    }

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `id=eq.${recordingId}`
        },
        (payload) => {
          console.log('📡 Recording updated via real-time:', payload);
          
          // Optimized invalidation: only invalidate if status changed or AI data was added
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Only invalidate if meaningful changes occurred
          if (newRecord.status !== oldRecord?.status || 
              newRecord.ai_summary !== oldRecord?.ai_summary ||
              newRecord.transcript !== oldRecord?.transcript) {
            
            // Use setQueryData for targeted updates instead of full invalidation
            queryClient.setQueryData(['recording-detail', recordingId], (oldData: any) => {
              if (!oldData) return oldData;
              return { ...oldData, ...newRecord };
            });
            
            // Only invalidate recordings list if status changed (affects listing)
            if (newRecord.status !== oldRecord?.status) {
              queryClient.invalidateQueries({
                queryKey: ['recordings']
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'speaker_segments',
          filter: `recording_id=eq.${recordingId}`
        },
        (payload) => {
          console.log('📡 Speaker segments added via real-time:', payload);
          queryClient.invalidateQueries({
            queryKey: ['recording-detail', recordingId]
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'topic_segments',
          filter: `recording_id=eq.${recordingId}`
        },
        (payload) => {
          console.log('📡 Topic segments added via real-time:', payload);
          queryClient.invalidateQueries({
            queryKey: ['recording-detail', recordingId]
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_moments',
          filter: `recording_id=eq.${recordingId}`
        },
        (payload) => {
          console.log('📡 AI moments added via real-time:', payload);
          queryClient.invalidateQueries({
            queryKey: ['recording-detail', recordingId]
          });
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime subscription status for ${channelName}:`, status);
        
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn(`⚠️ Realtime connection failed for ${channelName}`);
          recordConnectionFailure();
        }
      });

    return () => {
      // Clear any pending cleanup timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        console.log('🔌 Cleaning up real-time channel immediately:', channelRef.current);
        
        // Immediate cleanup to prevent memory leaks - no timeout needed
        try {
          removeChannel(channelRef.current);
          console.log('✅ Real-time channel cleaned up successfully:', channelRef.current);
        } catch (error) {
          console.warn('⚠️ Error during channel cleanup:', error);
        }
        channelRef.current = null;
      }
    };
  }, [recordingId, queryClient]);
}

// Enhanced hook that combines realtime with recording detail
export function useEnhancedRecordingDetail(recordingId: string) {
  console.log('🚀 useEnhancedRecordingDetail called with recordingId:', recordingId);
  
  // Use direct destructuring to avoid any module resolution issues
  const recordingDetailResult = useRecordingDetail(recordingId);
  const { data, isLoading, error, refetch } = recordingDetailResult;
  
  // Enable real-time updates
  useRealtimeUpdates(recordingId);
  
  return {
    data,
    isLoading,
    error,
    refetch,
    // Helper flags
    hasInstantData: data && (
      data.speaker_segments.length > 0 || 
      data.topic_segments.length > 0 || 
      data.ai_moments_data.length > 0
    ),
    isTransitioning: data?.isUsingInstantAnalysis && !data?.hasAIData,
    isComplete: data?.hasAIData && !data?.isUsingInstantAnalysis
  };
}
