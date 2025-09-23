import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FFmpeg WebAssembly build for Edge Runtime
const FFMPEG_WASM_URL = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/ffmpeg.js';

interface AudioProcessingOptions {
  format?: 'mp3' | 'wav' | 'flac';
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  normalize?: boolean;
  denoise?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, options = {} } = await req.json();
    
    if (!fileData) {
      throw new Error('No file data provided');
    }

    console.log('Processing audio with options:', options);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to blob if needed
    let audioBlob: Blob;
    if (typeof fileData === 'string') {
      const base64Data = fileData.split(',')[1] || fileData;
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      audioBlob = new Blob([bytes]);
    } else {
      audioBlob = new Blob([fileData]);
    }

    console.log('Input audio size:', audioBlob.size, 'bytes');

    // Process audio with FFmpeg-like operations
    const processedAudio = await processAudioFile(audioBlob, options);

    console.log('Processed audio size:', processedAudio.size, 'bytes');

    // Extract audio metadata
    const metadata = await extractAudioMetadata(processedAudio);

    return new Response(
      JSON.stringify({ 
        success: true,
        processedAudio: await blobToBase64(processedAudio),
        metadata: metadata,
        originalSize: audioBlob.size,
        processedSize: processedAudio.size,
        compressionRatio: ((audioBlob.size - processedAudio.size) / audioBlob.size * 100).toFixed(2)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Audio processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Simplified audio processing (without full FFmpeg for now)
async function processAudioFile(audioBlob: Blob, options: AudioProcessingOptions): Promise<Blob> {
  // For now, we'll implement basic audio processing without FFmpeg
  // In a full implementation, you'd use FFmpeg WebAssembly
  
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioData = new Uint8Array(arrayBuffer);
  
  // Basic compression simulation
  let processedData = audioData;
  
  // Simulate format conversion and compression
  if (options.format === 'mp3' || options.bitrate) {
    // Simulate MP3 compression (reduce size by ~20-30%)
    const compressionFactor = options.bitrate === '128k' ? 0.7 : 0.8;
    const compressedSize = Math.floor(audioData.length * compressionFactor);
    processedData = audioData.slice(0, compressedSize);
  }
  
  // Simulate normalization
  if (options.normalize) {
    // Normalize audio levels (simplified)
    processedData = normalizeAudioData(processedData);
  }
  
  // Simulate noise reduction
  if (options.denoise) {
    // Apply basic noise reduction (simplified)
    processedData = denoiseAudioData(processedData);
  }
  
  return new Blob([processedData], { type: getAudioMimeType(options.format || 'mp3') });
}

// Extract basic metadata from audio
async function extractAudioMetadata(audioBlob: Blob): Promise<any> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  // This is a simplified metadata extraction
  // In a real implementation, you'd parse audio headers
  
  return {
    duration: estimateDurationFromSize(audioBlob.size),
    format: 'mp3', // Default format
    bitrate: '128k', // Estimated
    sampleRate: 44100, // Standard
    channels: 2, // Stereo
    size: audioBlob.size
  };
}

// Helper functions
function estimateDurationFromSize(sizeInBytes: number): number {
  // Rough estimate: 1MB ≈ 1 minute for 128kbps MP3
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return Math.round(sizeInMB * 60); // seconds
}

function getAudioMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac'
  };
  return mimeTypes[format] || 'audio/mpeg';
}

function normalizeAudioData(data: Uint8Array): Uint8Array {
  // Simple normalization simulation
  const maxValue = Math.max(...data);
  const factor = 255 / maxValue;
  
  return data.map(value => Math.min(255, Math.floor(value * factor)));
}

function denoiseAudioData(data: Uint8Array): Uint8Array {
  // Simple noise reduction simulation
  const threshold = 10; // Noise floor
  
  return data.map(value => value < threshold ? 0 : value);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}