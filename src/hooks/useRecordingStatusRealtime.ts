
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';

interface RecordingStatus {
  id: string;
  status: string;
  transcript?: string;
  summary?: string;
  coaching_evaluation?: any;
  updated_at: string;
}

export function useRecordingStatusRealtime(recordingId?: string) {
  const { user } = useAuth();
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId || !user?.id) {
      return;
    }

    const channelName = `recording-status-${recordingId}`;
    
    // Initial fetch
    const fetchInitialStatus = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('recordings')
          .select('id, status, transcript, summary, coaching_evaluation, updated_at')
          .eq('id', recordingId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          console.error('Error fetching initial recording status:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (data) {
          setRecordingStatus({
            id: data.id,
            status: data.status || 'unknown',
            transcript: data.transcript || undefined,
            summary: data.summary || undefined,
            coaching_evaluation: data.coaching_evaluation || undefined,
            updated_at: data.updated_at
          });
        }
      } catch (err) {
        console.error('Error in fetchInitialStatus:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchInitialStatus();

    // Set up real-time subscription
    const channel = createSafeChannel(channelName);
    
    if (!channel) {
      console.warn('Could not create safe channel for recording status');
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
          console.log('Real-time recording status update:', payload);
          
          // Safely handle the payload - check if data exists and has expected structure
          if (payload?.new && typeof payload.new === 'object') {
            const data = payload.new as any;
            setRecordingStatus({
              id: data.id || recordingId,
              status: data.status || 'unknown',
              transcript: data.transcript || undefined,
              summary: data.summary || undefined,
              coaching_evaluation: data.coaching_evaluation || undefined,
              updated_at: data.updated_at || new Date().toISOString()
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to recording status updates');
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', err);
          setError('Real-time connection error');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.warn('Channel timed out');
          setError('Connection timed out');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          console.log('Channel closed');
          setIsConnected(false);
        }
      });

    return () => {
      removeChannel(channelName);
      setIsConnected(false);
    };
  }, [recordingId, user?.id]);

  return {
    recordingStatus,
    isConnected,
    error
  };
}
