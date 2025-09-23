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

export function useSentimentAnalysis(recordingId?: string) {
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
    if (!recordingId || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data: recording, error: recordingError } = await supabase
        .from('recordings')
        .select('id, user_id, transcript, coaching_evaluation, ai_moments, ai_speaker_analysis')
        .eq('id', recordingId)
        .eq('user_id', user.id)
        .single();

      if (recordingError) throw recordingError;

      // Ensure ai_moments is always an array, handle various data types
      const aiMoments = Array.isArray(recording.ai_moments) 
        ? recording.ai_moments 
        : recording.ai_moments && typeof recording.ai_moments === 'object' && recording.ai_moments !== null
          ? Object.values(recording.ai_moments).filter(Boolean)
          : [];

      if (aiMoments.length > 0) {
        setSentimentData(aiMoments);
        setInsights(generateSentimentInsights(aiMoments, recording));
      } else {
        // If no AI moments exist, trigger analysis using Edge Function
        setIsGenerating(true);
        
        try {
          console.log('Invoking analyze-speakers-topics edge function for recording:', recordingId);
          
          const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-speakers-topics', {
            body: {
              recording_id: recordingId,
              transcript: recording.transcript
            }
          });

          console.log('Edge function response:', { analysisResult, analysisError });

          if (analysisError) {
            console.error('Edge function error details:', {
              message: analysisError.message,
              context: analysisError.context,
              details: analysisError.details,
              stack: analysisError.stack
            });
            
            // Provide more specific error messages based on error type
            let userFriendlyError = 'Edge function error: ';
            if (analysisError.message?.includes('configuration missing')) {
              userFriendlyError += 'AI service configuration is incomplete. Please contact support.';
            } else if (analysisError.message?.includes('Rate limit')) {
              userFriendlyError += 'AI service is temporarily busy. Please try again in a few moments.';
            } else if (analysisError.message?.includes('timeout')) {
              userFriendlyError += 'Analysis took too long. Please try again with a shorter recording.';
            } else if (analysisError.message?.includes('Authentication failed')) {
              userFriendlyError += 'AI service authentication failed. Please contact support.';
            } else {
              userFriendlyError += analysisError.message || 'Unknown error occurred';
            }
            
            throw new Error(userFriendlyError);
          }
          
          // After analysis, fetch the updated AI moments
          const { data: moments, error: fetchError } = await supabase
            .from('ai_moments')
            .select('*')
            .eq('recording_id', recordingId)
            .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment'])
            .order('start_time', { ascending: true });

          if (fetchError) {
            console.error('Failed to fetch AI moments after analysis:', fetchError);
            throw new Error(`Failed to fetch analysis results: ${fetchError.message}`);
          }
          
          if (moments?.length) {
            console.log(`Successfully loaded ${moments.length} sentiment moments`);
            setSentimentData(moments);
            setInsights(generateSentimentInsights(moments, recording));
          } else {
            console.log('No sentiment moments were generated from analysis');
            // Set empty data but continue - the analytics panel will show fallback analysis
            setSentimentData([]);
            setInsights(generateSentimentInsights([], recording));
          }
        } catch (error) {
          console.error('Sentiment analysis failed:', error);
          
          // Enhance error message with debugging info
          const enhancedError = error instanceof Error 
            ? error.message 
            : 'Unknown error occurred during sentiment analysis';
          
          throw new Error(enhancedError);
        } finally {
          setIsGenerating(false);
        }
      }
    } catch (err) {
      setError(err.message);
      setIsGenerating(false);
    } finally {
      setLoading(false);
    }
  }, [recordingId, user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchSentimentData();
  }, [fetchSentimentData]);

  // Setup real-time updates
  useEffect(() => {
    if (!recordingId) return;

    const channel = createSafeChannel(`recording_${recordingId}`);
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recordings',
        filter: `id=eq.${recordingId}`
      }, (payload) => {
        if (payload.new) {
          const newRecording = payload.new;
          // Ensure ai_moments is always an array for real-time updates
          const aiMoments = Array.isArray(newRecording.ai_moments) 
            ? newRecording.ai_moments 
            : newRecording.ai_moments && typeof newRecording.ai_moments === 'object' && newRecording.ai_moments !== null
              ? Object.values(newRecording.ai_moments).filter(Boolean)
              : [];
          
          if (aiMoments.length > 0) {
            setSentimentData(aiMoments);
            setInsights(generateSentimentInsights(aiMoments, newRecording));
          }
        }
      })
      .subscribe();

    return () => {
      removeChannel(channel);
    };
  }, [recordingId]);

  return {
    moments: sentimentData,
    insights,
    isLoading: loading,
    error,
    isGenerating,
    refresh: fetchSentimentData
  };
}
