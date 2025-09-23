const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Azure Backend Worker started - Simplified mode');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

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
    if (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost')) {
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
      (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost'))) {
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    corsEnabled: true,
    allowedOrigins: allowedOrigins
  });
});

// Process recording endpoint - simplified version
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
    const { recording_id } = req.body;

    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }

    console.log(`📥 Received processing request for recording: ${recording_id}`);

    // For now, just return a success response to fix CORS
    // TODO: Implement actual processing logic
    res.json({
      success: true,
      message: 'Recording queued for processing (simplified mode)',
      recordingId: recording_id,
      jobType: 'queued',
      status: 'accepted',
      note: 'This is a simplified response to fix CORS. Full processing will be implemented next.'
    });

    console.log(`✅ Processing request accepted for recording: ${recording_id}`);

  } catch (error) {
    console.error('Error in process-recording endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🌟 SoundScribe Azure Backend (Simplified) started on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Process endpoint: http://localhost:${PORT}/api/process-recording`);
  console.log(`🌐 CORS enabled for origins:`, allowedOrigins);
});

module.exports = app;