import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DurationData {
  duration: number | null;
  isCalculating: boolean;
  error: string | null;
}

/**
 * Hook to provide real-time duration updates for a specific recording
 * Subscribes to database changes and updates duration live
 */
export function useRealtimeDuration(recordingId: string | null): DurationData {
  const [duration, setDuration] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Use ref to track current duration for subscription handler to avoid stale closure
  const currentDurationRef = useRef<number | null>(null);
  
  // Update ref whenever duration changes
  useEffect(() => {
    currentDurationRef.current = duration;
  }, [duration]);

  // Memoized handler to prevent subscription recreation and stale closures
  const handleRealtimeUpdate = useCallback((payload: any) => {
    try {
      const newData = payload.new as any;
      console.log('🔄 Real-time duration update received:', {
        recordingId,
        newDuration: newData.duration,
        newStatus: newData.status,
        currentDuration: currentDurationRef.current
      });

      // Convert string duration to number if needed (NUMERIC fields come as strings)
      const convertedNewDuration = typeof newData.duration === 'string' ? parseFloat(newData.duration) : newData.duration;
      const finalNewDuration = convertedNewDuration && !isNaN(convertedNewDuration) ? convertedNewDuration : null;

      // Simple logic: Always use valid new duration, ignore null/invalid updates
      if (finalNewDuration !== null && finalNewDuration !== undefined && finalNewDuration > 0) {
        console.log(`✅ Updating duration to ${finalNewDuration} (converted from ${newData.duration})`);
        setDuration(finalNewDuration);
      } else {
        console.log(`⚠️ Ignoring invalid duration update: ${newData.duration} -> ${finalNewDuration}`);
      }

      // Update calculating state based on status
      const processingStatuses = ['processing', 'transcribing', 'processing_large_file'];
      const shouldCalculate = processingStatuses.includes(newData.status) && (finalNewDuration === null || finalNewDuration === 0);
      setIsCalculating(shouldCalculate);

      // Clear error on successful update
      setError(null);
    } catch (err) {
      console.error('💥 Error in real-time duration update handler:', err);
      setError(err instanceof Error ? err.message : 'Real-time update error');
    }
  }, [recordingId]);

  useEffect(() => {
    if (!recordingId) {
      setDuration(null);
      setIsCalculating(false);
      setError(null);
      setRealtimeConnected(false);
      currentDurationRef.current = null;
      return;
    }

    // Initial fetch with simplified logic
    const fetchInitialDuration = async () => {
      try {
        console.log(`🔄 Fetching initial duration for recording: ${recordingId}`);
        const { data, error: fetchError } = await supabase
          .from('recordings')
          .select('duration, status')
          .eq('id', recordingId)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching initial duration:', fetchError);
          // Don't set error for missing recordings - just show no duration
          if (fetchError.code === 'PGRST116') {
            console.log('📝 Recording not found, showing no duration');
            setDuration(null);
            setIsCalculating(false);
            setError(null);
          } else {
            setError(fetchError.message);
          }
          return;
        }

        if (data) {
          // Convert string duration to number if needed (NUMERIC fields come as strings)
          const convertedDuration = typeof data.duration === 'string' ? parseFloat(data.duration) : data.duration;
          const finalDuration = convertedDuration && !isNaN(convertedDuration) && convertedDuration > 0 ? convertedDuration : null;
          
          console.log(`📊 Initial duration fetched: ${data.duration} -> ${finalDuration} (status: ${data.status})`);
          
          setDuration(finalDuration);
          currentDurationRef.current = finalDuration;
          
          // Set calculating state based on status and duration availability
          const processingStatuses = ['processing', 'transcribing', 'processing_large_file'];
          const shouldCalculate = processingStatuses.includes(data.status) && (finalDuration === null || finalDuration === 0);
          setIsCalculating(shouldCalculate);
          
          console.log(`🔢 Setting isCalculating: ${shouldCalculate} (status: ${data.status}, duration: ${finalDuration})`);
        }
      } catch (err) {
        console.error('💥 Failed to fetch initial duration:', err);
        // Don't set error for network issues - just show no duration
        setDuration(null);
        setIsCalculating(false);
        setError(null);
      }
    };

    fetchInitialDuration();

    // Set up real-time subscription with improved error handling
    let channel: any;
    try {
      channel = supabase
        .channel(`recording_duration_${recordingId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'recordings',
            filter: `id=eq.${recordingId}`,
          },
          handleRealtimeUpdate
        )
        .subscribe((status) => {
          console.log('Duration subscription status:', status, 'for recording:', recordingId);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time duration subscription active');
            setRealtimeConnected(true);
            setError(null); // Clear any previous real-time errors
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time duration subscription error');
            setRealtimeConnected(false);
            setError('Real-time connection failed');
          } else if (status === 'CLOSED') {
            console.log('🔌 Real-time duration subscription closed');
            setRealtimeConnected(false);
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Real-time duration subscription timed out');
            setRealtimeConnected(false);
            setError('Real-time connection timed out');
          }
        });

      // Add error handling for subscription setup
      if (!channel) {
        console.error('❌ Failed to create real-time channel');
        setError('Failed to establish real-time connection');
      }
    } catch (err) {
      console.error('💥 Error setting up real-time subscription:', err);
      setError('Real-time setup failed');
    }

    // Cleanup on unmount or recordingId change
    return () => {
      console.log('🧹 Cleaning up duration subscription for:', recordingId);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error('💥 Error removing channel:', err);
        }
      }
      setRealtimeConnected(false);
    };
  }, [recordingId, handleRealtimeUpdate]); // Include handleRealtimeUpdate in dependencies

  return {
    duration,
    isCalculating,
    error: realtimeConnected ? null : error, // Only show error if real-time is not connected
  };
}

/**
 * Hook to provide live duration updates for multiple recordings
 * More efficient than multiple individual subscriptions
 */
export function useRealtimeMultipleDurations(recordingIds: string[]) {
  const [durations, setDurations] = useState<Record<string, number | null>>({});
  const [calculating, setCalculating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (recordingIds.length === 0) {
      setDurations({});
      setCalculating({});
      return;
    }

    // Initial fetch for all recordings
    const fetchInitialDurations = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('recordings')
          .select('id, duration, status')
          .in('id', recordingIds);

        if (fetchError) {
          console.error('Error fetching initial durations:', fetchError);
          return;
        }

        const durationsMap: Record<string, number | null> = {};
        const calculatingMap: Record<string, boolean> = {};

        data?.forEach((record) => {
          // Convert string duration to number if needed (NUMERIC fields come as strings)
          const convertedDuration = typeof record.duration === 'string' ? parseFloat(record.duration) : record.duration;
          const finalDuration = convertedDuration && !isNaN(convertedDuration) ? convertedDuration : null;
          
          durationsMap[record.id] = finalDuration;
          calculatingMap[record.id] = !finalDuration && 
            ['processing', 'transcribing', 'processing_large_file'].includes(record.status);
        });

        setDurations(durationsMap);
        setCalculating(calculatingMap);
      } catch (err) {
        console.error('Failed to fetch initial durations:', err);
      }
    };

    fetchInitialDurations();

    // Set up real-time subscription for all recordings
    const channel = supabase
      .channel('recordings_durations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `id=in.(${recordingIds.join(',')})`,
        },
        (payload) => {
          const newData = payload.new as any;
          const recordingId = newData.id;

          console.log('Multi-duration update received:', {
            recordingId,
            duration: newData.duration,
            status: newData.status
          });

          // Convert string duration to number if needed (NUMERIC fields come as strings)
          const convertedDuration = typeof newData.duration === 'string' ? parseFloat(newData.duration) : newData.duration;
          const finalDuration = convertedDuration && !isNaN(convertedDuration) ? convertedDuration : null;

          // Update duration for this specific recording
          setDurations(prev => ({
            ...prev,
            [recordingId]: finalDuration
          }));

          // Update calculating state
          const processingStatuses = ['processing', 'transcribing', 'processing_large_file'];
          setCalculating(prev => ({
            ...prev,
            [recordingId]: !finalDuration && processingStatuses.includes(newData.status)
          }));
        }
      )
      .subscribe((status) => {
        console.log('Multi-duration subscription status:', status, 'for', recordingIds.length, 'recordings');
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Bulk real-time duration subscription active for recordings:', recordingIds);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Bulk real-time duration subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordingIds.join(',')]); // Dependency on the actual IDs

  return {
    durations,
    calculating
  };
}