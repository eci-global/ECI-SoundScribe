import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';
import { convertAiMomentsToSentiment, SENTIMENT_MOMENT_TYPES } from '@/utils/sentimentDataConverter';
import { generateSentimentInsights } from '@/utils/sentimentAnalyzer';

export const useSentimentData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch sentiment data from database
  const fetchSentimentData = useCallback(async (recordingId: string, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // First get the recording to check ownership
      const { data: recording, error: recordingError } = await supabase
        .from('recordings')
        .select('id, user_id, transcript, coaching_evaluation, ai_speaker_analysis, duration')
        .eq('id', recordingId)
        .eq('user_id', userId)
        .single();

      if (recordingError) throw recordingError;

      // Then get sentiment moments from ai_moments table
      const { data: aiMoments, error: momentsError } = await supabase
        .from('ai_moments')
        .select('*')
        .eq('recording_id', recordingId)
        .in('type', SENTIMENT_MOMENT_TYPES);

      if (momentsError) throw momentsError;

      if (aiMoments && aiMoments.length > 0) {
        const moments = convertAiMomentsToSentiment(aiMoments, recording?.duration || 300);
        const insights = generateSentimentInsights(moments, recording);
        
        return { moments, insights, recording };
      } else {
        // If no sentiment moments exist, try to generate them
        console.log('No sentiment moments found, attempting to generate...');
        setIsGenerating(true);
        
        // Try the new focused sentiment analysis first, fallback to old function
        console.log('🎯 Attempting focused sentiment analysis...');
        
        let { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'sentiment-analysis-focused',
          {
            body: { recording_id: recordingId }
          }
        );

        // If the new function fails, fallback to the old one
        if (analysisError) {
          console.log('⚠️ Focused sentiment analysis failed, falling back to analyze-speakers-topics:', analysisError);
          const fallbackResult = await supabase.functions.invoke(
            'analyze-speakers-topics',
            {
              body: { recording_id: recordingId }
            }
          );
          analysisData = fallbackResult.data;
          analysisError = fallbackResult.error;
        }

        if (analysisError) {
          console.error('Error generating sentiment analysis:', analysisError);
          setError('Failed to generate sentiment analysis');
        } else {
          console.log('Sentiment analysis generation started');
          // The real-time subscription will handle the updates
        }
        
        setIsGenerating(false);
        return { moments: [], insights: null, recording };
      }
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sentiment moments for real-time updates
  const fetchSentimentMoments = useCallback(async (recordingId: string) => {
    const { data: aiMoments, error: momentsError } = await supabase
      .from('ai_moments')
      .select('*')
      .eq('recording_id', recordingId)
      .in('type', SENTIMENT_MOMENT_TYPES);

    if (momentsError) {
      console.error('❌ Error fetching AI moments:', momentsError);
      return null;
    }

    // Also fetch the recording for context
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('id, user_id, transcript, coaching_evaluation, ai_speaker_analysis, duration')
      .eq('id', recordingId)
      .single();

    if (recordingError) {
      console.error('❌ Error fetching recording:', recordingError);
      return null;
    }

    if (aiMoments && aiMoments.length > 0) {
      const moments = convertAiMomentsToSentiment(aiMoments, recording?.duration || 300);
      const insights = generateSentimentInsights(moments, recording);
      
      return { moments, insights };
    }

    return null;
  }, []);

  return {
    loading,
    error,
    isGenerating,
    setIsGenerating,
    fetchSentimentData,
    fetchSentimentMoments
  };
};