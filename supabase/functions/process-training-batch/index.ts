/**
 * Process Training Batch Edge Function
 * 
 * Handles batch processing operations including scheduling, execution monitoring,
 * and automated processing of training datasets.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Inline CORS utilities to avoid shared import issues during deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

function handleCORSPreflight(): Response {
  return new Response(null, { 
    headers: corsHeaders,
    status: 200
  });
}

function createSuccessResponse(data: any, status: number = 200): Response {
  const responseBody = {
    success: true,
    ...data
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

function createErrorResponse(
  error: string | Error,
  status: number = 500,
  additionalData?: Record<string, any>
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const responseBody = {
    success: false,
    error: errorMessage,
    ...additionalData
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

// Batch processing types
interface BatchProcessingJob {
  id: string;
  batch_name: string;
  training_program_id: string;
  manager_id: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  file_path?: string;
  processing_config: any;
  results?: any;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

interface BatchRequest {
  action: 'schedule' | 'process' | 'cancel' | 'get_status' | 'get_jobs' | 'setup_schedule';
  jobId?: string;
  trainingProgramId?: string;
  managerId?: string;
  scheduledFor?: string;
  filePath?: string;
  processingConfig?: any;
  scheduleConfig?: {
    dayOfWeek: number;
    timeOfDay: string;
    isActive: boolean;
  };
  filterOptions?: {
    status?: string;
    limit?: number;
    offset?: number;
  };
}

interface BatchResponse {
  success: boolean;
  action: string;
  data?: any;
  error?: string;
  jobId?: string;
  scheduleId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Initialize Supabase client with service role for database operations
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    let user: any;
    
    if (authHeader) {
      // Try to authenticate with user credentials
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: authUser, error: authError } = await supabaseAuth.auth.getUser();
      
      if (authError || !authUser) {
        console.log('Authentication failed, using development mode');
        user = { id: 'dev-user-id', email: 'dev@example.com' };
      } else {
        user = authUser;
      }
    } else {
      // Development mode - no auth header provided
      console.log('No auth header, using development mode');
      user = { id: 'dev-user-id', email: 'dev@example.com' };
    }

    // Parse request body
    const batchRequest: BatchRequest = await req.json();

    // Route to appropriate handler based on action
    let response: BatchResponse;

    switch (batchRequest.action) {
      case 'schedule':
        response = await handleScheduleBatch(supabaseServiceRole, batchRequest, user.id);
        break;
      
      case 'process':
        response = await handleProcessBatch(supabaseServiceRole, batchRequest, user.id);
        break;
      
      case 'cancel':
        response = await handleCancelBatch(supabaseServiceRole, batchRequest, user.id);
        break;
      
      case 'get_status':
        response = await handleGetStatus(supabaseServiceRole, batchRequest, user.id);
        break;
      
      case 'get_jobs':
        response = await handleGetJobs(supabaseServiceRole, batchRequest, user.id);
        break;
      
      case 'setup_schedule':
        response = await handleSetupSchedule(supabaseServiceRole, batchRequest, user.id);
        break;
      
      default:
        response = {
          success: false,
          action: batchRequest.action,
          error: `Unknown action: ${batchRequest.action}`
        };
    }

    return new Response(
      JSON.stringify(response),
      {
        status: response.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        action: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Schedule a new batch job
async function handleScheduleBatch(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    // Validate required fields
    if (!request.trainingProgramId || !request.managerId) {
      return {
        success: false,
        action: 'schedule',
        error: 'Training program ID and manager ID are required'
      };
    }

    // Verify user has permission to create jobs for this manager
    // For now, allow any authenticated user to create jobs
    // In production, implement proper permission checking
    console.log(`User ${userId} creating batch job for manager ${request.managerId}`);

    // Generate batch name and job ID
    const scheduledFor = request.scheduledFor ? new Date(request.scheduledFor) : new Date();
    const batchName = generateBatchName(scheduledFor);
    const jobId = generateJobId();

    const processingConfig = {
      autoValidation: false,
      confidenceThreshold: 0.8,
      includeUnmatched: true,
      notifyOnCompletion: true,
      retryOnFailure: true,
      ...request.processingConfig
    };

    // Create job record
    const jobData = {
      id: jobId,
      training_program_id: request.trainingProgramId,
      status: 'scheduled',
      job_type: 'manual_batch',
      total_items: 0,
      processed_items: 0,
      failed_items: 0,
      start_time: scheduledFor.toISOString(),
      end_time: null,
      error_message: null,
      metadata: {
        batch_name: batchName,
        file_path: request.filePath,
        processing_config: processingConfig,
        manager_id: request.managerId,
        retry_count: 0,
        max_retries: 3
      },
      created_by: request.managerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('bdr_batch_processing_jobs')
      .insert(jobData);

    if (insertError) {
      return {
        success: false,
        action: 'schedule',
        error: `Failed to schedule batch job: ${insertError.message}`
      };
    }

    return {
      success: true,
      action: 'schedule',
      jobId,
      data: {
        jobId,
        batchName,
        scheduledFor: scheduledFor.toISOString(),
        processingConfig
      }
    };

  } catch (error) {
    return {
      success: false,
      action: 'schedule',
      error: error instanceof Error ? error.message : 'Unknown scheduling error'
    };
  }
}

// Process a batch job immediately
async function handleProcessBatch(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    if (!request.jobId) {
      return {
        success: false,
        action: 'process',
        error: 'Job ID is required'
      };
    }

    // Get job details
    const { data: job, error: fetchError } = await supabase
      .from('bdr_batch_processing_jobs')
      .select(`
        *,
        training_program:bdr_training_programs(*)
      `)
      .eq('id', request.jobId)
      .single();

    if (fetchError || !job) {
      return {
        success: false,
        action: 'process',
        error: `Job not found: ${fetchError?.message}`
      };
    }

    // Verify permissions - check created_by field
    if (job.created_by !== userId) {
      console.log(`Permission check: job created by ${job.created_by}, user is ${userId}`);
      // For development, allow processing any job
      // In production, implement proper permission checking
    }

    // Check job status
    if (job.status !== 'scheduled') {
      return {
        success: false,
        action: 'process',
        error: `Job status is ${job.status}, expected 'scheduled'`
      };
    }

    // Update job status to processing
    await updateJobStatus(supabase, request.jobId, 'processing', {
      started_at: new Date().toISOString()
    });

    try {
      // Execute batch processing
      const processingResult = await executeBatchProcessing(supabase, job);

      if (processingResult.success) {
        // Update job with success results
        await updateJobStatus(supabase, request.jobId, 'completed', {
          completed_at: new Date().toISOString(),
          results: processingResult.results
        });

        // Send notifications if configured
        if (job.processing_config?.notifyOnCompletion) {
          await sendCompletionNotification(supabase, job, processingResult.results);
        }

        return {
          success: true,
          action: 'process',
          jobId: request.jobId,
          data: {
            status: 'completed',
            results: processingResult.results
          }
        };
      } else {
        // Handle failure with retry logic
        const retryCount = job.retry_count + 1;
        const shouldRetry = job.processing_config?.retryOnFailure && retryCount <= job.max_retries;

        if (shouldRetry) {
          // Schedule retry
          const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // Exponential backoff
          const retryTime = new Date(Date.now() + retryDelay);

          await updateJobStatus(supabase, request.jobId, 'scheduled', {
            scheduled_for: retryTime.toISOString(),
            retry_count: retryCount,
            error_message: processingResult.error
          });

          return {
            success: false,
            action: 'process',
            jobId: request.jobId,
            error: `Job failed, retry scheduled: ${processingResult.error}`,
            data: {
              status: 'scheduled',
              retryCount,
              nextRetry: retryTime.toISOString()
            }
          };
        } else {
          // Mark as failed
          await updateJobStatus(supabase, request.jobId, 'failed', {
            completed_at: new Date().toISOString(),
            error_message: processingResult.error
          });

          return {
            success: false,
            action: 'process',
            jobId: request.jobId,
            error: processingResult.error,
            data: {
              status: 'failed'
            }
          };
        }
      }
    } catch (processingError) {
      await updateJobStatus(supabase, request.jobId, 'failed', {
        completed_at: new Date().toISOString(),
        error_message: processingError instanceof Error ? processingError.message : 'Unknown processing error'
      });

      return {
        success: false,
        action: 'process',
        jobId: request.jobId,
        error: `Processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
      };
    }

  } catch (error) {
    return {
      success: false,
      action: 'process',
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

// Cancel a scheduled batch job
async function handleCancelBatch(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    if (!request.jobId) {
      return {
        success: false,
        action: 'cancel',
        error: 'Job ID is required'
      };
    }

    // Get job details for permission check
    const { data: job, error: fetchError } = await supabase
      .from('bdr_batch_processing_jobs')
      .select('created_by, status')
      .eq('id', request.jobId)
      .single();

    if (fetchError || !job) {
      return {
        success: false,
        action: 'cancel',
        error: `Job not found: ${fetchError?.message}`
      };
    }

    // Verify permissions
    if (job.created_by !== userId) {
      console.log(`Cancel permission check: job created by ${job.created_by}, user is ${userId}`);
      // For development, allow cancelling any job
      // In production, implement proper permission checking
    }

    // Check if job can be cancelled
    if (job.status !== 'scheduled') {
      return {
        success: false,
        action: 'cancel',
        error: `Cannot cancel job with status: ${job.status}`
      };
    }

    // Cancel the job
    const { error: updateError } = await supabase
      .from('bdr_batch_processing_jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.jobId);

    if (updateError) {
      return {
        success: false,
        action: 'cancel',
        error: `Failed to cancel job: ${updateError.message}`
      };
    }

    return {
      success: true,
      action: 'cancel',
      jobId: request.jobId,
      data: {
        status: 'cancelled'
      }
    };

  } catch (error) {
    return {
      success: false,
      action: 'cancel',
      error: error instanceof Error ? error.message : 'Unknown cancellation error'
    };
  }
}

// Get job status
async function handleGetStatus(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    if (!request.jobId) {
      return {
        success: false,
        action: 'get_status',
        error: 'Job ID is required'
      };
    }

    const { data: job, error: fetchError } = await supabase
      .from('bdr_batch_processing_jobs')
      .select('*')
      .eq('id', request.jobId)
      .single();

    if (fetchError || !job) {
      return {
        success: false,
        action: 'get_status',
        error: `Job not found: ${fetchError?.message}`
      };
    }

    // Verify permissions
    if (job.created_by !== userId) {
      console.log(`Status permission check: job created by ${job.created_by}, user is ${userId}`);
      // For development, allow viewing any job
      // In production, implement proper permission checking
    }

    return {
      success: true,
      action: 'get_status',
      jobId: request.jobId,
      data: {
        job_id: job.id,
        batch_name: job.batch_name,
        status: job.status,
        scheduled_for: job.scheduled_for,
        started_at: job.started_at,
        completed_at: job.completed_at,
        processing_config: job.processing_config,
        results: job.results,
        error_message: job.error_message,
        retry_count: job.retry_count,
        created_at: job.created_at,
        updated_at: job.updated_at
      }
    };

  } catch (error) {
    return {
      success: false,
      action: 'get_status',
      error: error instanceof Error ? error.message : 'Unknown status retrieval error'
    };
  }
}

// Get batch jobs list
async function handleGetJobs(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    let query = supabase
      .from('bdr_batch_processing_jobs')
      .select('*', { count: 'exact' });

    // Filter by manager (with permission check)
    if (request.managerId) {
      if (request.managerId !== userId) {
        console.log(`Get jobs permission check: requested manager ${request.managerId}, user is ${userId}`);
        // For development, allow viewing jobs for any manager
        // In production, implement proper permission checking
      }
      // Skip filtering by created_by for now in development mode
      console.log(`Would filter by created_by: ${request.managerId}`);
    } else {
      // Default to all jobs since we're in development mode
      // In production, filter by actual user ID
      console.log('Loading all batch jobs for development mode');
    }

    // Apply filters
    if (request.trainingProgramId) {
      query = query.eq('training_program_id', request.trainingProgramId);
    }

    if (request.filterOptions?.status) {
      query = query.eq('status', request.filterOptions.status);
    }

    // Apply ordering
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    if (request.filterOptions?.limit) {
      const offset = request.filterOptions.offset || 0;
      query = query.range(offset, offset + request.filterOptions.limit - 1);
    }

    const { data: jobs, error: fetchError, count } = await query;

    if (fetchError) {
      return {
        success: false,
        action: 'get_jobs',
        error: `Failed to retrieve jobs: ${fetchError.message}`
      };
    }

    return {
      success: true,
      action: 'get_jobs',
      data: {
        jobs: jobs || [],
        total_count: count || 0,
        has_more: (count || 0) > ((request.filterOptions?.offset || 0) + (request.filterOptions?.limit || 50))
      }
    };

  } catch (error) {
    return {
      success: false,
      action: 'get_jobs',
      error: error instanceof Error ? error.message : 'Unknown jobs retrieval error'
    };
  }
}

// Setup weekly batch schedule
async function handleSetupSchedule(
  supabase: any,
  request: BatchRequest,
  userId: string
): Promise<BatchResponse> {
  try {
    if (!request.trainingProgramId || !request.managerId || !request.scheduleConfig) {
      return {
        success: false,
        action: 'setup_schedule',
        error: 'Training program ID, manager ID, and schedule config are required'
      };
    }

    // Verify permissions
    if (request.managerId !== userId) {
      console.log(`Setup schedule permission check: manager ${request.managerId}, user is ${userId}`);
      // For development, allow setting up schedules for any manager
      // In production, implement proper permission checking
    }

    // Calculate next run time
    const nextRun = calculateNextRunTime(
      request.scheduleConfig.dayOfWeek,
      request.scheduleConfig.timeOfDay
    );

    const scheduleData = {
      training_program_id: request.trainingProgramId,
      schedule_day: getDayName(request.scheduleConfig.dayOfWeek),
      schedule_hour: parseInt(request.scheduleConfig.timeOfDay.split(':')[0]),
      is_enabled: request.scheduleConfig.isActive,
      next_run_time: nextRun.toISOString(),
      batch_size: 50,
      metadata: {
        manager_id: request.managerId,
        processing_config: request.processingConfig || {},
        time_of_day: request.scheduleConfig.timeOfDay
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: schedule, error: insertError } = await supabase
      .from('bdr_weekly_batch_schedules')
      .insert(scheduleData)
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        action: 'setup_schedule',
        error: `Failed to setup schedule: ${insertError.message}`
      };
    }

    return {
      success: true,
      action: 'setup_schedule',
      scheduleId: schedule.id,
      data: {
        schedule_id: schedule.id,
        next_run_at: nextRun.toISOString(),
        ...scheduleData
      }
    };

  } catch (error) {
    return {
      success: false,
      action: 'setup_schedule',
      error: error instanceof Error ? error.message : 'Unknown schedule setup error'
    };
  }
}

// Helper functions

async function updateJobStatus(
  supabase: any,
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

async function executeBatchProcessing(
  supabase: any,
  job: BatchProcessingJob & { training_program: any }
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    const startTime = Date.now();

    // In a real implementation, this would:
    // 1. Download file from storage using job.file_path
    // 2. Process with TrainingDatasetService
    // 3. Return detailed results

    // Simulate processing for now
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    const processingTime = Date.now() - startTime;
    
    // Mock successful processing results
    const results = {
      total_records: 25,
      processed_records: 23,
      matched_recordings: 20,
      unmatched_records: 3,
      validation_errors: 2,
      warnings: 5,
      processing_time_ms: processingTime,
      data_quality_score: 87,
      batch_id: `batch_${Date.now()}`,
      summary: 'Processed 23/25 records, 20 matched recordings, 2 errors, 5 warnings'
    };

    return { success: true, results };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

async function sendCompletionNotification(
  supabase: any,
  job: BatchProcessingJob,
  results: any
): Promise<void> {
  // Implementation would send notification via email, Slack, etc.
  console.log(`Batch job ${job.id} completed:`, results);
  
  // Could also insert into notifications table
  await supabase
    .from('notifications')
    .insert({
      user_id: job.manager_id,
      type: 'batch_completion',
      title: `Batch Job Completed: ${job.batch_name}`,
      message: results.summary,
      data: { job_id: job.id, results },
      created_at: new Date().toISOString()
    });
}

function generateBatchName(scheduledFor: Date): string {
  const weekStart = getWeekStartDate(scheduledFor);
  return `Week of ${weekStart.toISOString().split('T')[0]}`;
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getWeekStartDate(date: Date): Date {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(monday.getDate() - daysToMonday);
  return monday;
}

function calculateNextRunTime(dayOfWeek: number, timeOfDay: string): Date {
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

function getDayName(dayOfWeek: number): string {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[dayOfWeek] || 'monday';
}