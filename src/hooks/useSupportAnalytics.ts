import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupportSignalAnalysis } from '@/utils/supportSignals';
import { analyzeAllSupportSignals } from '@/utils/supportSignals';
import type { Recording } from '@/types/recording';

interface SupportAnalyticsResult {
  supportAnalysis: SupportSignalAnalysis | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  triggerAnalysis: () => Promise<void>;
  hasAnalysis: boolean;
  useLocalFallback: boolean;
}

export function useSupportAnalytics(recordingId: string): SupportAnalyticsResult {
  const [supportAnalysis, setSupportAnalysis] = useState<SupportSignalAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);

  const fetchSupportAnalysis = async () => {
    if (!recordingId) {
      setSupportAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching support analysis for recording:', recordingId);

      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('support_analysis, transcript, duration, title')
        .eq('id', recordingId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch recording: ${fetchError.message}`);
      }

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Store recording for potential local fallback
      setRecording(recording);

      console.log('📋 Recording found:', { 
        title: recording.title,
        hasAnalysis: !!recording.support_analysis,
        hasTranscript: !!recording.transcript,
        duration: recording.duration 
      });

      if (recording.support_analysis) {
        setSupportAnalysis(recording.support_analysis as SupportSignalAnalysis);
        setUseLocalFallback(false);
        console.log('✅ Support analysis loaded from database');
      } else if (recording.transcript) {
        // Use local fallback analysis when no database analysis exists
        console.log('📊 Using local fallback analysis');
        const localAnalysis = analyzeAllSupportSignals(recording);
        setSupportAnalysis(localAnalysis);
        setUseLocalFallback(true);
        console.log('✅ Local support analysis generated');
      } else {
        console.log('⚠️ No support analysis found and no transcript available');
        setSupportAnalysis(null);
        setUseLocalFallback(false);
      }

    } catch (err) {
      console.error('❌ Error fetching support analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch support analysis');
      setSupportAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    if (!recordingId) {
      throw new Error('No recording ID provided');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Triggering support analysis for recording:', recordingId);

      // First get the recording details
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('transcript, duration, title')
        .eq('id', recordingId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch recording: ${fetchError.message}`);
      }

      if (!recording?.transcript) {
        throw new Error('Recording must have a transcript before support analysis can be performed');
      }

      console.log('🔄 Calling analyze-support-call Edge Function...');

      // Call your existing analyze-support-call Edge Function
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
        'analyze-support-call',
        {
          body: {
            recording_id: recordingId,
            transcript: recording.transcript,
            duration: recording.duration || 0,
          },
        }
      );

      if (analysisError) {
        console.error('❌ Analysis Edge Function error:', analysisError);
        throw new Error(`Analysis failed: ${analysisError.message}`);
      }

      if (!analysisResult?.success) {
        console.error('❌ Analysis not successful:', analysisResult);
        throw new Error('Support analysis was not successful');
      }

      console.log('✅ Support analysis completed successfully');

      // The Edge Function should have updated the database, so refetch the data
      await fetchSupportAnalysis();

    } catch (err) {
      console.error('❌ Error triggering support analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger support analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription to watch for analysis updates
  useEffect(() => {
    if (!recordingId) return;

    console.log('🔄 Setting up real-time subscription for support analysis updates');

    const subscription = supabase
      .channel(`recording-support-${recordingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `id=eq.${recordingId}`,
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload.eventType);
          if (payload.new?.support_analysis) {
            console.log('📊 Support analysis updated via real-time');
            setSupportAnalysis(payload.new.support_analysis as SupportSignalAnalysis);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      subscription.unsubscribe();
    };
  }, [recordingId]);

  // Initial fetch on mount or recordingId change
  useEffect(() => {
    fetchSupportAnalysis();
  }, [recordingId]);

  return {
    supportAnalysis,
    isLoading,
    error,
    refetch: fetchSupportAnalysis,
    triggerAnalysis,
    hasAnalysis: !!supportAnalysis,
    useLocalFallback,
  };
}