import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/recording';

export interface CoachingGenerationResult {
  success: boolean;
  coaching_evaluation?: any;
  error?: string;
}

export class CoachingService {
  
  /**
   * Generate coaching evaluation for a recording using the edge function
   */
  static async generateCoaching(
    recordingId: string, 
    onProgress?: (message: string, elapsed: number) => void
  ): Promise<CoachingGenerationResult> {
    const startTime = Date.now();
    
    const updateProgress = (message: string) => {
      const elapsed = Date.now() - startTime;
      onProgress?.(message, elapsed);
      console.log(`Coaching Generation [${elapsed}ms]: ${message}`);
    };

    try {
      updateProgress('Starting coaching generation...');
      
      // First, check if we have the necessary data
      updateProgress('Fetching recording data...');
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('transcript, coaching_evaluation')
        .eq('id', recordingId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch recording: ${fetchError.message}`
        };
      }

      if (!recording?.transcript) {
        return {
          success: false,
          error: 'No transcript available for coaching analysis'
        };
      }

      if (recording.coaching_evaluation) {
        updateProgress('Coaching evaluation already exists');
        return {
          success: true,
          coaching_evaluation: recording.coaching_evaluation
        };
      }

      updateProgress('Calling Azure OpenAI for analysis...');
      const { data, error } = await supabase.functions.invoke('generate-coaching', {
        body: { recording_id: recordingId }
      });

      if (error) {
        console.error('Coaching generation error:', error);
        return {
          success: false,
          error: error.message || 'Failed to generate coaching evaluation'
        };
      }

      if (data?.coaching_evaluation) {
        updateProgress('Coaching evaluation generated successfully');
        return {
          success: true,
          coaching_evaluation: data.coaching_evaluation
        };
      }

      return {
        success: false,
        error: 'No coaching evaluation returned from service'
      };
    } catch (error) {
      console.error('Unexpected error during coaching generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if coaching evaluation exists for a recording
   */
  static async hasCoachingEvaluation(recordingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('coaching_evaluation')
        .eq('id', recordingId)
        .single();

      if (error) {
        console.error('Error checking coaching evaluation:', error);
        return false;
      }

      return !!data?.coaching_evaluation;
    } catch (error) {
      console.error('Unexpected error checking coaching evaluation:', error);
      return false;
    }
  }

  /**
   * Get coaching evaluation for a recording
   */
  static async getCoachingEvaluation(recordingId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('coaching_evaluation')
        .eq('id', recordingId)
        .single();

      if (error) {
        console.error('Error fetching coaching evaluation:', error);
        return null;
      }

      return data?.coaching_evaluation || null;
    } catch (error) {
      console.error('Unexpected error fetching coaching evaluation:', error);
      return null;
    }
  }

  /**
   * Auto-generate coaching for recordings that have transcripts but no coaching evaluation
   */
  static async autoGenerateCoachingForRecording(recording: Recording): Promise<CoachingGenerationResult> {
    // Only generate if transcript exists and coaching is enabled
    if (!recording.transcript) {
      return {
        success: false,
        error: 'No transcript available for coaching analysis'
      };
    }

    if (recording.enable_coaching === false) {
      return {
        success: false,
        error: 'Coaching is disabled for this recording'
      };
    }

    if (recording.coaching_evaluation) {
      return {
        success: true,
        coaching_evaluation: recording.coaching_evaluation
      };
    }

    return await this.generateCoaching(recording.id);
  }

  /**
   * Batch generate coaching for multiple recordings
   */
  static async batchGenerateCoaching(recordingIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < recordingIds.length; i += batchSize) {
      const batch = recordingIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (id) => {
        const result = await this.generateCoaching(id);
        if (result.success) {
          successful.push(id);
        } else {
          failed.push({ id, error: result.error || 'Unknown error' });
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < recordingIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed };
  }
}