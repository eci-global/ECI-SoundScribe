import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { convertDatabaseToRecording } from '@/utils/databaseTypeUtils';
import type { Json } from '@/integrations/supabase/types';

export interface RecordingDetailData {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type: 'audio' | 'video';
  file_size?: number;
  duration?: number;
  status: 'uploading' | 'processing' | 'processing_large_file' | 'transcribing' | 'transcribed' | 'transcription_failed' | 'completed' | 'failed';
  transcript?: string;
  summary?: string;
  ai_summary?: string;
  ai_insights?: any;
  ai_moments?: any;
  ai_next_steps?: any;
  ai_speaker_analysis?: any;
  coaching_evaluation?: any;
  content_type?: string;
  thumbnail_url?: string;
  enable_coaching?: boolean;
  created_at: string;
  updated_at: string;
  ai_generated_at?: string;
  // Employee linking
  employee_participation_count?: number;
  employee_linking_pending?: boolean;
  // Related data
  speaker_segments: any[];
  topic_segments: any[];
  ai_moments_data: any[];
  // Helper flags
  hasAIData?: boolean;
  isUsingInstantAnalysis?: boolean;
}

// Helper function to safely validate data structure
function validateRecordingData(data: any): boolean {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }
    
    // Check required fields
    if (!data.id || !data.status) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Helper function to safely get array length
function safeArrayLength(arr: any): number {
  try {
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export function useRecordingDetail(recordingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recording-detail', recordingId],
    queryFn: async (): Promise<RecordingDetailData | null> => {
      if (!recordingId || !user?.id) {
        console.log('useRecordingDetail: Missing recordingId or user');
        return null;
      }

      console.log('useRecordingDetail: Fetching recording:', recordingId);

      try {
        // Fetch recording with all related data
        const { data: dbRecording, error: recordingError } = await supabase
          .from('recordings')
          .select('*')
          .eq('id', recordingId)
          .eq('user_id', user.id)
          .single();

        if (recordingError) {
          console.error('useRecordingDetail: Recording fetch error:', recordingError);

          // If it's a "not found" error, return null gracefully instead of throwing
          if (recordingError.code === 'PGRST116' || recordingError.message?.includes('not found')) {
            console.log('useRecordingDetail: Recording not found for current user');
            return null;
          }

          throw recordingError;
        }

        if (!dbRecording) {
          console.log('useRecordingDetail: Recording not found');
          return null;
        }

        console.log('useRecordingDetail: Recording found:', dbRecording);

        // Convert database record to Recording type with error handling
        let recording;
        try {
          recording = convertDatabaseToRecording(dbRecording);
        } catch (conversionError) {
          console.error('useRecordingDetail: Conversion error:', conversionError);
          // Create a minimal recording object if conversion fails
          recording = {
            id: dbRecording.id,
            user_id: dbRecording.user_id || '',
            title: dbRecording.title || 'Untitled Recording',
            file_type: dbRecording.file_type || 'audio',
            status: dbRecording.status || 'failed',
            created_at: dbRecording.created_at || new Date().toISOString(),
            updated_at: dbRecording.updated_at || new Date().toISOString()
          };
        }

        // Safely fetch speaker segments
        let speakerSegments = [];
        try {
          const { data: segments, error: speakerError } = await supabase
            .from('speaker_segments')
            .select('*')
            .eq('recording_id', recordingId)
            .order('start_time');

          if (speakerError) {
            console.warn('useRecordingDetail: Speaker segments error:', speakerError);
          } else {
            speakerSegments = segments || [];
          }
        } catch (error) {
          console.warn('useRecordingDetail: Speaker segments fetch failed:', error);
        }

        // Safely fetch topic segments
        let topicSegments = [];
        try {
          const { data: segments, error: topicError } = await supabase
            .from('topic_segments')
            .select('*')
            .eq('recording_id', recordingId)
            .order('start_time');

          if (topicError) {
            console.warn('useRecordingDetail: Topic segments error:', topicError);
          } else {
            topicSegments = segments || [];
          }
        } catch (error) {
          console.warn('useRecordingDetail: Topic segments fetch failed:', error);
        }

        // Safely fetch AI moments
        let aiMoments = [];
        try {
          const { data: moments, error: momentsError } = await supabase
            .from('ai_moments')
            .select('*')
            .eq('recording_id', recordingId)
            .order('start_time');

          if (momentsError) {
            console.warn('useRecordingDetail: AI moments error:', momentsError);
          } else {
            aiMoments = moments || [];
          }
        } catch (error) {
          console.warn('useRecordingDetail: AI moments fetch failed:', error);
        }

        // Helper function to parse timestamp to seconds
        const parseTimeToSeconds = (timestamp: string | number): number => {
          if (!timestamp) return 0;
          
          // If it's already a number, return it
          if (typeof timestamp === 'number') return timestamp;
          
          try {
            // Handle formats like "00:01:30" or "1:30" 
            const parts = timestamp.split(':').map(Number);
            if (parts.length === 3) {
              return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
            } else if (parts.length === 2) {
              return parts[0] * 60 + parts[1]; // minutes:seconds
            }
            return 0;
          } catch {
            return 0;
          }
        };

        // Helper function to transform JSON ai_moments to expected format
        const transformAIMoments = (jsonMoments: any): any[] => {
          console.log('🔄 Transforming AI moments:', jsonMoments);
          
          try {
            if (!jsonMoments) {
              console.log('❌ No AI moments data provided');
              return [];
            }
            
            // If it's already an array, transform it
            if (Array.isArray(jsonMoments)) {
              console.log(`📊 Processing ${jsonMoments.length} AI moments from array`);
              
              const transformed = jsonMoments.map((moment: any, index: number) => {
                const startTime = parseTimeToSeconds(moment.timestamp || moment.start_time);
                console.log(`  - Moment ${index + 1}: ${moment.type} at ${moment.timestamp} (${startTime}s) - ${moment.title || moment.tooltip}`);
                
                return {
                  id: moment.id || `moment_${Date.now()}_${index}`,
                  type: moment.type || 'bookmark',
                  start_time: startTime,
                  end_time: moment.end_time || undefined,
                  label: moment.label || moment.title || undefined,
                  tooltip: moment.tooltip || moment.description || moment.title || 'AI detected moment'
                };
              });
              
              console.log('✅ Transformed AI moments:', transformed);
              return transformed;
            }
            
            // If it's an object with moments array
            if (jsonMoments.moments && Array.isArray(jsonMoments.moments)) {
              console.log(`📊 Processing ${jsonMoments.moments.length} AI moments from object.moments`);
              
              const transformed = jsonMoments.moments.map((moment: any, index: number) => {
                const startTime = parseTimeToSeconds(moment.timestamp || moment.start_time);
                console.log(`  - Moment ${index + 1}: ${moment.type} at ${moment.timestamp} (${startTime}s) - ${moment.title || moment.tooltip}`);
                
                return {
                  id: moment.id || `moment_${Date.now()}_${index}`,
                  type: moment.type || 'bookmark', 
                  start_time: startTime,
                  end_time: moment.end_time || undefined,
                  label: moment.label || moment.title || undefined,
                  tooltip: moment.tooltip || moment.description || moment.title || 'AI detected moment'
                };
              });
              
              console.log('✅ Transformed AI moments:', transformed);
              return transformed;
            }
            
            console.log('❌ AI moments data is not in expected format:', typeof jsonMoments, jsonMoments);
            return [];
          } catch (error) {
            console.error('❌ Error transforming AI moments:', error);
            return [];
          }
        };

        // Transform JSON ai_moments to the expected format
        const transformedAIMoments = transformAIMoments(recording.ai_moments);

        // Determine employee participation status
        let participationCount = 0;
        try {
          const { count: partCount } = await supabase
            .from('employee_call_participation')
            .select('id', { count: 'exact', head: true })
            .eq('recording_id', recording.id || recordingId);
          participationCount = typeof partCount === 'number' ? partCount : 0;
        } catch (partErr) {
          console.warn('useRecordingDetail: participation count failed:', partErr);
        }

        const statusForPending = (recording.status || '').toLowerCase();
        const employeeLinkingPending = participationCount === 0 && (
          statusForPending === 'completed' ||
          statusForPending === 'transcribed' ||
          statusForPending === 'processing' ||
          Boolean(recording.transcript)
        );

        // Transform the data with enhanced safety checks
        const transformedData: RecordingDetailData = {
          id: recording.id || recordingId,
          user_id: recording.user_id || user.id,
          title: recording.title || 'Untitled Recording',
          description: recording.description || undefined,
          file_url: recording.file_url || undefined,
          file_type: recording.file_type || 'audio',
          file_size: typeof recording.file_size === 'number' ? recording.file_size : undefined,
          duration: typeof recording.duration === 'number' ? recording.duration : undefined,
          status: recording.status || 'failed',
          transcript: typeof recording.transcript === 'string' ? recording.transcript : undefined,
          summary: typeof recording.summary === 'string' ? recording.summary : undefined,
          ai_summary: typeof recording.ai_summary === 'string' ? recording.ai_summary : undefined,
          ai_insights: recording.ai_insights || undefined,
          ai_moments: transformedAIMoments.length > 0 ? transformedAIMoments : null,
          ai_next_steps: recording.ai_next_steps || undefined,
          ai_speaker_analysis: null, // This field doesn't exist in current schema
          coaching_evaluation: recording.coaching_evaluation || undefined,
          content_type: recording.content_type || undefined,
          thumbnail_url: recording.thumbnail_url || undefined,
          enable_coaching: Boolean(recording.enable_coaching),
          created_at: recording.created_at || new Date().toISOString(),
          updated_at: recording.updated_at || new Date().toISOString(),
          ai_generated_at: recording.ai_generated_at || undefined,
          employee_participation_count: participationCount,
          employee_linking_pending: employeeLinkingPending,
          // Related data with safe array handling
          speaker_segments: Array.isArray(speakerSegments) ? speakerSegments : [],
          topic_segments: Array.isArray(topicSegments) ? topicSegments : [],
          ai_moments_data: Array.isArray(aiMoments) ? aiMoments : [],
          // Helper flags with safe evaluation
          hasAIData: Boolean(
            recording.ai_summary || 
            recording.summary || 
            safeArrayLength(speakerSegments) > 0 ||
            transformedAIMoments.length > 0
          ),
          isUsingInstantAnalysis: Boolean(recording.ai_generated_at)
        };

        console.log('useRecordingDetail: Transformed data:', transformedData);
        return transformedData;

      } catch (error) {
        console.error('useRecordingDetail: Unexpected error:', error);
        throw error;
      }
    },
    enabled: !!recordingId && !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: (query) => {
      try {
        const data = query.state.data;

        // If data is null (recording not found), don't poll
        if (data === null) {
          console.log('🔄 Polling: Recording not found, stopping polling');
          return false;
        }

        // Enhanced safety checks with detailed logging
        if (!validateRecordingData(data)) {
          console.log('🔄 Polling: Invalid or missing data, stopping polling');
          return false;
        }

        const status = data.status;
        const recordingId = data.id;
        
        if (!status || !recordingId) {
          console.log('🔄 Polling: Missing status or recordingId, stopping');
          return false;
        }
        
        // Track polling attempts to prevent infinite loops with enhanced safety
        const pollKey = `poll_${recordingId}`;
        let pollCount = 0;
        
        try {
          const storedCount = sessionStorage.getItem(pollKey);
          pollCount = storedCount ? parseInt(storedCount, 10) : 0;
          if (isNaN(pollCount) || pollCount < 0) {
            pollCount = 0;
          }
        } catch (storageError) {
          console.warn('🔄 Polling: Session storage error, resetting count:', storageError);
          pollCount = 0;
        }
        
        const MAX_POLLS = 60; // Maximum 10 minutes of polling (60 * 10s)
        
        // Safety: Stop polling after maximum attempts
        if (pollCount >= MAX_POLLS) {
          console.warn(`🚫 Polling: Maximum attempts reached (${MAX_POLLS}) for recording ${recordingId}, stopping`);
          try {
            sessionStorage.removeItem(pollKey);
          } catch (storageError) {
            console.warn('🔄 Polling: Failed to clear session storage:', storageError);
          }
          return false;
        }
        
        // Check if recording is still processing
        const processingStatuses = ['uploading', 'processing', 'processing_large_file', 'transcribing'];
        
        if (processingStatuses.includes(status)) {
          pollCount++;
          try {
            sessionStorage.setItem(pollKey, pollCount.toString());
          } catch (storageError) {
            console.warn('🔄 Polling: Failed to update session storage:', storageError);
          }
          console.log(`🔄 Polling: Status "${status}", attempt ${pollCount}/${MAX_POLLS}, continuing`);
          return 10000; // Poll every 10 seconds only while processing
        }
        
        // For completed recordings, check AI data completion with safe array access
        const hasAIData = Boolean(
          data.ai_summary || 
          data.summary || 
          safeArrayLength(data.speaker_segments) > 0 ||
          safeArrayLength(data.topic_segments) > 0 ||
          safeArrayLength(data.ai_moments_data) > 0
        );
        
        if (status === 'completed' && !hasAIData) {
          // Allow a few quick polls for AI data after completion
          const quickPollKey = `quick_poll_${recordingId}`;
          let quickPollCount = 0;
          
          try {
            const storedQuickCount = sessionStorage.getItem(quickPollKey);
            quickPollCount = storedQuickCount ? parseInt(storedQuickCount, 10) : 0;
            if (isNaN(quickPollCount) || quickPollCount < 0) {
              quickPollCount = 0;
            }
          } catch (storageError) {
            console.warn('🔄 Quick polling: Session storage error, resetting count:', storageError);
            quickPollCount = 0;
          }
          
          const MAX_QUICK_POLLS = 6; // Maximum 30 seconds of quick polling (6 * 5s)
          
          if (quickPollCount < MAX_QUICK_POLLS) {
            quickPollCount++;
            try {
              sessionStorage.setItem(quickPollKey, quickPollCount.toString());
            } catch (storageError) {
              console.warn('🔄 Quick polling: Failed to update session storage:', storageError);
            }
            console.log(`🔄 Quick polling: Waiting for AI data, attempt ${quickPollCount}/${MAX_QUICK_POLLS}`);
            return 5000; // Quick poll for AI data if just completed
          } else {
            console.log('🔄 Quick polling: Maximum attempts reached, stopping');
            try {
              sessionStorage.removeItem(quickPollKey);
              sessionStorage.removeItem(pollKey);
            } catch (storageError) {
              console.warn('🔄 Quick polling: Failed to clear session storage:', storageError);
            }
            return false;
          }
        }
        
        // Stop polling for completed recordings with AI data or failed recordings
        if (status === 'completed' || status === 'failed' || status === 'transcription_failed') {
          console.log(`🔄 Polling: Recording ${status} with AI data: ${hasAIData}, stopping`);
          try {
            sessionStorage.removeItem(pollKey);
            sessionStorage.removeItem(`quick_poll_${recordingId}`);
          } catch (storageError) {
            console.warn('🔄 Polling: Failed to clear session storage:', storageError);
          }
          return false;
        }
        
        // Fallback: stop polling for unknown statuses
        console.log(`🔄 Polling: Unknown status "${status}", stopping`);
        return false;
        
      } catch (error) {
        console.error('🔥 RefetchInterval error in useRecordingDetail:', error);
        // Clear any problematic session storage
        try {
          const keys = Object.keys(sessionStorage);
          keys.forEach(key => {
            if (key.startsWith('poll_') || key.startsWith('quick_poll_')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (clearError) {
          console.warn('Failed to clear problematic session storage:', clearError);
        }
        return false; // Stop polling on errors to prevent infinite loops
      }
    },
    retry: (failureCount, error: any) => {
      console.log('useRecordingDetail: Retry attempt', failureCount, 'for error:', error);
      if (failureCount >= 3) return false;
      if (error?.message?.includes('JWT') || error?.message?.includes('auth')) return false;
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
