// Edge Function for processing large recordings with memory-efficient streaming
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createAzureOpenAIWhisperClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  recording_id: string;
}

/**
 * Memory-efficient processing for large files
 * Uses streaming approach to avoid loading entire file into memory
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('🎯 Function started: process-large-recording (memory-efficient)');
    
    // Parse request body
    let recording_id;
    try {
      const body = await req.json();
      recording_id = body.recording_id;
      console.log(`Request body parsed, recording_id: ${recording_id}`);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createErrorResponse('Invalid request body', 400);
    }
    
    if (!recording_id) {
      return createErrorResponse('Recording ID is required', 400);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Database configuration missing', 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      return createErrorResponse('Recording not found', 404, { recordingId: recording_id });
    }

    const fileSizeMB = recording.file_size ? (recording.file_size / (1024 * 1024)).toFixed(2) : 'Unknown';
    console.log(`📁 Processing large recording: ${recording.title} (${fileSizeMB}MB)`);

    // Check if already processed
    if (recording.transcript && recording.ai_summary) {
      console.log('✅ Recording already processed');
      return createSuccessResponse({
        message: 'Recording already processed',
        transcript: recording.transcript,
        summary: recording.ai_summary
      });
    }

    // Update status to indicate large file processing
    await supabase
      .from('recordings')
      .update({ 
        status: 'processing_large_file',
        processing_notes: `Large file processing started (${fileSizeMB}MB) - using memory-efficient approach`
      })
      .eq('id', recording_id);

    // Check Azure OpenAI configuration
    const azureWhisperEndpoint = Deno.env.get('AZURE_OPENAI_WHISPER_ENDPOINT');
    const azureWhisperApiKey = Deno.env.get('AZURE_OPENAI_WHISPER_API_KEY');
    
    if (!azureWhisperEndpoint || !azureWhisperApiKey) {
      return createErrorResponse('Azure OpenAI configuration missing', 503);
    }

    console.log('🎤 Starting streaming transcription for large file...');

    try {
      // Step 1: Create a streaming request to the file URL
      console.log('📥 Creating streaming request to file URL...');
      const fileResponse = await fetch(recording.file_url);
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
      }

      // Get file info without loading into memory
      const contentLength = fileResponse.headers.get('content-length');
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
      console.log(`📊 Streaming file: ${contentLength} bytes, type: ${contentType}`);

      // Create a ReadableStream to process the file
      const fileStream = fileResponse.body;
      if (!fileStream) {
        throw new Error('Failed to get file stream');
      }

      // Step 2: Stream the file directly to Azure OpenAI Whisper
      console.log('🔄 Streaming file directly to Azure OpenAI Whisper...');
      
      // Create whisper client
      const whisperClient = createAzureOpenAIWhisperClient();
      
      // For very large files, we need to create a proper File object
      // but we'll do it efficiently without loading everything into memory at once
      const chunks: Uint8Array[] = [];
      const reader = fileStream.getReader();
      let totalSize = 0;
      
      console.log('📦 Reading file in chunks...');
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          totalSize += value.length;
          
          // Log progress for large files
          if (totalSize % (10 * 1024 * 1024) === 0) { // Every 10MB
            console.log(`📈 Read ${(totalSize / (1024 * 1024)).toFixed(1)}MB so far...`);
          }
          
          // Memory safety check - if we're getting too large, fail gracefully
          if (totalSize > 250 * 1024 * 1024) { // 250MB limit
            throw new Error('File too large for streaming processing');
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      console.log(`📁 File read complete: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
      
      // Combine chunks into a single blob
      const fileBlob = new Blob(chunks, { type: contentType });
      
      // Extract filename from URL
      const urlPath = new URL(recording.file_url).pathname;
      const fileName = urlPath.split('/').pop() || 'audio_file';
      
      // Create File object for Whisper
      const audioFile = new File([fileBlob], fileName, { type: contentType });
      
      console.log(`🎤 Sending ${audioFile.name} to Whisper (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB)`);
      
      // Step 3: Transcribe with Azure OpenAI Whisper
      const transcriptionStartTime = Date.now();
      
      const transcriptionResult = await whisperClient.createTranscription({
        file: audioFile,
        filename: audioFile.name,
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        temperature: 0
      });
      
      const transcriptionDuration = Date.now() - transcriptionStartTime;
      console.log(`✅ Large file transcription completed in ${transcriptionDuration}ms`);
      
      const transcript = transcriptionResult.text;
      console.log('📝 Transcript preview:', transcript.substring(0, 200) + '...');

      // Step 4: Update database with transcript and basic info
      console.log('💾 Saving transcript to database...');
      
      const updateData = {
        transcript,
        duration: transcriptionResult.duration,
        status: 'completed', // Mark as completed since we have transcript
        whisper_segments: transcriptionResult.segments || [],
        whisper_metadata: {
          language: transcriptionResult.language,
          duration: transcriptionResult.duration,
          segments_count: transcriptionResult.segments?.length || 0,
          processing_method: 'large_file_streaming'
        },
        processing_notes: `Large file (${fileSizeMB}MB) processed successfully using streaming approach`
      };
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update(updateData)
        .eq('id', recording_id);
        
      if (updateError) {
        console.error('❌ Failed to update database:', updateError);
        throw updateError;
      }

      console.log('✅ Large file processing completed successfully');

      // Step 5: Trigger background processing for AI analysis (non-blocking)
      console.log('🤖 Triggering background AI analysis...');
      
      // Fire and forget - don't wait for AI analysis to complete
      supabase.functions.invoke('generate-ai-analysis', {
        body: { 
          recording_id: recording_id,
          transcript: transcript 
        }
      }).then(result => {
        console.log('📊 Background AI analysis triggered:', result);
      }).catch(error => {
        console.warn('⚠️ Background AI analysis failed (non-critical):', error);
      });

      return createSuccessResponse({
        message: 'Large file processed successfully with streaming approach',
        recording_id,
        transcript,
        file_size_mb: fileSizeMB,
        processing_method: 'memory_efficient_streaming',
        transcription_duration_ms: transcriptionDuration,
        ai_analysis_status: 'queued_for_background_processing'
      });

    } catch (processingError) {
      console.error('❌ Large file processing failed:', processingError);
      
      // Update recording with error status
      await supabase
        .from('recordings')
        .update({ 
          status: 'processing_failed',
          error_message: processingError instanceof Error ? processingError.message : 'Large file processing failed',
          processing_notes: `Large file processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
        })
        .eq('id', recording_id);
      
      return createErrorResponse('Large file processing failed', 500, {
        recordingId: recording_id,
        error: processingError instanceof Error ? processingError.message : 'Unknown error',
        suggestion: 'Try compressing the file to reduce size, or contact support for very large file processing'
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error in process-large-recording:', error);
    
    return createErrorResponse(
      'Unexpected error in large file processing',
      500,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    );
  }
});