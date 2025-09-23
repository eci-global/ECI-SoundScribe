/**
 * Batch Processing Service for BDR Training Integration
 * 
 * Manages weekly batch processing of BDR scorecard data, including scheduling,
 * monitoring, and automated processing of training datasets.
 */

import { supabase } from '../integrations/supabase/client';
import { trainingDatasetService, type TrainingDatasetCreationResult } from './trainingDatasetService';
import { BDRTrainingProgram } from '../types/bdr-training';

// Batch processing types
export interface BatchProcessingJob {
  id: string;
  batch_name: string;
  training_program_id: string;
  manager_id: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  file_path?: string;
  processing_config: BatchProcessingConfig;
  results?: BatchProcessingResults;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface BatchProcessingConfig {
  autoValidation: boolean;
  confidenceThreshold: number;
  includeUnmatched: boolean;
  notifyOnCompletion: boolean;
  retryOnFailure: boolean;
  customColumnMapping?: Record<string, string>;
  validationRules?: {
    requireCallDate: boolean;
    requireDuration: boolean;
    requireManagerNotes: boolean;
    strictScoreRange: boolean;
  };
}

export interface BatchProcessingResults {
  totalRecords: number;
  processedRecords: number;
  matchedRecordings: number;
  unmatchedRecords: number;
  validationErrors: number;
  warnings: number;
  processingTimeMs: number;
  dataQualityScore: number;
  batchId: string;
  summary: string;
}

// Weekly batch schedule
export interface WeeklyBatchSchedule {
  id: string;
  training_program_id: string;
  manager_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  time_of_day: string; // HH:MM format
  is_active: boolean;
  processing_config: BatchProcessingConfig;
  last_run_at?: string;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

// Batch monitoring types
export interface BatchMonitoringMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
  recentJobs: BatchProcessingJob[];
  upcomingJobs: BatchProcessingJob[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    lastChecked: string;
  };
}

export const DEFAULT_BATCH_CONFIG: BatchProcessingConfig = {
  autoValidation: false,
  confidenceThreshold: 0.8,
  includeUnmatched: true,
  notifyOnCompletion: true,
  retryOnFailure: true,
  validationRules: {
    requireCallDate: false,
    requireDuration: false,
    requireManagerNotes: false,
    strictScoreRange: true
  }
};

/**
 * Main batch processing service class
 */
export class BatchProcessingService {
  
  /**
   * Schedule a new batch processing job
   */
  async scheduleBatchJob(
    trainingProgramId: string,
    managerId: string,
    filePath: string,
    scheduledFor: Date,
    config: Partial<BatchProcessingConfig> = {}
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const processingConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
      const batchName = this.generateBatchName(scheduledFor);

      const { data, error } = await supabase
        .from('bdr_batch_processing_jobs')
        .insert({
          batch_name: batchName,
          training_program_id: trainingProgramId,
          manager_id: managerId,
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
          file_path: filePath,
          processing_config: processingConfig,
          retry_count: 0,
          max_retries: 3
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: `Failed to schedule batch job: ${error.message}` };
      }

      return { success: true, jobId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: `Unexpected error scheduling batch job: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Process a batch job immediately
   */
  async processBatchJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get job details
      const { data: job, error: fetchError } = await supabase
        .from('bdr_batch_processing_jobs')
        .select(`
          *,
          training_program:bdr_training_programs(*)
        `)
        .eq('id', jobId)
        .single();

      if (fetchError || !job) {
        return { success: false, error: `Job not found: ${fetchError?.message}` };
      }

      if (job.status !== 'scheduled') {
        return { success: false, error: `Job status is ${job.status}, expected 'scheduled'` };
      }

      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', { started_at: new Date().toISOString() });

      // Process the batch
      const result = await this.executeBatchProcessing(job);

      if (result.success) {
        // Update job with success results
        await this.updateJobStatus(jobId, 'completed', {
          completed_at: new Date().toISOString(),
          results: result.results
        });

        // Send notifications if configured
        if (job.processing_config.notifyOnCompletion) {
          await this.sendCompletionNotification(job, result.results!);
        }

        return { success: true };
      } else {
        // Handle failure
        const retryCount = job.retry_count + 1;
        const shouldRetry = job.processing_config.retryOnFailure && retryCount <= job.max_retries;

        if (shouldRetry) {
          // Schedule retry
          const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // Exponential backoff
          const retryTime = new Date(Date.now() + retryDelay);

          await this.updateJobStatus(jobId, 'scheduled', {
            scheduled_for: retryTime.toISOString(),
            retry_count: retryCount,
            error_message: result.error
          });

          return { success: false, error: `Job failed, retry scheduled: ${result.error}` };
        } else {
          // Mark as failed
          await this.updateJobStatus(jobId, 'failed', {
            completed_at: new Date().toISOString(),
            error_message: result.error
          });

          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', {
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown processing error'
      });

      return { 
        success: false, 
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get batch processing jobs with filtering
   */
  async getBatchJobs(options: {
    managerId?: string;
    trainingProgramId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    jobs: BatchProcessingJob[];
    totalCount: number;
  }> {
    let query = supabase
      .from('bdr_batch_processing_jobs')
      .select('*', { count: 'exact' });

    if (options.managerId) {
      query = query.eq('manager_id', options.managerId);
    }
    
    if (options.trainingProgramId) {
      query = query.eq('training_program_id', options.trainingProgramId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Failed to get batch jobs: ${error.message}`);
    }

    return {
      jobs: data || [],
      totalCount: count || 0
    };
  }

  /**
   * Setup weekly batch schedule
   */
  async setupWeeklySchedule(
    trainingProgramId: string,
    managerId: string,
    dayOfWeek: number,
    timeOfDay: string,
    config: Partial<BatchProcessingConfig> = {}
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    try {
      const processingConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
      const nextRun = this.calculateNextRunTime(dayOfWeek, timeOfDay);

      const { data, error } = await supabase
        .from('bdr_weekly_batch_schedules')
        .insert({
          training_program_id: trainingProgramId,
          manager_id: managerId,
          day_of_week: dayOfWeek,
          time_of_day: timeOfDay,
          is_active: true,
          processing_config: processingConfig,
          next_run_at: nextRun.toISOString()
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: `Failed to setup schedule: ${error.message}` };
      }

      return { success: true, scheduleId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: `Unexpected error setting up schedule: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get monitoring metrics for batch processing
   */
  async getMonitoringMetrics(managerId?: string): Promise<BatchMonitoringMetrics> {
    // Get job statistics
    let jobQuery = supabase.from('bdr_batch_processing_jobs').select('*');
    if (managerId) {
      jobQuery = jobQuery.eq('manager_id', managerId);
    }

    const { data: jobs, error } = await jobQuery.order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get monitoring metrics: ${error.message}`);
    }

    const allJobs = jobs || [];
    const recentJobs = allJobs.slice(0, 10);
    
    // Calculate metrics
    const totalJobs = allJobs.length;
    const activeJobs = allJobs.filter(j => j.status === 'processing' || j.status === 'scheduled').length;
    const completedJobs = allJobs.filter(j => j.status === 'completed').length;
    const failedJobs = allJobs.filter(j => j.status === 'failed').length;
    
    // Calculate average processing time
    const completedWithTimes = allJobs.filter(j => 
      j.status === 'completed' && j.started_at && j.completed_at
    );
    const averageProcessingTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, job) => {
          const start = new Date(job.started_at!).getTime();
          const end = new Date(job.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedWithTimes.length
      : 0;

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Get upcoming scheduled jobs
    const upcomingJobs = allJobs
      .filter(j => j.status === 'scheduled' && new Date(j.scheduled_for) > new Date())
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 5);

    // Determine system health
    const systemHealth = this.calculateSystemHealth(allJobs);

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      successRate,
      recentJobs,
      upcomingJobs,
      systemHealth
    };
  }

  /**
   * Cancel a scheduled batch job
   */
  async cancelBatchJob(jobId: string, managerId: string): Promise<{ success: boolean; error?: string }> {
    const { data: job, error: fetchError } = await supabase
      .from('bdr_batch_processing_jobs')
      .select('manager_id, status')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      return { success: false, error: `Job not found: ${fetchError.message}` };
    }

    if (job.manager_id !== managerId) {
      return { success: false, error: 'Unauthorized to cancel this job' };
    }

    if (job.status !== 'scheduled') {
      return { success: false, error: `Cannot cancel job with status: ${job.status}` };
    }

    const { error } = await supabase
      .from('bdr_batch_processing_jobs')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      return { success: false, error: `Failed to cancel job: ${error.message}` };
    }

    return { success: true };
  }

  // Private helper methods

  private async executeBatchProcessing(
    job: BatchProcessingJob & { training_program: BDRTrainingProgram }
  ): Promise<{ success: boolean; results?: BatchProcessingResults; error?: string }> {
    try {
      const startTime = Date.now();

      // Get file from storage (assuming file path is provided)
      // This would typically involve downloading from Supabase storage
      // For now, we'll simulate the file processing
      
      // In a real implementation, you would:
      // 1. Download file from storage using job.file_path
      // 2. Create File object for processing
      
      // Simulate processing for now
      const mockFile = new File([], 'batch-file.xlsx');
      
      const result = await trainingDatasetService.createFromExcelFile(
        mockFile,
        job.training_program,
        job.manager_id
      );

      const processingTime = Date.now() - startTime;

      if (result.success) {
        const results: BatchProcessingResults = {
          totalRecords: result.summary.totalRecords,
          processedRecords: result.summary.processedRecords,
          matchedRecordings: result.summary.matchedRecordings,
          unmatchedRecords: result.summary.unmatchedRecords,
          validationErrors: result.summary.validationErrors,
          warnings: result.summary.warnings,
          processingTimeMs: processingTime,
          dataQualityScore: this.calculateDataQualityScore(result),
          batchId: result.batchId,
          summary: this.generateProcessingSummary(result)
        };

        return { success: true, results };
      } else {
        const errorMessage = result.errors.map(e => e.message).join('; ');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown processing error' 
      };
    }
  }

  private async updateJobStatus(
    jobId: string, 
    status: string, 
    additionalFields: Record<string, any> = {}
  ): Promise<void> {
    await supabase
      .from('bdr_batch_processing_jobs')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...additionalFields
      })
      .eq('id', jobId);
  }

  private generateBatchName(scheduledFor: Date): string {
    const weekStart = this.getWeekStartDate(scheduledFor);
    return `Week of ${weekStart.toISOString().split('T')[0]}`;
  }

  private getWeekStartDate(date: Date): Date {
    const monday = new Date(date);
    const dayOfWeek = monday.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - daysToMonday);
    return monday;
  }

  private calculateNextRunTime(dayOfWeek: number, timeOfDay: string): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // Calculate days until target day of week
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    if (daysUntilTarget === 0 && nextRun <= now) {
      // If it's today but time has passed, schedule for next week
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
    }

    return nextRun;
  }

  private calculateDataQualityScore(result: TrainingDatasetCreationResult): number {
    const total = result.summary.totalRecords;
    if (total === 0) return 0;

    const processed = result.summary.processedRecords;
    const matched = result.summary.matchedRecordings;
    const errors = result.summary.validationErrors;

    // Base score from processing success rate
    let score = (processed / total) * 60;
    
    // Bonus for matching success
    if (processed > 0) {
      score += (matched / processed) * 30;
    }
    
    // Penalty for errors
    score -= (errors / total) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateProcessingSummary(result: TrainingDatasetCreationResult): string {
    return `Processed ${result.summary.processedRecords}/${result.summary.totalRecords} records, ` +
           `${result.summary.matchedRecordings} matched recordings, ` +
           `${result.summary.validationErrors} errors, ${result.summary.warnings} warnings`;
  }

  private calculateSystemHealth(jobs: BatchProcessingJob[]): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    lastChecked: string;
  } {
    const issues: string[] = [];
    const recentJobs = jobs.filter(j => {
      const jobDate = new Date(j.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return jobDate > dayAgo;
    });

    // Check for recent failures
    const recentFailures = recentJobs.filter(j => j.status === 'failed').length;
    const recentTotal = recentJobs.length;
    
    if (recentFailures > 0 && recentTotal > 0) {
      const failureRate = (recentFailures / recentTotal) * 100;
      if (failureRate > 50) {
        issues.push(`High failure rate: ${failureRate.toFixed(1)}% in last 24h`);
      }
    }

    // Check for stuck jobs
    const stuckJobs = jobs.filter(j => {
      if (j.status !== 'processing') return false;
      const startTime = j.started_at ? new Date(j.started_at).getTime() : 0;
      const now = Date.now();
      return (now - startTime) > 30 * 60 * 1000; // 30 minutes
    });

    if (stuckJobs.length > 0) {
      issues.push(`${stuckJobs.length} jobs stuck in processing`);
    }

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.some(issue => issue.includes('High failure rate'))) {
      status = 'critical';
    } else {
      status = 'degraded';
    }

    return {
      status,
      issues,
      lastChecked: new Date().toISOString()
    };
  }

  private async sendCompletionNotification(
    job: BatchProcessingJob,
    results: BatchProcessingResults
  ): Promise<void> {
    // Implementation would send notification via email, Slack, etc.
    // For now, just log the completion
    console.log(`Batch job ${job.id} completed:`, results);
    
    // In a real implementation, you might:
    // 1. Send email to manager
    // 2. Post to Slack channel
    // 3. Update dashboard notifications
    // 4. Trigger webhooks
  }
}

// Export singleton instance
export const batchProcessingService = new BatchProcessingService();