
import { supabase } from '@/integrations/supabase/client';
import { updateRecordingStatus } from './recordingDatabase';
import { parallelProcessor } from './parallelProcessor';
import { AudioOptimizer } from './audioOptimizer';

export const processRecording = async (recordingId: string, onRecordingProcessed: () => void, showToast: (toast: any) => void) => {
  try {
    console.log('Starting optimized processing for recording:', recordingId);
    
    // Get recording details to determine optimization strategy
    const { data: recording } = await supabase
      .from('recordings')
      .select('file_size, file_type, status')
      .eq('id', recordingId)
      .single();
    
    if (recording) {
      const fileSize = recording.file_size || 0;
      const recommendations = AudioOptimizer.getOptimizationRecommendations(fileSize);
      
      console.log('🎯 Processing recommendations:', recommendations);
      
      if (recommendations.estimatedSpeedUp > 2) {
        showToast({
          title: "Optimizing for speed",
          description: `Large file detected - using ${recommendations.estimatedSpeedUp}x faster processing`
        });
      }
    }
    
    // Use optimized parallel processor
    const result = await parallelProcessor.processRecordingOptimized(recordingId);
    
    if (result.success) {
      console.log('Optimized processing completed:', {
        recordingId,
        processingTime: (result.processingTime / 1000).toFixed(1) + 's',
        optimizations: result.optimizations
      });
      
      onRecordingProcessed();
      
      showToast({
        title: "Processing complete",
        description: `Completed in ${(result.processingTime / 1000).toFixed(1)}s with ${result.optimizations.length} optimizations`
      });
    } else {
      throw new Error('Optimized processing failed');
    }
  } catch (error) {
    console.error('Failed to process recording:', error);
    
    // Update recording status to failed
    await updateRecordingStatus(recordingId, 'failed');
    
    onRecordingProcessed();
    
    showToast({
      title: "Processing failed",
      description: "There was an error processing your recording",
      variant: "destructive"
    });
  }
};
