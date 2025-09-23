import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import type { Json } from '@/integrations/supabase/types';

export interface SentimentMoment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  text: string;
  speaker?: string;
  intensity: number;
  created_at: string;
}

export interface EmotionalTrend {
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intensity: number;
}

export interface SpeakerSentiment {
  speaker: string;
  averageSentiment: number;
  emotionalRange: number;
  dominantEmotion: string;
  moments: SentimentMoment[];
}

export interface SentimentInsights {
  overallTone: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotionalVolatility: number;
  keyMoments: SentimentMoment[];
  speakerBreakdown: SpeakerSentiment[];
  recommendations: string[];
  riskFlags: string[];
}

/**
 * Enhanced Sentiment Analysis Hook V2 - Nuclear Option
 * Completely rewritten to eliminate null pointer errors
 */
export function useSentimentAnalysisV2(recordingId?: string) {
  const { user } = useAuth();
  const [sentimentData, setSentimentData] = useState<SentimentMoment[]>([]);
  const [insights, setInsights] = useState<SentimentInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate insights from sentiment data
  const generateSentimentInsights = (moments: SentimentMoment[], recording: any): SentimentInsights => {
    const positiveMoments = moments.filter(m => m.sentiment === 'positive');
    const negativeMoments = moments.filter(m => m.sentiment === 'negative');
    
    // Determine overall tone
    let overallTone: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
    if (positiveMoments.length > negativeMoments.length * 1.5) {
      overallTone = 'positive';
    } else if (negativeMoments.length > positiveMoments.length * 1.5) {
      overallTone = 'negative';
    } else if (positiveMoments.length > 0 && negativeMoments.length > 0) {
      overallTone = 'mixed';
    }

    // Calculate emotional volatility
    const sentimentValues = moments.map(m => 
      m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0
    );
    const volatility = calculateVolatility(sentimentValues);

    // Get key moments (highest intensity)
    const keyMoments = moments
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);

    // Group by speaker
    const speakerGroups = moments.reduce((acc, moment) => {
      const speaker = moment.speaker || 'Unknown';
      if (!acc[speaker]) acc[speaker] = [];
      acc[speaker].push(moment);
      return acc;
    }, {} as Record<string, SentimentMoment[]>);

    const speakerBreakdown: SpeakerSentiment[] = Object.entries(speakerGroups).map(([speaker, moments]) => {
      const avgSentiment = moments.reduce((sum, m) => 
        sum + (m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0), 0) / moments.length;
      
      return {
        speaker,
        averageSentiment: avgSentiment,
        emotionalRange: Math.max(...moments.map(m => m.intensity)) - Math.min(...moments.map(m => m.intensity)),
        dominantEmotion: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
        moments
      };
    });

    // Generate recommendations and risk flags
    const recommendations: string[] = [];
    const riskFlags: string[] = [];

    if (overallTone === 'negative') {
      recommendations.push('Consider addressing customer concerns more proactively');
      riskFlags.push('Overall negative sentiment detected');
    }

    if (volatility > 0.5) {
      recommendations.push('Work on maintaining consistent emotional tone');
      riskFlags.push('High emotional volatility detected');
    }

    // Check coaching evaluation for additional context
    if (recording.coaching_evaluation) {
      try {
        const evaluation = typeof recording.coaching_evaluation === 'string' 
          ? JSON.parse(recording.coaching_evaluation)
          : recording.coaching_evaluation;
        
        if (evaluation && typeof evaluation === 'object' && 'overallScore' in evaluation) {
          const score = evaluation.overallScore;
          if (typeof score === 'number' && score < 60) {
            riskFlags.push('Low coaching score correlates with sentiment issues');
          }
        }
      } catch (e) {
        console.warn('Could not parse coaching evaluation:', e);
      }
    }

    return {
      overallTone,
      emotionalVolatility: volatility,
      keyMoments,
      speakerBreakdown,
      recommendations,
      riskFlags
    };
  };

  // Calculate volatility of sentiment values
  const calculateVolatility = (values: number[]): number => {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  // Fetch AI-generated sentiment data from database
  const fetchSentimentData = useCallback(async () => {
    if (!recordingId || recordingId === 'undefined' || recordingId === 'null' || recordingId.trim() === '' || !user) {
      console.log('🚫 useSentimentAnalysisV2: Invalid recording ID or no user for fetch:', recordingId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('ai_moments, coaching_evaluation')
        .eq('id', recordingId)
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      if (data?.ai_moments) {
        const moments = Array.isArray(data.ai_moments) ? data.ai_moments : [];
        setSentimentData(moments);
        setInsights(generateSentimentInsights(moments, data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [recordingId, user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchSentimentData();
  }, [fetchSentimentData]);

  // Setup real-time updates with NUCLEAR SAFETY
  useEffect(() => {
    // FIRST CHECK: Exit early if no recording ID or invalid ID
    if (!recordingId || recordingId === 'undefined' || recordingId === 'null' || recordingId.trim() === '') {
      console.log('🚫 useSentimentAnalysisV2: Invalid or missing recording ID:', recordingId);
      return;
    }

    // SECOND CHECK: Exit early if realtime is disabled via environment variable
    if (import.meta.env.VITE_DISABLE_REALTIME === 'true') {
      console.log('🚫 useSentimentAnalysisV2: Realtime disabled via environment variable');
      return;
    }

    // THIRD CHECK: Exit early if no user
    if (!user) {
      console.log('🚫 useSentimentAnalysisV2: No user authenticated');
      return;
    }

    const channelName = `recording_${recordingId}`;
    let channel: any = null;
    let cleanupPerformed = false;
    let isSubscribed = false;

    // Wrapped in try-catch to handle ANY possible errors
    try {
      console.log(`🔄 useSentimentAnalysisV2: Creating safe channel for recording ${recordingId}`);
      
      // FOURTH CHECK: Create channel safely
      channel = createSafeChannel(channelName);
      
      // FIFTH CHECK: Validate channel exists
      if (!channel) {
        console.log('🚫 useSentimentAnalysisV2: Channel creation returned null - exiting safely');
        return;
      }

      // SIXTH CHECK: Validate channel is an object
      if (typeof channel !== 'object') {
        console.log('🚫 useSentimentAnalysisV2: Channel is not an object - exiting safely');
        return;
      }

      // SEVENTH CHECK: Validate channel has 'on' method
      if (typeof channel.on !== 'function') {
        console.log('🚫 useSentimentAnalysisV2: Channel missing "on" method - exiting safely');
        return;
      }

      // EIGHTH CHECK: Validate channel has 'subscribe' method
      if (typeof channel.subscribe !== 'function') {
        console.log('🚫 useSentimentAnalysisV2: Channel missing "subscribe" method - exiting safely');
        return;
      }

      console.log('✅ useSentimentAnalysisV2: All safety checks passed, setting up subscription');

      // NOW it's safe to use the channel
      const subscription = channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `id=eq.${recordingId}`
        }, (payload: any) => {
          console.log('📡 useSentimentAnalysisV2: Received realtime update', payload);
          
          if (payload.new) {
            const newRecording = payload.new;
            if (newRecording.ai_moments?.length) {
              setSentimentData(newRecording.ai_moments);
              setInsights(generateSentimentInsights(newRecording.ai_moments, newRecording));
            }
          }
        });

      // Only subscribe if we have a valid subscription
      if (subscription && typeof subscription.subscribe === 'function') {
        subscription.subscribe();
        isSubscribed = true;
        console.log('✅ useSentimentAnalysisV2: Subscription created successfully');
      }

    } catch (error) {
      console.error('❌ useSentimentAnalysisV2: Error during channel setup:', error);
      // Don't throw, just log and continue
    }

    // Cleanup function with maximum safety
    return () => {
      if (cleanupPerformed) return;
      cleanupPerformed = true;
      
      try {
        if (isSubscribed) {
          console.log('🧹 useSentimentAnalysisV2: Cleaning up channel');
          removeChannel(channelName);
        }
      } catch (cleanupError) {
        console.warn('⚠️ useSentimentAnalysisV2: Cleanup error (non-fatal):', cleanupError);
      }
    };
  }, [recordingId, user]);

  return {
    moments: sentimentData,
    insights,
    isLoading: loading,
    error,
    isGenerating,
    refresh: fetchSentimentData
  };
}