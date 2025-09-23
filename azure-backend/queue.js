import Queue from 'bull';
import { FileProcessor } from './processor.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Job queue management for background processing
 */
export class ProcessingQueue {
  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.concurrency = parseInt(process.env.WORKER_CONCURRENCY) || 3;
    
    // Parse Redis configuration to handle authentication properly
    const redisConfig = this.parseRedisConfig();
    
    // Initialize the queue with proper Redis configuration
    this.queue = new Queue('file processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 25,     // Keep last 25 failed jobs
        attempts: 3,          // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 10000        // Start with 10 second delay
        },
        delay: 0
      }
    });

    this.processor = new FileProcessor();
    this.setupProcessing();
    this.setupEventHandlers();
  }

  /**
   * Parse Redis configuration to handle authentication properly
   * Bull.js has issues with rediss:// URLs, so we parse manually
   */
  parseRedisConfig() {
    try {
      const url = new URL(this.redisUrl);
      
      // Extract components
      const host = url.hostname;
      const port = parseInt(url.port) || 6379;
      const password = url.password || process.env.REDIS_PASSWORD;
      const username = url.username || process.env.REDIS_USERNAME;
      const tls = url.protocol === 'rediss:';
      
      console.log(`🔧 Redis config: host=${host}, port=${port}, tls=${tls}, hasPassword=${!!password}`);
      
      // Return Redis configuration object that Bull can handle
      // This avoids Bull's URL parsing which doesn't handle rediss:// properly
      const config = {
        host,
        port,
        ...(password && { password }),
        ...(username && username !== 'default' && { username }),
        ...(tls && { 
          tls: {
            rejectUnauthorized: false // Required for Redis Cloud self-signed certs
          }
        }),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null, // Important for Bull workers
        lazyConnect: true
      };
      
      return config;
    } catch (error) {
      console.error('Failed to parse Redis URL:', error);
      // Fallback configuration for localhost
      return {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null
      };
    }
  }

  /**
   * Setup job processing
   */
  setupProcessing() {
    this.queue.process('processRecording', this.concurrency, async (job) => {
      const { recordingId, ...processingOptions } = job.data;
      
      console.log(`🔄 Processing job ${job.id} for recording: ${recordingId} (${processingOptions.processingStrategy || 'standard'} strategy)`);
      
      // Update job progress as processing progresses
      const progressCallback = (progress) => {
        job.progress(progress);
      };

      try {
        const result = await this.processor.processRecording(recordingId, processingOptions);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        console.log(`✅ Job ${job.id} completed successfully`);
        return result;
        
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
        throw error;
      }
    });

    console.log(`📋 Queue processor started with concurrency: ${this.concurrency}`);
  }

  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    this.queue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, job.data.recordingId);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, job.data.recordingId, err.message);
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} stalled:`, job.data.recordingId);
    });

    this.queue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    this.queue.on('waiting', (jobId) => {
      console.log(`⏳ Job ${jobId} is waiting`);
    });

    this.queue.on('active', (job, jobPromise) => {
      console.log(`🔄 Job ${job.id} started:`, job.data.recordingId);
    });
  }

  /**
   * Add a new recording processing job with smart routing
   */
  async addProcessingJob(recordingId, options = {}) {
    try {
      // Determine job priority and settings based on file size and type
      const jobConfig = this.getOptimalJobConfig(options);
      
      const job = await this.queue.add('processRecording', 
        { 
          recordingId,
          ...jobConfig.data
        }, 
        {
          priority: jobConfig.priority,
          delay: options.delay || 0,
          attempts: jobConfig.attempts,
          jobId: `process-${recordingId}`, // Unique job ID to prevent duplicates
          ...jobConfig.queueOptions
        }
      );

      console.log(`➕ Added ${jobConfig.type} processing job ${job.id} for recording: ${recordingId} (priority: ${jobConfig.priority})`);
      
      return {
        success: true,
        jobId: job.id,
        recordingId,
        jobType: jobConfig.type,
        estimatedDuration: jobConfig.estimatedDuration
      };
    } catch (error) {
      console.error('Failed to add processing job:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine optimal job configuration based on file characteristics
   */
  getOptimalJobConfig(options = {}) {
    const fileSizeMB = options.fileSizeMB || 0;
    const fileType = options.fileType || 'audio';
    const durationMinutes = options.durationMinutes || 0;
    
    // Smart routing based on file characteristics
    if (fileSizeMB > 200 || durationMinutes > 120) {
      // Extremely large files - parallel worker processing
      return {
        type: 'parallel-workers',
        priority: -15, // Lowest priority for resource-intensive tasks
        attempts: 5,
        estimatedDuration: Math.max(300000, durationMinutes * 3000), // 3s per minute with workers
        data: {
          processingStrategy: 'parallel',
          chunkSizeMinutes: 4,
          enableCompression: true,
          parallelChunks: 6 // More workers for very large files
        },
        queueOptions: {
          removeOnComplete: 3,
          removeOnFail: 8
        }
      };
    } else if (fileSizeMB > 100 || durationMinutes > 60) {
      // Very large files - chunked processing with workers
      return {
        type: 'large-chunked',
        priority: -10, // Lower numbers = higher priority in Bull
        attempts: 5,
        estimatedDuration: Math.max(300000, durationMinutes * 4000), // 4s per minute with optimizations
        data: {
          processingStrategy: 'parallel',
          chunkSizeMinutes: 5,
          enableCompression: true,
          parallelChunks: 4
        },
        queueOptions: {
          removeOnComplete: 5, // Keep fewer completed jobs for large files
          removeOnFail: 10
        }
      };
    } else if (fileSizeMB > 25 || durationMinutes > 30) {
      // Medium files - medium priority, compression enabled
      return {
        type: 'medium-optimized',
        priority: -5,
        attempts: 4,
        estimatedDuration: Math.max(120000, durationMinutes * 3000), // 3s per minute
        data: {
          processingStrategy: 'optimized',
          enableCompression: true,
          parallelChunks: 2
        },
        queueOptions: {
          removeOnComplete: 8,
          removeOnFail: 15
        }
      };
    } else if (fileSizeMB > 5 || durationMinutes > 10) {
      // Small-medium files - higher priority, standard processing
      return {
        type: 'standard',
        priority: 0,
        attempts: 3,
        estimatedDuration: Math.max(60000, durationMinutes * 2000), // 2s per minute
        data: {
          processingStrategy: 'standard',
          enableCompression: false
        },
        queueOptions: {
          removeOnComplete: 10,
          removeOnFail: 20
        }
      };
    } else if (options.enableStreaming || fileSizeMB <= 2) {
      // Very small files or streaming enabled - real-time processing
      return {
        type: 'streaming',
        priority: 15, // Highest priority for streaming
        attempts: 2,
        estimatedDuration: Math.max(20000, durationMinutes * 800), // Faster than fast for streaming
        data: {
          processingStrategy: 'streaming',
          enableCompression: false,
          streamChunkSeconds: 15,
          streamOverlapSeconds: 2
        },
        queueOptions: {
          removeOnComplete: 20,
          removeOnFail: 30
        }
      };
    } else {
      // Small files - highest priority, fast processing
      return {
        type: 'fast',
        priority: 10,
        attempts: 2,
        estimatedDuration: Math.max(30000, durationMinutes * 1000), // 1s per minute
        data: {
          processingStrategy: 'fast',
          enableCompression: false
        },
        queueOptions: {
          removeOnComplete: 15,
          removeOnFail: 25
        }
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      const state = await job.getState();
      
      return {
        success: true,
        status: {
          id: job.id,
          state,
          progress: job.progress(),
          data: job.data,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed()
      ]);

      return {
        success: true,
        stats: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId) {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      await job.remove();
      
      return {
        success: true,
        message: 'Job cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      await job.retry();
      
      return {
        success: true,
        message: 'Job retried successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean old jobs
   */
  async cleanQueue() {
    try {
      // Clean jobs older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      await this.queue.clean(oneDayAgo, 'completed');
      await this.queue.clean(oneDayAgo, 'failed');
      
      console.log('🧹 Queue cleaned successfully');
      
      return {
        success: true,
        message: 'Queue cleaned successfully'
      };
    } catch (error) {
      console.error('Failed to clean queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down processing queue...');
    
    try {
      await this.queue.close();
      console.log('✅ Queue shutdown complete');
    } catch (error) {
      console.error('❌ Error during queue shutdown:', error);
    }
  }
}