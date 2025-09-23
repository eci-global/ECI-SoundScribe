const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const FormData = require('form-data');

// Load environment variables
dotenv.config();

console.log('🚀 Emergency Fix Server Starting...');
console.log('📊 Port:', process.env.PORT || 3001);

const app = express();
const PORT = process.env.PORT || 3001;

// Simple Azure OpenAI configuration
const azureConfig = {
  endpoint: process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_TRANSCRIBE_API_KEY || process.env.AZURE_OPENAI_API_KEY,
  transcribeDeployment: process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT || 'gpt-4o-transcribe',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-01-preview'
};

console.log('🔧 Azure Config:', {
  hasEndpoint: !!azureConfig.endpoint,
  hasApiKey: !!azureConfig.apiKey,
  transcribeDeployment: azureConfig.transcribeDeployment
});

// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'https://preview--echo-ai-scribe-app.lovable.app',
  'https://echo-ai-scribe-app.lovable.app',
  'https://f9827dbd-5df6-4d40-9bdf-efa5c5236ea6.lovableproject.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin && origin.includes('.lovable')) return callback(null, true);
    if (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'emergency-fix-1.0.0',
    port: PORT,
    azureConfig: {
      hasEndpoint: !!azureConfig.endpoint,
      hasApiKey: !!azureConfig.apiKey
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Emergency Fix Azure Backend',
    status: 'running',
    timestamp: new Date().toISOString(),
    note: 'Simplified version for debugging'
  });
});

// Simple transcription endpoint
async function simpleTranscribe(audioData, filename) {
  try {
    const formData = new FormData();
    formData.append('file', audioData, filename);
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    
    const url = `${azureConfig.endpoint}/openai/deployments/${azureConfig.transcribeDeployment}/audio/transcriptions?api-version=${azureConfig.apiVersion}`;
    
    const response = await axios.post(url, formData, {
      headers: {
        'api-key': azureConfig.apiKey,
        ...formData.getHeaders()
      },
      timeout: 300000
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

// Process endpoint
app.post('/api/process-audio', async (req, res) => {
  console.log('🎯 Process request received');
  
  try {
    const { recording_id, file_url } = req.body;
    
    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: 'recording_id is required'
      });
    }
    
    // Return immediate response
    res.json({
      success: true,
      message: 'Emergency fix processing started',
      recordingId: recording_id,
      status: 'processing_started',
      note: 'Simplified processing without FFmpeg'
    });
    
    // Simple background processing
    setImmediate(async () => {
      try {
        console.log(`📥 Emergency processing for recording: ${recording_id}`);
        
        // Download file
        const response = await axios.get(file_url, { 
          responseType: 'arraybuffer',
          timeout: 60000
        });
        const audioBuffer = Buffer.from(response.data);
        
        // Simple transcription (no chunking)
        const result = await simpleTranscribe(audioBuffer, `recording_${recording_id}.mp3`);
        
        if (result.success) {
          console.log(`✅ Emergency processing SUCCESS for ${recording_id}`);
        } else {
          console.log(`❌ Emergency processing FAILED for ${recording_id}:`, result.error);
        }
        
      } catch (error) {
        console.error(`💥 Emergency processing ERROR for ${recording_id}:`, error.message);
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
app.listen(PORT, () => {
  console.log(`✅ Emergency Fix Server running on port ${PORT}`);
  console.log(`🔗 Health: https://soundscribe-backend.azurewebsites.net/health`);
});

module.exports = app;