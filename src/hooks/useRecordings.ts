
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RecordingFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RecordingListItem {
  id: string;
  title: string;
  participants: string;
  duration?: number;
  created_at: string;
  status: 'uploading' | 'processing' | 'processing_large_file' | 'transcribing' | 'transcribed' | 'transcription_failed' | 'completed' | 'failed';
  file_type: 'audio' | 'video';
  description?: string;
  user_id: string;
  ai_summary?: string;
  summary?: string;
  file_url?: string;
  transcript?: string;
  coaching_evaluation?: any;
  enable_coaching?: boolean;
}

export function useRecordings(filters: RecordingFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recordings', user?.id, filters],
    queryFn: async (): Promise<RecordingListItem[]> => {
      console.log('useRecordings: Starting query', { userId: user?.id, filters });
      
      if (!user?.id) {
        console.log('useRecordings: No user ID, returning empty array');
        return [];
      }

      try {
        let query = supabase
          .from('recordings')
          .select(`
            id,
            title,
            duration,
            created_at,
            status,
            file_type,
            description,
            user_id,
            summary,
            ai_summary,
            file_url,
            transcript,
            coaching_evaluation,
            enable_coaching
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        console.log('useRecordings: Query built for user:', user.id);

        // Apply filters
        if (filters.search) {
          query = query.ilike('title', `%${filters.search}%`);
          console.log('useRecordings: Applied search filter:', filters.search);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
          console.log('useRecordings: Applied status filter:', filters.status);
        }

        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
          console.log('useRecordings: Applied dateFrom filter:', filters.dateFrom);
        }

        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo);
          console.log('useRecordings: Applied dateTo filter:', filters.dateTo);
        }

        console.log('useRecordings: Executing query...');
        const { data, error } = await query;

        if (error) {
          console.error('useRecordings: Database error:', {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw new Error(`Database query failed: ${error.message}`);
        }

        console.log('useRecordings: Query successful, records found:', data?.length || 0);

        // Transform and type-cast the data
        const transformedData = (data || []).map((record: any) => ({
          id: record.id,
          title: record.title,
          participants: '—',
          duration: record.duration,
          created_at: record.created_at,
          status: record.status as RecordingListItem['status'],
          file_type: (record.file_type || 'audio') as RecordingListItem['file_type'],
          description: record.description,
          user_id: record.user_id,
          ai_summary: record.ai_summary,
          summary: record.summary,
          file_url: record.file_url,
          transcript: record.transcript,
          coaching_evaluation: record.coaching_evaluation,
          enable_coaching: record.enable_coaching
        }));

        console.log('useRecordings: Data transformed successfully:', transformedData.length, 'items');
        return transformedData;

      } catch (error) {
        console.error('useRecordings: Unexpected error in query function:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 10000, // Shorter cache time for more frequent updates
    refetchInterval: (data) => {
      try {
        // Multiple safety checks to prevent any type errors
        if (data === null || data === undefined) return false;
        if (typeof data !== 'object') return false;
        if (!Array.isArray(data)) return false;
        if (data.length === 0) return false;
        
        // Extra safety: ensure each item has the expected properties
        const safeData = data.filter(item => 
          item && typeof item === 'object' && typeof item.status === 'string'
        );
        
        if (safeData.length === 0) return false;
        
        // Check if any recordings are still processing
        const hasProcessingRecordings = safeData.some(recording => 
          recording.status === 'processing' || recording.status === 'uploading'
        );
        
        // Poll every 10 seconds if there are processing recordings, otherwise stop
        return hasProcessingRecordings ? 10000 : false;
      } catch (error) {
        // Fallback: if anything goes wrong, stop polling
        console.warn('RefetchInterval error in useRecordings:', error);
        return false;
      }
    },
    retry: (failureCount, error) => {
      console.log('useRecordings: Retry attempt', failureCount, 'for error:', error);
      if (failureCount >= 2) return false;
      if (error?.message?.includes('JWT') || error?.message?.includes('auth')) return false;
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
