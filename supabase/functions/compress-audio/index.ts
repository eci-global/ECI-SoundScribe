// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';
import { createFFmpeg, fetchFile } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.2';

declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  file_url: string;
  target_format?: 'mp3' | 'wav';
  quality?: number; // bitrate in kbps
  max_size_mb?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('🗜️ Audio compression function started');
    
    const body = await req.json() as RequestBody;
    const { file_url, target_format = 'mp3', quality = 128, max_size_mb = 10 } = body;
    
    if (!file_url) {
      return createErrorResponse('File URL is required', 400);
    }

    console.log(`📁 Processing audio file: ${file_url}`);
    console.log(`🎯 Target: ${target_format} at ${quality}kbps, max ${max_size_mb}MB`);

    // Download the original audio file
    const audioResponse = await fetch(file_url);
    if (!audioResponse.ok) {
      return createErrorResponse('Failed to download audio file', 400);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const originalSizeMB = audioBuffer.byteLength / (1024 * 1024);
    
    console.log(`📊 Original file size: ${originalSizeMB.toFixed(2)}MB`);

    // If file is already small enough, return as-is
    if (originalSizeMB <= max_size_mb) {
      console.log('✅ File already within size limits, no compression needed');
      return createSuccessResponse({
        compressed: false,
        original_size_mb: originalSizeMB,
        final_size_mb: originalSizeMB,
        compression_ratio: 1,
        file_url: file_url
      });
    }

    // Use FFmpeg via WebAssembly for audio compression
    // Note: This is a simplified example - in production, you'd use a proper FFmpeg WASM implementation
    const compressedBuffer = await compressAudioBuffer(audioBuffer, target_format, quality);
    const compressedSizeMB = compressedBuffer.byteLength / (1024 * 1024);
    const compressionRatio = originalSizeMB / compressedSizeMB;

    console.log(`🎉 Compression complete: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${compressionRatio.toFixed(1)}x smaller)`);

    // Upload compressed file to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Storage configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fileName = `compressed_${Date.now()}.${target_format}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, compressedBuffer, {
        contentType: `audio/${target_format}`,
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload compressed file:', uploadError);
      return createErrorResponse('Failed to upload compressed file', 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    return createSuccessResponse({
      compressed: true,
      original_size_mb: originalSizeMB,
      final_size_mb: compressedSizeMB,
      compression_ratio: compressionRatio,
      file_url: publicUrl,
      format: target_format,
      quality: quality
    });

  } catch (error) {
    console.error('Compression error:', error);
    return createErrorResponse('Audio compression failed', 500, {
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Real audio compression using ffmpeg.wasm
async function compressAudioBuffer(buffer: ArrayBuffer, format: string, quality: number): Promise<ArrayBuffer> {
  console.log(`🔧 Compressing audio to ${format} at ${quality}kbps using ffmpeg.wasm...`);
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  ffmpeg.FS('writeFile', 'input.wav', new Uint8Array(buffer));
  // Build ffmpeg command
  const outputFile = `output.${format}`;
  const bitrate = `${quality}k`;
  await ffmpeg.run('-i', 'input.wav', '-b:a', bitrate, outputFile);
  const outputData = ffmpeg.FS('readFile', outputFile);
  return outputData.buffer;
} 