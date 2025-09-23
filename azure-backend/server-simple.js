// Azure Backend with Transcription - Built from working ultra-minimal version
console.log('🚀 Azure Backend with Transcription starting...');
console.log('📊 Node version:', process.version);
console.log('📊 Platform:', process.platform);
console.log('📊 PORT env:', process.env.PORT);

import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import { URL } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('📊 Attempting to create Express app...');

// Add JSON body parsing middleware
app.use(express.json({ limit: '50mb' }));
console.log('📊 JSON middleware added');

// Function to clean Azure OpenAI URLs - FIXED VERSION
function cleanAzureEndpoint(url) {
  if (!url) return null;
  
  // Remove any malformed parts and ensure proper formatting
  let cleanUrl = url.trim();
  
  // Fix protocol if missing
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  // Remove any deployment-specific paths that might be in the env var
  cleanUrl = cleanUrl
    .replace(/\/openai\/deployments\/.*$/, '')  // Remove /openai/deployments/...
    .replace(/\/audio\/transcriptions.*$/, '')   // Remove /audio/transcriptions...
    .replace(/\?.*$/, '');                      // Remove query parameters
  
  // Ensure single slashes (except for protocol)
  cleanUrl = cleanUrl.replace(/([^:])\/\/+/g, '$1/');
  
  // Ensure it ends with a single slash for consistent URL building
  if (!cleanUrl.endsWith('/')) {
    cleanUrl += '/';
  }
  
  return cleanUrl;
}

// Azure OpenAI Configuration with PERMANENT FIXES
const rawEndpoint = process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT || 
                   process.env.AZURE_OPENAI_ENDPOINT || 
                   'https://eastus.api.cognitive.microsoft.com/';

const azureConfig = {
  endpoint: cleanAzureEndpoint(rawEndpoint),
  apiKey: process.env.AZURE_OPENAI_TRANSCRIBE_API_KEY || 
          process.env.AZURE_OPENAI_API_KEY || 
          process.env.AZURE_OPENAI_KEY,
  transcribeDeployment: process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT || 'gpt-4o-transcribe',
  // HARDCODED correct API version - no more 2025 errors!
  apiVersion: '2024-10-01-preview'
};

// Comprehensive configuration logging
console.log('🔧 Azure OpenAI Config:', {
  hasEndpoint: !!azureConfig.endpoint,
  hasApiKey: !!azureConfig.apiKey,
  transcribeDeployment: azureConfig.transcribeDeployment,
  apiVersion: azureConfig.apiVersion,
  rawEndpoint: rawEndpoint,
  cleanedEndpoint: azureConfig.endpoint
});

// DNS pre-check at startup

if (azureConfig.endpoint) {
  try {
    const endpointUrl = new URL(azureConfig.endpoint);
    const hostname = endpointUrl.hostname;
    
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`❌ DNS lookup failed for ${hostname}:`, err.message);
        console.error('🔍 Please check your Azure OpenAI endpoint configuration');
      } else {
        console.log(`✅ DNS resolved ${hostname} to ${address}`);
      }
    });
  } catch (urlError) {
    console.error('❌ Invalid endpoint URL:', urlError.message);
  }
}

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase configuration missing');
}

// Initialize Azure OpenAI Client for AI analysis using dynamic import
let azureAIClient = null;
let aiClientInitialized = false;

async function initializeAzureAIClient() {
  if (aiClientInitialized) return azureAIClient;
  
  try {
    console.log('🔄 Initializing Azure OpenAI AI client...');
    const { AzureOpenAIClient } = await import('./utils/azureOpenAI.js');
    azureAIClient = new AzureOpenAIClient();
    aiClientInitialized = true;
    console.log('✅ Azure OpenAI AI client initialized for summary generation');
    return azureAIClient;
  } catch (error) {
    console.error('❌ Failed to initialize Azure OpenAI AI client:', error.message);
    console.error('❌ Error details:', error);
    console.warn('⚠️ AI summary generation will be disabled');
    aiClientInitialized = false;
    return null;
  }
}

// Initialize the AI client immediately and don't block
initializeAzureAIClient().then(() => {
  console.log(`🔍 AI Client initialization status: ${aiClientInitialized}`);
}).catch(error => {
  console.error('❌ AI Client initialization failed:', error.message);
});

app.get('/', (req, res) => {
  console.log('📥 Root request received');
  res.json({ 
    message: 'Ultra-minimal Azure backend - FIXED', 
    timestamp: new Date().toISOString(),
    port: PORT,
    note: 'Running the correct ultra-minimal server now'
  });
});

app.get('/health', (req, res) => {
  console.log('📥 Health check request received');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime(),
    version: 'permanent-fix-1.0.0',
    apiVersion: azureConfig.apiVersion,
    deployment: azureConfig.transcribeDeployment,
    features: {
      transcription: true,
      aiSummaryGeneration: !!azureAIClient,
      aiClientInitialized: aiClientInitialized,
      supabaseIntegration: !!supabase
    }
  });
});

// Debug configuration endpoint
app.get('/api/debug-config', (req, res) => {
  console.log('🔍 Debug config request received');
  
  // Build the URL that will be used for transcription
  const transcriptionUrl = `${azureConfig.endpoint}openai/deployments/${azureConfig.transcribeDeployment}/audio/transcriptions?api-version=${azureConfig.apiVersion}`;
  
  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
      AZURE_OPENAI_TRANSCRIBE_ENDPOINT: process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT,
      AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION
    },
    azureConfig: {
      endpoint: azureConfig.endpoint,
      hasApiKey: !!azureConfig.apiKey,
      transcribeDeployment: azureConfig.transcribeDeployment,
      apiVersion: azureConfig.apiVersion
    },
    constructedUrl: transcriptionUrl,
    urlValidation: {
      hasDoubleSlash: transcriptionUrl.includes('//openai'),
      apiVersionCorrect: azureConfig.apiVersion === '2024-10-01-preview'
    }
  });
});

// Simple transcription function with chunking support
async function transcribeAudio(audioBuffer, filename) {
  try {
    console.log(`🎙️ Starting transcription for ${filename}...`);
    
    // Check if we need chunking (files longer than 20 minutes)
    const needsChunking = await shouldChunkAudio(audioBuffer, filename);
    
    if (needsChunking) {
      console.log('🔀 Audio file is long, using chunking strategy...');
      return await transcribeWithChunking(audioBuffer, filename);
    } else {
      console.log('📄 Processing as single file...');
      return await transcribeSingleFile(audioBuffer, filename);
    }
  } catch (error) {
    console.error('❌ Transcription failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

// Check if audio needs chunking
async function shouldChunkAudio(audioBuffer, filename) {
  try {
    // For now, use file size as a rough indicator
    // Files larger than 50MB are likely to be longer than 20 minutes
    const fileSizeMB = audioBuffer.length / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(1)}MB`);
    
    if (fileSizeMB > 50) {
      console.log('⚠️ Large file detected, will use chunking');
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Could not determine audio duration, proceeding with single file');
    return false;
  }
}

// Transcribe single file
async function transcribeSingleFile(audioBuffer, filename) {
  const formData = new FormData();
  formData.append('file', audioBuffer, filename);
  formData.append('response_format', 'json');
  formData.append('temperature', '0');
  
  // Ensure proper URL construction without double slashes
  const baseEndpoint = azureConfig.endpoint.endsWith('/') ? azureConfig.endpoint.slice(0, -1) : azureConfig.endpoint;
  const url = `${baseEndpoint}/openai/deployments/${azureConfig.transcribeDeployment}/audio/transcriptions?api-version=${azureConfig.apiVersion}`;
  
  console.log('🔗 Transcription URL:', url);
  
  const response = await axios.post(url, formData, {
    headers: {
      'api-key': azureConfig.apiKey,
      ...formData.getHeaders()
    },
    timeout: 300000, // 5 minutes
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  
  console.log('✅ Single file transcription completed successfully');
  return {
    success: true,
    data: response.data
  };
}

// Transcribe with chunking
async function transcribeWithChunking(audioBuffer, filename) {
  try {
    console.log('🔀 Starting chunked transcription...');
    
    // Split audio into chunks (roughly 20 minutes each)
    const chunks = await splitAudioIntoChunks(audioBuffer, filename);
    console.log(`📂 Split audio into ${chunks.length} chunks`);
    
    const transcriptions = [];
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🎙️ Transcribing chunk ${i + 1}/${chunks.length}...`);
      
      const chunkResult = await transcribeSingleFile(chunk.buffer, chunk.filename);
      
      if (chunkResult.success) {
        transcriptions.push({
          index: i,
          text: chunkResult.data.text,
          startTime: chunk.startTime,
          duration: chunk.duration
        });
        console.log(`✅ Chunk ${i + 1} transcribed successfully`);
      } else {
        console.error(`❌ Chunk ${i + 1} failed:`, chunkResult.error);
        throw new Error(`Chunk ${i + 1} transcription failed: ${chunkResult.error}`);
      }
    }
    
    // Combine transcriptions
    const combinedText = transcriptions
      .sort((a, b) => a.index - b.index)
      .map(t => t.text)
      .join(' ');
    
    console.log('✅ Chunked transcription completed successfully');
    return {
      success: true,
      data: {
        text: combinedText,
        duration: transcriptions.reduce((total, t) => total + (t.duration || 0), 0),
        chunks: transcriptions.length
      }
    };
    
  } catch (error) {
    console.error('❌ Chunked transcription failed:', error);
    throw error;
  }
}

// Split audio into chunks using simple size-based approach
async function splitAudioIntoChunks(audioBuffer, filename) {
  try {
    console.log('✂️ Splitting audio into chunks...');
    
    // Use simple size-based splitting to avoid format issues
    const chunkSize = 15 * 1024 * 1024; // 15MB chunks (roughly 15 minutes)
    const chunks = [];
    
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunkBuffer = audioBuffer.slice(i, i + chunkSize);
      const chunkFilename = `${filename.split('.')[0]}_chunk_${chunks.length}.wav`;
      
      chunks.push({
        index: chunks.length,
        buffer: chunkBuffer,
        filename: chunkFilename,
        startTime: chunks.length * 15 * 60, // Rough estimate: 15 minutes per chunk
        duration: 15 * 60 // 15 minutes
      });
    }
    
    console.log(`✅ Split into ${chunks.length} chunks`);
    return chunks;
    
  } catch (error) {
    console.error('❌ Failed to split audio:', error);
    throw error;
  }
}



// Update recording in database
async function updateRecording(recordingId, transcript, duration, aiSummary = null) {
  try {
    console.log('💾 Updating recording in database...');
    
    const updateData = {
      transcript: transcript,
      duration: duration,
      status: 'completed',
      processed_at: new Date().toISOString()
    };
    
    // Add AI summary if available
    if (aiSummary) {
      updateData.ai_summary = aiSummary;
      console.log('📝 Including AI summary in database update');
    }
    
    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', recordingId)
      .select();
    
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
    
    console.log('✅ Recording updated in database');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Process audio endpoint with transcription
app.post('/api/process-audio', async (req, res) => {
  console.log('🎯 Process-audio request received');
  console.log('📊 Request body:', req.body);
  
  try {
    const { recording_id, file_url, file_size } = req.body;
    
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
    console.log(`📥 Processing: recording=${recording_id}, size=${fileSizeMB}MB`);
    
    // Return immediate response
    res.json({
      success: true,
      message: 'Audio processing started with transcription',
      recordingId: recording_id,
      status: 'processing_started',
      file_size_mb: fileSizeMB,
      timestamp: new Date().toISOString(),
      azure_backend: true,
      transcription_enabled: true
    });
    
    console.log(`✅ Process request accepted for recording: ${recording_id}`);
    
    // Start background processing
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting background processing for ${recording_id}`);
        
        // Update status to processing
        if (supabase) {
          await supabase
            .from('recordings')
            .update({ status: 'processing' })
            .eq('id', recording_id);
        }
        
        // Download file
        console.log('📥 Downloading audio file...');
        const response = await axios.get(file_url, {
          responseType: 'arraybuffer',
          timeout: 60000
        });
        const audioBuffer = Buffer.from(response.data);
        console.log(`📊 Downloaded ${(audioBuffer.length / (1024 * 1024)).toFixed(1)}MB`);
        
        // Transcribe audio
        const filename = `recording_${recording_id}.wav`;
        const transcriptionResult = await transcribeAudio(audioBuffer, filename);
        
        if (!transcriptionResult.success) {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        }
        
        // Debug: Log the actual structure of transcription result
        console.log('🔍 Transcription result structure:', JSON.stringify(transcriptionResult.data, null, 2));
        
        // Extract transcript text - handle different response formats
        let transcript;
        if (typeof transcriptionResult.data === 'string') {
          // If the response is already a string
          transcript = transcriptionResult.data;
        } else if (transcriptionResult.data.text) {
          // If the response is an object with a 'text' property
          transcript = transcriptionResult.data.text;
        } else if (typeof transcriptionResult.data === 'object') {
          // If it's an object but no 'text' property, convert to string
          transcript = JSON.stringify(transcriptionResult.data);
          console.warn('⚠️ Unexpected transcription data format, using JSON string');
        } else {
          throw new Error('Unable to extract transcript text from response');
        }
        
        const duration = transcriptionResult.data.duration || null;
        
        console.log(`📊 Transcription completed: ${transcript.length} characters`);
        console.log(`📝 Transcript preview: ${transcript.substring(0, 200)}...`);
        
        // Generate AI summary
        let aiSummary = null;
        console.log('🔍 AI Summary Generation Debug:');
        console.log(`   azureAIClient available: ${!!azureAIClient}`);
        console.log(`   aiClientInitialized: ${aiClientInitialized}`);
        console.log(`   transcript available: ${!!transcript}`);
        console.log(`   transcript length: ${transcript ? transcript.length : 'null'}`);
        console.log(`   transcript is string: ${typeof transcript === 'string'}`);
        
        // Try to initialize AI client if not ready
        if (!azureAIClient && !aiClientInitialized) {
          console.log('🔄 AI client not ready, attempting on-demand initialization...');
          azureAIClient = await initializeAzureAIClient();
        }
        
        if (azureAIClient && transcript && transcript.trim().length > 50) {
          try {
            console.log('🤖 Generating AI summary...');
            console.log(`🔍 About to call generateSummary with transcript: ${transcript.substring(0, 200)}...`);
            const summaryResult = await azureAIClient.generateSummary(transcript);
            console.log('🔍 Summary result:', JSON.stringify(summaryResult, null, 2));
            
            if (summaryResult.success && summaryResult.data) {
              // Extract the text content from the AI response
              const content = summaryResult.data.choices?.[0]?.message?.content;
              if (content && content.trim()) {
                aiSummary = content.trim();
                console.log(`✅ AI summary generated: ${aiSummary.length} characters`);
              } else {
                console.warn('⚠️ AI summary response was empty');
              }
            } else if (summaryResult.rateLimited) {
              console.warn(`⚠️ AI summary generation rate limited - continuing without summary`);
            } else {
              console.warn(`⚠️ AI summary generation failed: ${summaryResult.error}`);
            }
          } catch (summaryError) {
            console.error('❌ AI summary generation error:', summaryError.message);
            // Continue processing without summary - don't fail the entire process
          }
        } else {
          if (!azureAIClient) {
            console.error('❌ Azure AI client not available - skipping summary generation');
            console.error('🔍 This means AI client initialization failed even with on-demand attempt');
          } else if (!transcript) {
            console.error('❌ No transcript available for summary generation');
          } else if (transcript.trim().length <= 50) {
            console.warn(`⚠️ Transcript too short for meaningful summary (${transcript.trim().length} chars) - skipping summary generation`);
          } else {
            console.error('❌ Unknown condition preventing AI summary generation');
          }
        }
        
        // Debug: Log what we're about to store in the database
        console.log('💾 Database update data:');
        console.log(`   Transcript length: ${transcript ? transcript.length : 'null'} characters`);
        console.log(`   AI Summary length: ${aiSummary ? aiSummary.length : 'null'} characters`);
        console.log(`   Duration: ${duration} seconds`);
        console.log(`   Transcript preview: ${transcript ? transcript.substring(0, 100) : 'null'}...`);
        console.log(`   AI Summary preview: ${aiSummary ? aiSummary.substring(0, 100) : 'null'}...`);
        
        // Update database with transcript and AI summary
        if (supabase) {
          const updateResult = await updateRecording(recording_id, transcript, duration, aiSummary);
          if (!updateResult.success) {
            throw new Error(`Database update failed: ${updateResult.error}`);
          }
        }
        
        // Log completion with summary status
        const completionMessage = aiSummary 
          ? `🎉 Processing completed successfully for ${recording_id} with AI summary`
          : `🎉 Processing completed successfully for ${recording_id} (transcript only)`;
        console.log(completionMessage);
        
      } catch (error) {
        console.error(`💥 Background processing failed for ${recording_id}:`, error.message);
        
        // Update status to failed
        if (supabase) {
          try {
            await supabase
              .from('recordings')
              .update({
                status: 'failed',
                processed_at: new Date().toISOString()
              })
              .eq('id', recording_id);
          } catch (dbError) {
            console.error('❌ Failed to update error status:', dbError.message);
          }
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

console.log('📊 Attempting to listen on port:', PORT);

app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`✅ Ultra-minimal server running on port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Server script completed setup');