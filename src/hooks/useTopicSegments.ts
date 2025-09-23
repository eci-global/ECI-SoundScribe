
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TopicSegment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  topic: string;
  confidence: number;
  created_at: string;
}

export function useTopicSegments(recordingId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['topic-segments', recordingId],
    queryFn: async (): Promise<TopicSegment[]> => {
      if (!recordingId || !user?.id) {
        return [];
      }

      console.log('useTopicSegments: Fetching segments for recording:', recordingId);

      try {
        // First verify the recording belongs to the current user
        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .select('id, user_id')
          .eq('id', recordingId)
          .eq('user_id', user.id)
          .single();

        if (recordingError || !recording) {
          console.warn('Recording not found or access denied:', recordingError);
          return [];
        }

        // Fetch topic segments for this recording
        const { data: segments, error } = await supabase
          .from('topic_segments')
          .select('*')
          .eq('recording_id', recordingId)
          .order('start_time');

        if (error) {
          console.error('Error fetching topic segments:', error);
          throw error;
        }

        console.log('useTopicSegments: Found segments:', segments?.length || 0);
        return segments || [];

      } catch (error) {
        console.error('useTopicSegments: Unexpected error:', error);
        throw error;
      }
    },
    enabled: !!recordingId && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (was cacheTime)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
        return false;
      }
      return failureCount < 3;
    }
  });
}
