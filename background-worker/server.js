import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { FileProcessor } from './processor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize file processor (removed Redis queue dependency for Azure App Service)
const fileProcessor = new FileProcessor();

console.log('🚀 Azure Backend Worker started - Redis-free immediate processing mode');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Worker concurrency:', process.env.WORKER_CONCURRENCY || 'default');

// Test Azure OpenAI configuration on startup
try {
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    console.log('✅ Azure OpenAI credentials configured');
  } else {
    console.warn('⚠️ Azure OpenAI credentials missing - processing will fail');
  }
  
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Supabase credentials configured');
  } else {
    console.warn('⚠️ Supabase credentials missing - database updates will fail');
  }
} catch (error) {
  console.error('❌ Configuration check failed:', error);
}

// Middleware - Allow specific origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080', 
  'https://preview--echo-ai-scribe-app.lovable.app',
  'https://echo-ai-scribe-app.lovable.app',
  'https://preview--eci-sound-scribe.lovable.app', // New domain
  'https://eci-sound-scribe.lovable.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
}));

// Explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || 
      (process.env.NODE_ENV === 'development' && origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  } else {
    res.sendStatus(403);
  }
});

app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Process recording endpoint - main entry point for large files with smart routing
app.post('/api/process-recording', async (req, res) => {
  // Log request details for debugging
  console.log('Received process-recording request', {
    origin: req.headers.origin,
    method: req.method,
    body: req.body
  });

  // Set CORS headers explicitly for this endpoint
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  try {
    const { recording_id, file_size_mb, duration_minutes, file_type, enable_streaming } = req.body;

    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }

    console.log(`📥 Received processing request for recording: ${recording_id} (${file_size_mb || 'unknown'}MB, ${duration_minutes || 'unknown'}min, streaming: ${enable_streaming || false})`);

    // Smart routing options
    const processingOptions = {
      fileSizeMB: file_size_mb || 0,
      durationMinutes: duration_minutes || 0,
      fileType: file_type || 'audio',
      enableStreaming: enable_streaming || false,
      processingStrategy: 'standard'
    };

    // Process immediately instead of queuing (Azure App Service doesn't have Redis)
    // This runs in background without blocking the response
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting immediate processing for recording: ${recording_id}`);
        const processingResult = await fileProcessor.processRecording(recording_id, processingOptions);
        
        if (processingResult.success) {
          console.log(`✅ Processing completed successfully for recording: ${recording_id}`);
        } else {
          console.error(`❌ Processing failed for recording: ${recording_id}`, processingResult.error);
        }
      } catch (error) {
        console.error(`💥 Processing crashed for recording: ${recording_id}`, error);
      }
    });

    // Return immediate response
    res.json({
      success: true,
      message: 'Processing started successfully',
      recordingId: recording_id,
      jobType: 'immediate',
      estimatedDuration: `${Math.ceil((file_size_mb || 10) * 15)} seconds`,
      streamingEnabled: enable_streaming || false,
      processingMode: 'immediate'
    });

  } catch (error) {
    console.error('Error in process-recording endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Streaming processing endpoint for real-time transcription
app.post('/api/process-streaming', async (req, res) => {
  try {
    const { recording_id, chunk_duration_seconds = 15, overlap_seconds = 2 } = req.body;

    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }

    console.log(`🌊 Streaming processing request for recording: ${recording_id}`);

    // Force streaming processing options
    const streamingOptions = {
      fileSizeMB: 0, // Override size check
      enableStreaming: true,
      streamChunkSeconds: chunk_duration_seconds,
      streamOverlapSeconds: overlap_seconds
    };

    // Process streaming immediately instead of queuing (Azure App Service doesn't have Redis)
    setImmediate(async () => {
      try {
        console.log(`🌊 Starting immediate streaming processing for recording: ${recording_id}`);
        const processingResult = await fileProcessor.processRecording(recording_id, streamingOptions);
        
        if (processingResult.success) {
          console.log(`✅ Streaming processing completed successfully for recording: ${recording_id}`);
        } else {
          console.error(`❌ Streaming processing failed for recording: ${recording_id}`, processingResult.error);
        }
      } catch (error) {
        console.error(`💥 Streaming processing crashed for recording: ${recording_id}`, error);
      }
    });

    res.json({
      success: true,
      message: 'Streaming processing started successfully',
      recordingId: recording_id,
      jobType: 'immediate_streaming',
      streamingEnabled: true,
      chunkDuration: chunk_duration_seconds,
      overlapDuration: overlap_seconds,
      processingMode: 'immediate'
    });

  } catch (error) {
    console.error('Error in streaming processing endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Direct processing endpoint (bypass queue for smaller files)
app.post('/api/process-direct', async (req, res) => {
  try {
    const { recording_id } = req.body;

    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }

    console.log(`🔄 Direct processing request for recording: ${recording_id}`);

    // Process directly without queue
    const result = await fileProcessor.processRecording(recording_id);

    res.json(result);

  } catch (error) {
    console.error('Error in direct processing endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job status (Redis-free implementation)
app.get('/api/job/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    // Extract recording ID from job ID format: "process-{recordingId}"
    const recordingId = jobId.replace('process-', '');
    const result = await fileProcessor.getProcessingStatus(recordingId);
    
    // Convert to job status format for compatibility
    if (result.success) {
      res.json({
        success: true,
        status: {
          id: jobId,
          state: result.status.status === 'completed' ? 'completed' : 
                 result.status.status === 'processing' ? 'active' : 'waiting',
          progress: result.status.progress,
          data: { recordingId },
          processedOn: result.status.updatedAt,
          finishedOn: result.status.status === 'completed' ? result.status.updatedAt : null,
          failedReason: result.status.errorMessage
        }
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recording processing status
app.get('/api/recording/:recordingId/status', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const result = await fileProcessor.getProcessingStatus(recordingId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get processing statistics (Redis-free implementation)
app.get('/api/queue/stats', async (req, res) => {
  try {
    // Return basic stats without Redis queue
    res.json({
      success: true,
      stats: {
        waiting: 0,
        active: 0, // Would need database query to get actual active count
        completed: 0, // Would need database query to get actual completed count
        failed: 0, // Would need database query to get actual failed count
        delayed: 0,
        total: 0,
        mode: 'immediate_processing',
        redisEnabled: false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get comprehensive system statistics (Redis-free implementation)
app.get('/api/system/stats', async (req, res) => {
  try {
    const processorStats = fileProcessor.getProcessorStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      queue: {
        mode: 'immediate_processing',
        redisEnabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      },
      processor: processorStats,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        workerPoolEnabled: !!process.env.ENABLE_PARALLEL_PROCESSING,
        workerPoolSize: parseInt(process.env.WORKER_POOL_SIZE) || 4,
        azureAppService: true,
        redisEnabled: false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel job (Redis-free implementation)
app.post('/api/job/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    // In immediate processing mode, jobs can't be cancelled once started
    res.json({
      success: false,
      error: 'Job cancellation not supported in immediate processing mode',
      mode: 'immediate_processing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry job (Redis-free implementation)
app.post('/api/job/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    // Extract recording ID from job ID format: "process-{recordingId}"
    const recordingId = jobId.replace('process-', '');
    
    console.log(`🔄 Retrying processing for recording: ${recordingId}`);
    
    // Process immediately
    setImmediate(async () => {
      try {
        const processingResult = await fileProcessor.processRecording(recordingId);
        
        if (processingResult.success) {
          console.log(`✅ Retry completed successfully for recording: ${recordingId}`);
        } else {
          console.error(`❌ Retry failed for recording: ${recordingId}`, processingResult.error);
        }
      } catch (error) {
        console.error(`💥 Retry crashed for recording: ${recordingId}`, error);
      }
    });
    
    res.json({
      success: true,
      message: 'Job retry started successfully',
      recordingId,
      processingMode: 'immediate'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch processing endpoint
app.post('/api/batch-process', async (req, res) => {
  try {
    const { recording_ids, concurrency = 3 } = req.body;

    if (!Array.isArray(recording_ids) || recording_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recording_ids array is required'
      });
    }

    console.log(`📦 Batch processing request for ${recording_ids.length} recordings`);

    const result = await fileProcessor.batchProcessRecordings(recording_ids, concurrency);

    res.json(result);

  } catch (error) {
    console.error('Error in batch processing endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clean queue endpoint (Redis-free implementation)
app.post('/api/queue/clean', async (req, res) => {
  try {
    // In immediate processing mode, no queue to clean
    res.json({
      success: true,
      message: 'No queue to clean in immediate processing mode',
      mode: 'immediate_processing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close the server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // No queue to shutdown in immediate processing mode
    console.log('✅ No queue to shutdown (immediate processing mode)');
    
    // Shutdown the file processor and worker pool
    await fileProcessor.shutdown();
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Background worker server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔄 Worker concurrency: ${process.env.WORKER_CONCURRENCY || 3}`);
  console.log(`🌐 CORS origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  
  // Log configuration
  if (process.env.SUPABASE_URL) {
    console.log(`✅ Supabase configured: ${process.env.SUPABASE_URL}`);
  }
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    console.log(`✅ Azure OpenAI configured: ${process.env.AZURE_OPENAI_ENDPOINT}`);
  }
  if (process.env.REDIS_URL) {
    console.log(`✅ Redis configured: ${process.env.REDIS_URL}`);
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;