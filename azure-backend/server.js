// server-with-video-support.js
import express from 'express';
import { FileProcessor } from './processor.js';
import { updateRecordingStatus } from './supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Video-Enabled Azure Backend Starting...');
console.log('📊 Node version:', process.version);
console.log('📊 Platform:', process.platform);
console.log('📊 PORT env:', process.env.PORT);

// CORS setup - Allow Vercel deployments and other frontends
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests from localhost, Lovable, and Vercel deployments
  if (!origin ||
      origin.includes('localhost') ||
      origin.includes('.lovable') ||
      origin.includes('.vercel.app') ||
      process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json({ limit: '50mb' }));

// Initialize the full processor with video support
let processor;
try {
  processor = new FileProcessor();
  console.log('✅ Full processor initialized with video support');
} catch (error) {
  console.error('❌ Failed to initialize processor:', error);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime(),
    version: 'video-processing-1.0.0',
    features: ['video-support', 'audio-extraction', 'chunking', 'compression']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Video-Enabled Azure Backend',
    timestamp: new Date().toISOString(),
    port: PORT,
    features: ['video-support', 'audio-extraction', 'chunking', 'compression']
  });
});

// Process audio/video endpoint with full processor
app.post('/api/process-audio', async (req, res) => {
  console.log('🎯 Process-audio request received');
  console.log('📊 Request body:', req.body);

  try {
    const { recording_id, file_url, file_size, file_type } = req.body;

    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }

    if (!file_url) {
      return res.status(400).json({
        success: false,
        error: 'file_url is required'
      });
    }

    const fileSizeMB = file_size ? (file_size / (1024 * 1024)).toFixed(1) : 'unknown';
    console.log(`📥 Processing: recording=${recording_id}, size=${fileSizeMB}MB, type=${file_type || 'unknown'}`);

    // Return immediate response
    res.json({
      success: true,
      message: 'Processing started with video support',
      recordingId: recording_id,
      status: 'processing_started',
      file_size_mb: fileSizeMB,
      file_type: file_type,
      timestamp: new Date().toISOString(),
      features: ['video-support', 'audio-extraction', 'chunking', 'compression']
    });

    console.log(`✅ Process request accepted for recording: ${recording_id}`);

    // Start background processing using the full processor
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting full processor for ${recording_id}`);

        // Update status to processing
        await updateRecordingStatus(recording_id, 'processing', 0);

        // Process with full processor (handles video files automatically)
        const result = await processor.processRecording(recording_id, {
          processingStrategy: 'standard',
          enableVideoProcessing: true,
          enableCompression: true,
          enableChunking: true
        });

        if (result.success) {
          console.log(`🎉 Processing completed successfully for ${recording_id}`);
          await updateRecordingStatus(recording_id, 'completed', 100);
        } else {
          throw new Error(`Processing failed: ${result.error}`);
        }

      } catch (error) {
        console.error(`💥 Processing failed for ${recording_id}:`, error.message);

        // Update status to failed
        try {
          await updateRecordingStatus(recording_id, 'failed', 0, error.message);
        } catch (dbError) {
          console.error('❌ Failed to update error status:', dbError.message);
        }
      }
    });

  } catch (error) {
    console.error('❌ Process endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`✅ Video-enabled server running on port ${PORT}`);
  console.log(`🎬 Features: Video processing, audio extraction, chunking, compression`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error(' Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Video-enabled server setup completed'); 