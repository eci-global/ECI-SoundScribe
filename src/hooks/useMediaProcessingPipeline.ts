import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { transcribeAudio, generateSummary } from '@/utils/transcriptionService';
import type { Recording } from '@/types/recording';

export interface ProcessingJob {
  id: string;
  recordingId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stage: 'upload' | 'validation' | 'transcription' | 'analysis' | 'summary' | 'completion';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  metadata: {
    fileSize: number;
    duration?: number;
    format: string;
    estimatedProcessingTime?: number;
  };
}

export interface ProcessingQueue {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  currentThroughput: number;
}

export interface ProcessingStats {
  totalProcessed: number;
  successRate: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
  errorBreakdown: Record<string, number>;
  performanceMetrics: {
    transcriptionSpeed: number; // minutes of audio per minute of processing
    qualityScore: number;
    systemLoad: number;
  };
}

export const useMediaProcessingPipeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [queue, setQueue] = useState<ProcessingQueue | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create a new processing job
  const createJob = useCallback((recording: Recording): ProcessingJob => {
    const estimatedTime = estimateProcessingTime(recording.file_size || 0, recording.file_type);
    
    return {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordingId: recording.id,
      status: 'queued',
      stage: 'upload',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      metadata: {
        fileSize: recording.file_size || 0,
        duration: recording.duration,
        format: recording.file_type,
        estimatedProcessingTime: estimatedTime
      }
    };
  }, []);

  // Estimate processing time based on file size and type
  const estimateProcessingTime = useCallback((fileSize: number, fileType: string): number => {
    // Base processing time: ~1 minute per MB for audio, ~2 minutes per MB for video
    const fileSizeMB = fileSize / (1024 * 1024);
    const baseTimePerMB = fileType === 'audio' ? 1 : 2;
    
    // Add overhead for transcription and analysis
    const baseTime = fileSizeMB * baseTimePerMB;
    const transcriptionOverhead = Math.max(2, fileSizeMB * 0.5); // Minimum 2 minutes
    const analysisOverhead = 1; // 1 minute for summary generation
    
    return Math.ceil(baseTime + transcriptionOverhead + analysisOverhead);
  }, []);

  // Process a single job through all stages
  const processJob = useCallback(async (job: ProcessingJob): Promise<boolean> => {
    console.log(`Starting processing job ${job.id} for recording ${job.recordingId}`);
    
    try {
      // Update job status
      const updateJob = (updates: Partial<ProcessingJob>) => {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...updates } : j));
      };
      
      updateJob({ 
        status: 'processing', 
        startedAt: new Date(),
        stage: 'validation'
      });
      
      // Get recording data
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', job.recordingId)
        .single();
      
      if (fetchError || !recording) {
        throw new Error(`Failed to fetch recording: ${fetchError?.message}`);
      }
      
      // Stage 1: Validation (10%)
      updateJob({ stage: 'validation', progress: 10 });
      
      if (!recording.file_url) {
        throw new Error('Recording file URL not found');
      }
      
      // Stage 2: Transcription (60%)
      updateJob({ stage: 'transcription', progress: 20 });
      
      // Fetch the file for transcription
      const response = await fetch(recording.file_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], recording.title, { type: recording.file_type === 'audio' ? 'audio/mpeg' : 'video/mp4' });
      
      updateJob({ progress: 40 });
      
      // Perform transcription
      const transcriptionResult = await transcribeAudio(file);
      
      if (!transcriptionResult.success || !transcriptionResult.transcript) {
        throw new Error(transcriptionResult.error || 'Transcription failed');
      }
      
      updateJob({ progress: 60 });
      
      // Stage 3: Analysis and Summary (80%)
      updateJob({ stage: 'analysis', progress: 70 });
      
      const summary = await generateSummary(transcriptionResult.transcript);
      
      updateJob({ progress: 80 });
      
      // Stage 4: Database Update (90%)
      updateJob({ stage: 'summary', progress: 85 });
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          transcript: transcriptionResult.transcript,
          summary: summary,
          status: 'completed',
          duration: transcriptionResult.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.recordingId);
      
      if (updateError) {
        throw new Error(`Failed to update recording: ${updateError.message}`);
      }
      
      // Stage 5: Completion (100%)
      updateJob({ 
        stage: 'completion', 
        progress: 100, 
        status: 'completed',
        completedAt: new Date()
      });
      
      console.log(`Successfully completed processing job ${job.id}`);
      return true;
      
    } catch (error) {
      console.error(`Processing job ${job.id} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      // Update job with error
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: 'failed', 
              error: errorMessage,
              completedAt: new Date()
            } 
          : j
      ));
      
      // Mark recording as failed in database
      await supabase
        .from('recordings')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.recordingId);
      
      return false;
    }
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const queuedJobs = jobs.filter(job => job.status === 'queued');
      
      if (queuedJobs.length === 0) {
        return;
      }
      
      console.log(`Processing ${queuedJobs.length} queued jobs`);
      
      // Process jobs sequentially (could be enhanced for parallel processing)
      for (const job of queuedJobs) {
        if (job.retryCount < job.maxRetries) {
          const success = await processJob(job);
          
          if (!success && job.retryCount < job.maxRetries) {
            // Retry failed job
            setJobs(prev => prev.map(j => 
              j.id === job.id 
                ? { 
                    ...j, 
                    status: 'queued',
                    retryCount: j.retryCount + 1,
                    error: undefined
                  } 
                : j
            ));
          }
        }
      }
      
    } finally {
      setIsProcessing(false);
    }
  }, [jobs, isProcessing, processJob]);

  // Add recording to processing queue
  const addToQueue = useCallback((recording: Recording) => {
    const job = createJob(recording);
    setJobs(prev => [...prev, job]);
    
    toast({
      title: "Added to processing queue",
      description: `${recording.title} will be processed shortly`
    });
    
    return job.id;
  }, [createJob, toast]);

  // Retry a failed job
  const retryJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            status: 'queued' as const,
            stage: 'upload' as const,
            progress: 0,
            error: undefined,
            retryCount: 0
          }
        : job
    ));
  }, []);

  // Cancel a job
  const cancelJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            status: 'cancelled' as const,
            completedAt: new Date()
          }
        : job
    ));
  }, []);

  // Clear completed/failed jobs
  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(job => 
      job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
    ));
  }, []);

  // Calculate queue statistics
  const calculateQueueStats = useCallback((): ProcessingQueue => {
    const total = jobs.length;
    const queued = jobs.filter(job => job.status === 'queued').length;
    const processing = jobs.filter(job => job.status === 'processing').length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const failed = jobs.filter(job => job.status === 'failed').length;
    
    const completedJobs = jobs.filter(job => 
      job.status === 'completed' && job.startedAt && job.completedAt
    );
    
    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const duration = (job.completedAt!.getTime() - job.startedAt!.getTime()) / (1000 * 60); // minutes
          return sum + duration;
        }, 0) / completedJobs.length
      : 0;
    
    // Calculate throughput (jobs per hour)
    const recentJobs = completedJobs.filter(job => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return job.completedAt! > hourAgo;
    });
    
    const currentThroughput = recentJobs.length;
    
    return {
      total,
      queued,
      processing,
      completed,
      failed,
      avgProcessingTime,
      currentThroughput
    };
  }, [jobs]);

  // Calculate processing statistics
  const calculateStats = useCallback((): ProcessingStats => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    const totalProcessed = completedJobs.length + failedJobs.length;
    const successRate = totalProcessed > 0 ? (completedJobs.length / totalProcessed) * 100 : 0;
    
    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          if (job.startedAt && job.completedAt) {
            return sum + (job.completedAt.getTime() - job.startedAt.getTime()) / (1000 * 60);
          }
          return sum;
        }, 0) / completedJobs.length
      : 0;
    
    const totalProcessingTime = completedJobs.reduce((sum, job) => {
      if (job.startedAt && job.completedAt) {
        return sum + (job.completedAt.getTime() - job.startedAt.getTime()) / (1000 * 60);
      }
      return sum;
    }, 0);
    
    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    failedJobs.forEach(job => {
      const errorType = job.error?.split(':')[0] || 'Unknown';
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });
    
    // Performance metrics (simplified)
    const transcriptionSpeed = avgProcessingTime > 0 ? 60 / avgProcessingTime : 0; // rough estimate
    const qualityScore = successRate; // simplified quality metric
    const systemLoad = jobs.filter(job => job.status === 'processing').length * 20; // 20% per job
    
    return {
      totalProcessed,
      successRate,
      avgProcessingTime,
      totalProcessingTime,
      errorBreakdown,
      performanceMetrics: {
        transcriptionSpeed,
        qualityScore,
        systemLoad
      }
    };
  }, [jobs]);

  // Update queue and stats when jobs change
  useEffect(() => {
    setQueue(calculateQueueStats());
    setStats(calculateStats());
  }, [jobs, calculateQueueStats, calculateStats]);

  // Auto-process queue when new jobs are added
  useEffect(() => {
    const queuedJobs = jobs.filter(job => job.status === 'queued');
    if (queuedJobs.length > 0 && !isProcessing) {
      // Debounce processing to avoid rapid successive calls
      const timer = setTimeout(() => {
        processQueue();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [jobs, isProcessing, processQueue]);

  return {
    // Data
    jobs,
    queue,
    stats,
    loading,
    isProcessing,
    
    // Actions
    addToQueue,
    retryJob,
    cancelJob,
    clearCompletedJobs,
    processQueue
  };
};
