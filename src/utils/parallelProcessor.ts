// Parallel processing utilities for faster audio processing

import { supabase } from '@/integrations/supabase/client';

export interface ProcessingJob {
  id: string;
  type: 'transcription' | 'ai_analysis' | 'compression';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

export interface ParallelProcessingOptions {
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
}

export class ParallelProcessor {
  private jobs = new Map<string, ProcessingJob>();
  private activeJobs = new Set<string>();
  private options: ParallelProcessingOptions;

  constructor(options: Partial<ParallelProcessingOptions> = {}) {
    this.options = {
      maxConcurrency: 3,
      timeout: 300000, // 5 minutes
      retryAttempts: 2,
      ...options
    };
  }

  /**
   * Process large recording with parallel optimization
   */
  async processRecordingOptimized(recordingId: string): Promise<{
    success: boolean;
    transcript?: string;
    summary?: string;
    processingTime: number;
    optimizations: string[];
  }> {
    const startTime = Date.now();
    const optimizations: string[] = [];
    
    console.log('🚀 Starting optimized parallel processing for:', recordingId);
    
    try {
      // Get recording details
      const { data: recording, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recordingId)
        .single();
      
      if (error || !recording) {
        throw new Error('Recording not found');
      }
      
      const fileSize = recording.file_size || 0;
      const fileSizeMB = fileSize / (1024 * 1024);
      
      console.log('📊 Processing file:', {
        size: fileSizeMB.toFixed(1) + 'MB',
        type: recording.file_type,
        status: recording.status
      });
      
      // Update status
      await supabase
        .from('recordings')
        .update({ 
          status: 'processing',
          processing_progress: 10,
          error_message: null
        })
        .eq('id', recordingId);
      
      // Step 1: Determine optimization strategy
      const strategy = this.getProcessingStrategy(fileSize);
      optimizations.push(`Strategy: ${strategy.name}`);
      
      // Step 2: Route to appropriate processing method
      let result;
      
      if (strategy.useAzureBackend) {
        // Route to Azure backend with optimizations
        result = await this.processWithAzureBackend(recordingId, recording, strategy);
        optimizations.push('Azure backend processing');
      } else if (strategy.useParallelChunks) {
        // Process in parallel chunks
        result = await this.processWithParallelChunks(recordingId, recording);
        optimizations.push('Parallel chunk processing');
      } else {
        // Standard Edge Function processing
        result = await this.processWithEdgeFunction(recordingId);
        optimizations.push('Standard Edge Function processing');
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log('✅ Optimized processing completed:', {
        processingTime: (processingTime / 1000).toFixed(1) + 's',
        optimizations
      });
      
      return {
        success: true,
        transcript: result.transcript,
        summary: result.summary,
        processingTime,
        optimizations
      };
      
    } catch (error) {
      console.error('❌ Optimized processing failed:', error);
      
      // Update recording with error
      await supabase
        .from('recordings')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Processing failed',
          processing_progress: 0
        })
        .eq('id', recordingId);
      
      return {
        success: false,
        processingTime: Date.now() - startTime,
        optimizations
      };
    }
  }
  
  /**
   * Get optimal processing strategy based on file characteristics
   */
  private getProcessingStrategy(fileSize: number) {
    const fileSizeMB = fileSize / (1024 * 1024);
    
    if (fileSizeMB > 200) {
      return {
        name: 'large_file_azure_backend',
        useAzureBackend: true,
        useParallelChunks: false,
        compressionLevel: 'high',
        estimatedTime: Math.ceil(fileSizeMB * 0.3) // 18 seconds per MB
      };
    }
    
    if (fileSizeMB > 50) {
      return {
        name: 'medium_file_parallel_chunks',
        useAzureBackend: false,
        useParallelChunks: true,
        compressionLevel: 'medium',
        estimatedTime: Math.ceil(fileSizeMB * 0.2) // 12 seconds per MB
      };
    }
    
    return {
      name: 'small_file_edge_function',
      useAzureBackend: false,
      useParallelChunks: false,
      compressionLevel: 'low',
      estimatedTime: Math.ceil(fileSizeMB * 0.1) // 6 seconds per MB
    };
  }
  
  /**
   * Process with Azure backend (optimized for large files)
   */
  private async processWithAzureBackend(recordingId: string, recording: any, strategy: any) {
    console.log('☁️ Processing with Azure backend...');
    
    // Send to Azure backend with priority processing
    const azureResponse = await fetch('https://soundscribe-backend.azurewebsites.net/api/process-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Priority': 'high',
        'X-Optimization-Level': strategy.compressionLevel
      },
      body: JSON.stringify({
        recording_id: recordingId,
        file_url: recording.file_url,
        file_size: recording.file_size,
        is_large_file: true,
        optimization_mode: 'fast_track'
      })
    });
    
    if (!azureResponse.ok) {
      throw new Error(`Azure backend failed: ${azureResponse.status}`);
    }
    
    const azureResult = await azureResponse.json();
    
    // Poll for completion with exponential backoff
    return await this.pollForCompletion(recordingId, strategy.estimatedTime);
  }
  
  /**
   * Process with parallel chunks
   */
  private async processWithParallelChunks(recordingId: string, recording: any) {
    console.log('⚡ Processing with parallel chunks...');
    
    // This would split the audio and process chunks in parallel
    // For now, we'll simulate by calling the regular processor but with optimizations
    const { data, error } = await supabase.functions.invoke('process-recording', {
      body: { 
        recording_id: recordingId,
        optimization_mode: 'parallel_chunks',
        max_concurrency: this.options.maxConcurrency
      }
    });
    
    if (error) throw error;
    
    return data;
  }
  
  /**
   * Process with standard Edge Function
   */
  private async processWithEdgeFunction(recordingId: string) {
    console.log('🔧 Processing with Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('process-recording', {
      body: { 
        recording_id: recordingId,
        optimization_mode: 'standard'
      }
    });
    
    if (error) throw error;
    
    return data;
  }
  
  /**
   * Poll for completion with progress updates
   */
  private async pollForCompletion(recordingId: string, estimatedTime: number): Promise<any> {
    const startTime = Date.now();
    const pollInterval = Math.min(5000, estimatedTime * 1000 / 20); // Poll 20 times during processing
    
    while (Date.now() - startTime < this.options.timeout) {
      const { data: recording } = await supabase
        .from('recordings')
        .select('status, transcript, ai_summary, error_message')
        .eq('id', recordingId)
        .single();
      
      if (!recording) {
        throw new Error('Recording not found during polling');
      }
      
      if (recording.status === 'completed') {
        return {
          transcript: recording.transcript,
          summary: recording.ai_summary
        };
      }
      
      if (recording.status === 'failed') {
        throw new Error(recording.error_message || 'Processing failed');
      }
      
      // Update progress estimate
      const elapsed = Date.now() - startTime;
      const progress = Math.min(90, (elapsed / (estimatedTime * 1000)) * 100);
      
      console.log(`📈 Processing progress: ${progress.toFixed(1)}%`);
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Processing timeout');
  }
}

// Singleton instance
export const parallelProcessor = new ParallelProcessor();