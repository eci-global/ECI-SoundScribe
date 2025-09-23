import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateCoachingOptions {
  silent?: boolean;
}

export function useGenerateCoaching() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCoaching = async (recordingId: string, options: GenerateCoachingOptions = {}) => {
    if (!recordingId) {
      if (!options.silent) {
        toast.error('Recording ID is required');
      }
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Starting coaching generation for recording:', recordingId);
      
      if (!options.silent) {
        toast.loading('Generating AI coaching analysis...', { id: 'coaching-generation' });
      }

      const { data, error } = await supabase.functions.invoke('generate-coaching', {
        body: { 
          recording_id: recordingId,
          options 
        },
      });

      if (error) {
        console.error('Coaching generation error:', error);
        
        // Handle specific error types
        if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
          if (!options.silent) {
            toast.error('OpenAI rate limit reached. Please wait a few minutes and try again.', { 
              id: 'coaching-generation',
              duration: 8000 
            });
          }
          throw new Error('Rate limit exceeded');
        } else if (error.message?.includes('transcript')) {
          if (!options.silent) {
            toast.error('No transcript available. Please process the recording first.', { 
              id: 'coaching-generation' 
            });
          }
          throw new Error('No transcript available');
        } else if (error.message?.includes('CORS') || error.message?.includes('cors')) {
          if (!options.silent) {
            toast.error('CORS error. Please check your Supabase configuration.', { 
              id: 'coaching-generation',
              duration: 8000 
            });
          }
          throw new Error('CORS configuration error');
        } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          if (!options.silent) {
            toast.error('Request timed out. Please try again with a shorter recording.', { 
              id: 'coaching-generation',
              duration: 8000 
            });
          }
          throw new Error('Request timeout');
        } else {
          if (!options.silent) {
            toast.error(error.message || 'Failed to generate coaching analysis', { 
              id: 'coaching-generation' 
            });
          }
          throw error;
        }
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error occurred';
        console.error('Coaching generation failed:', errorMsg);
        
        if (!options.silent) {
          if (errorMsg.includes('rate limit') || errorMsg.includes('Rate limit')) {
            toast.error('OpenAI rate limit reached. Please wait and try again.', { 
              id: 'coaching-generation',
              duration: 8000 
            });
          } else {
            toast.error(errorMsg, { id: 'coaching-generation' });
          }
        }
        throw new Error(errorMsg);
      }

      console.log('Coaching generation successful:', data);
      
      if (!options.silent) {
        toast.success('AI coaching analysis generated successfully!', { 
          id: 'coaching-generation' 
        });
      }

      return data.coaching_evaluation;

    } catch (error) {
      console.error('Generate coaching error:', error);
      
      if (!options.silent) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate coaching analysis';
        toast.error(errorMessage, { id: 'coaching-generation' });
      }
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateCoaching,
    isGenerating,
  };
}
