import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAIMomentsReturn {
  generateAIMoments: (recordingId: string, transcript?: string) => Promise<any>;
  isGenerating: boolean;
  error: string | null;
}

export function useAIMoments(): UseAIMomentsReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAIMoments = async (recordingId: string, transcript?: string) => {
    if (!recordingId) {
      throw new Error('Recording ID is required');
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🎯 Generating AI moments for recording:', recordingId);

      const { data, error: functionError } = await supabase.functions.invoke('generate-ai-moments', {
        body: { 
          recording_id: recordingId,
          transcript: transcript
        }
      });

      if (functionError) {
        console.error('❌ AI moments generation failed:', functionError);
        throw new Error(`AI moments generation failed: ${functionError.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.message || 'AI moments generation failed');
      }

      console.log('✅ AI moments generated successfully:', {
        count: data.count,
        moments: data.moments
      });

      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error generating AI moments:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAIMoments,
    isGenerating,
    error
  };
}