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
    if (!recordingId || recordingId === 'undefined' || recordingId === 'null' || recordingId.trim() === '' || !user?.id) {
      console.log('🚫 useSentimentAnalysis: Invalid recording ID or no user for fetch:', recordingId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get the recording and ensure it belongs to the current user
      const { data: recording, error: recordingError } = await supabase
        .from('recordings')
        .select('id, user_id, transcript, coaching_evaluation, ai_moments, ai_speaker_analysis')
        .eq('id', recordingId)
        .eq('user_id', user.id)
        .single();

      if (recordingError) throw recordingError;
      if (!recording) {
        throw new Error('Recording not found or access denied');
      }

      // Process sentiment data from recording.ai_moments (primary source)
      let momentsData: SentimentMoment[] = [];
      
      if (recording.ai_moments && Array.isArray(recording.ai_moments) && recording.ai_moments.length > 0) {
        // Filter and validate moments to ensure they belong to this recording
        momentsData = recording.ai_moments
          .filter((moment: any) => {
            // Ensure moment has required fields and belongs to this recording
            return moment && 
                   typeof moment === 'object' && 
                   moment.recording_id === recordingId &&
                   moment.sentiment &&
                   typeof moment.start_time === 'number';
          })
          .map((moment: any) => ({
            id: moment.id || `moment_${moment.start_time}_${Date.now()}`,
            recording_id: recordingId, // Ensure consistent recording ID
            start_time: moment.start_time,
            end_time: moment.end_time || moment.start_time + 5,
            sentiment: moment.sentiment,
            confidence: moment.confidence || 0.5,
            text: moment.text || moment.label || '',
            speaker: moment.speaker || undefined,
            intensity: moment.intensity || 0.5,
            created_at: moment.created_at || new Date().toISOString()
          }));

        if (momentsData.length > 0) {
          console.log(`[useSentimentAnalysis] Found ${momentsData.length} sentiment moments for recording ${recordingId}`);
          setSentimentData(momentsData);
          setInsights(generateSentimentInsights(momentsData, recording));
          return; // Exit early if we have data
        }
      }

      // If no AI moments exist and we have a transcript, trigger analysis
      if (!momentsData.length && recording.transcript && !isGenerating) {
        console.log(`[useSentimentAnalysis] No sentiment data found, generating analysis for recording ${recordingId}`);
        setIsGenerating(true);
        
        try {
          const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-speakers-topics', {
            body: {
              recording_id: recordingId,
              transcript: recording.transcript
            }
          });

          if (analysisError) {
            console.error('Analysis Edge Function error:', analysisError);
            throw analysisError;
          }
          
          // After analysis, re-fetch the recording to get updated ai_moments
          const { data: updatedRecording, error: refetchError } = await supabase
            .from('recordings')
            .select('id, user_id, transcript, coaching_evaluation, ai_moments, ai_speaker_analysis')
            .eq('id', recordingId)
            .eq('user_id', user.id)
            .single();

          if (refetchError) throw refetchError;
          
          if (updatedRecording?.ai_moments?.length) {
            const validatedMoments = updatedRecording.ai_moments
              .filter((moment: any) => moment?.recording_id === recordingId)
              .map((moment: any) => ({
                id: moment.id || `moment_${moment.start_time}_${Date.now()}`,
                recording_id: recordingId,
                start_time: moment.start_time,
                end_time: moment.end_time || moment.start_time + 5,
                sentiment: moment.sentiment,
                confidence: moment.confidence || 0.5,
                text: moment.text || moment.label || '',
                speaker: moment.speaker || undefined,
                intensity: moment.intensity || 0.5,
                created_at: moment.created_at || new Date().toISOString()
              }));
            
            setSentimentData(validatedMoments);
            setInsights(generateSentimentInsights(validatedMoments, updatedRecording));
          } else {
            // No sentiment data generated - this is normal for some recordings
            console.log(`[useSentimentAnalysis] No sentiment moments generated for recording ${recordingId}`);
            setSentimentData([]);
            setInsights(generateSentimentInsights([], recording));
          }
        } catch (error) {
          console.error('Sentiment analysis failed:', error);
          setError(`Failed to generate sentiment analysis: ${error.message}`);
          // Set empty data instead of throwing to prevent component crash
          setSentimentData([]);
          setInsights(generateSentimentInsights([], recording));
        } finally {
          setIsGenerating(false);
        }
      } else if (!recording.transcript) {
        // No transcript available
        console.log(`[useSentimentAnalysis] No transcript available for recording ${recordingId}`);
        setSentimentData([]);
        setInsights(generateSentimentInsights([], recording));
      } else {
        // Empty data case
        setSentimentData([]);
        setInsights(generateSentimentInsights([], recording));
      }
    } catch (err) {
      console.error('[useSentimentAnalysis] Error:', err);
      setError(err.message || 'Failed to load sentiment analysis');
      setSentimentData([]);
      setInsights(null);
      setIsGenerating(false);
    } finally {
      setLoading(false);
    }
  }, [recordingId, user?.id, isGenerating]);

  // Initial data fetch
  useEffect(() => {
    fetchSentimentData();
  }, [fetchSentimentData]);

  // Setup real-time updates
  useEffect(() => {
    if (!recordingId || !user?.id) return;

    let isSubscribed = false;
    const channelName = `sentiment_${recordingId}`;
    
    try {
      const channel = createSafeChannel(channelName);
      
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'recordings',
        filter: `id=eq.${recordingId}`
      }, (payload) => {
        console.log(`[useSentimentAnalysis] Real-time update for recording ${recordingId}`);
        
        if (payload.new && payload.new.user_id === user.id) {
          const newRecording = payload.new;
          
          // Validate and process ai_moments if they exist
          if (newRecording.ai_moments && Array.isArray(newRecording.ai_moments) && newRecording.ai_moments.length > 0) {
            // Filter moments to ensure they belong to this recording
            const validatedMoments = newRecording.ai_moments
              .filter((moment: any) => {
                return moment && 
                       typeof moment === 'object' && 
                       moment.recording_id === recordingId &&
                       moment.sentiment &&
                       typeof moment.start_time === 'number';
              })
              .map((moment: any) => ({
                id: moment.id || `moment_${moment.start_time}_${Date.now()}`,
                recording_id: recordingId,
                start_time: moment.start_time,
                end_time: moment.end_time || moment.start_time + 5,
                sentiment: moment.sentiment,
                confidence: moment.confidence || 0.5,
                text: moment.text || moment.label || '',
                speaker: moment.speaker || undefined,
                intensity: moment.intensity || 0.5,
                created_at: moment.created_at || new Date().toISOString()
              }));
            
            if (validatedMoments.length > 0) {
              console.log(`[useSentimentAnalysis] Real-time update: ${validatedMoments.length} sentiment moments`);
              setSentimentData(validatedMoments);
              setInsights(generateSentimentInsights(validatedMoments, newRecording));
            }
          } else {
            // Clear data if no moments in update
            setSentimentData([]);
            setInsights(generateSentimentInsights([], newRecording));
          }
        }
      });

      // Subscribe to the channel
      channel.subscribe();
      isSubscribed = true;
      
    } catch (error) {
      console.error(`❌ useSentimentAnalysis: Failed to setup realtime subscription for recording ${recordingId}:`, error);
      return;
    }

    return () => {
      if (isSubscribed) {
        try {
          removeChannel(channelName);
        } catch (cleanupError) {
          console.warn(`⚠️ useSentimentAnalysis: Cleanup error for recording ${recordingId}:`, cleanupError);
        }
      }
    };
  }, [recordingId, user?.id]);

  return {
    moments: sentimentData,
    insights,
    isLoading: loading,
    error,
    isGenerating,
    refresh: fetchSentimentData
  };
}
