import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DurationExtractionRequest {
  recording_id: string;
  file_url: string;
  force_extraction?: boolean;
}

interface DurationExtractionResult {
  success: boolean;
  duration?: number | null;
  method?: string;
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recording_id, file_url, force_extraction = false }: DurationExtractionRequest = await req.json()

    if (!recording_id || !file_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing recording_id or file_url' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔧 Starting server-side duration extraction for recording: ${recording_id}`)
    console.log(`📁 File URL: ${file_url}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if recording exists and get current duration
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('id, duration, file_size, title')
      .eq('id', recording_id)
      .single()

    if (recordingError || !recording) {
      throw new Error(`Recording not found: ${recordingError?.message}`)
    }

    console.log(`📊 Current duration: ${recording.duration}s`)

    // Check if we have a suspicious duration that needs re-extraction
    const isSuspiciousDuration = recording.duration === 9 || recording.duration === 11 || 
                                 (recording.duration && recording.duration < 5);
    
    // If we have a valid duration and not forcing extraction and it's not suspicious, return it
    if (!force_extraction && recording.duration && recording.duration > 12 && recording.duration < 86400 && !isSuspiciousDuration) {
      console.log(`✅ Using existing valid duration: ${recording.duration}s`)
      return new Response(
        JSON.stringify({
          success: true,
          duration: recording.duration,
          method: 'existing_valid',
          confidence: 'high'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Log if we're forcing extraction due to suspicious duration
    if (isSuspiciousDuration) {
      console.log(`⚠️ Suspicious duration detected (${recording.duration}s) - forcing server-side extraction`)
    }

    // Try to extract duration using server-side methods
    let extractedDuration: number | null = null
    let extractionMethod = 'none'
    let confidence: 'high' | 'medium' | 'low' = 'low'

    try {
      console.log(`🌐 Fetching file from URL...`)
      const response = await fetch(file_url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log(`📊 File downloaded: ${blob.size} bytes, type: ${blob.type}`)

      // Method 1: Try to use WebCodecs API if available (Deno 1.40+)
      try {
        if ('VideoDecoder' in globalThis) {
          console.log(`🎬 Attempting VideoDecoder extraction...`)
          // VideoDecoder approach for server-side duration extraction
          // This is experimental and may not work in all Deno versions
        }
      } catch (videoError) {
        console.warn(`⚠️ VideoDecoder not available: ${videoError.message}`)
      }

      // Method 2: Estimate from file size and format
      console.log(`📊 Estimating duration from file size...`)
      
      const fileSizeBytes = blob.size
      let estimatedDuration: number | null = null

      if (blob.type.startsWith('audio/mp3') || blob.type.startsWith('audio/mpeg')) {
        // MP3: ~128kbps average
        estimatedDuration = fileSizeBytes / (128 * 1024 / 8)
        extractionMethod = 'mp3_size_estimate'
        confidence = 'medium'
      } else if (blob.type.startsWith('audio/wav')) {
        // WAV: ~1.4MB per minute uncompressed
        estimatedDuration = fileSizeBytes / (1.4 * 1024 * 1024 / 60)
        extractionMethod = 'wav_size_estimate'
        confidence = 'medium'
      } else if (blob.type.startsWith('audio/')) {
        // Generic audio: assume 128kbps
        estimatedDuration = fileSizeBytes / (128 * 1024 / 8)
        extractionMethod = 'audio_size_estimate'
        confidence = 'low'
      } else if (blob.type.startsWith('video/')) {
        // Video: assume 1Mbps average (video + audio)
        estimatedDuration = fileSizeBytes / (1000 * 1024 / 8)
        extractionMethod = 'video_size_estimate'
        confidence = 'low'
      }

      if (estimatedDuration && estimatedDuration > 10 && estimatedDuration < 86400) {
        extractedDuration = Math.round(estimatedDuration)
        
        // Additional validation to reject suspicious durations
        if (extractedDuration === 9 || extractedDuration === 11) {
          console.warn(`⚠️ Server extraction also returned suspicious duration (${extractedDuration}s) - rejecting`)
          extractedDuration = null
          extractionMethod = 'rejected_suspicious'
        } else {
          console.log(`📊 Estimated duration: ${extractedDuration}s using ${extractionMethod}`)
        }
      }

    } catch (fetchError) {
      console.error(`❌ Failed to fetch or analyze file: ${fetchError.message}`)
    }

    // Method 3: Fallback to transcript-based estimation if available
    if (!extractedDuration) {
      console.log(`📝 Attempting transcript-based estimation...`)
      
      const { data: recordingWithTranscript } = await supabase
        .from('recordings')
        .select('transcript')
        .eq('id', recording_id)
        .single()

      if (recordingWithTranscript?.transcript && recordingWithTranscript.transcript.length > 1000) {
        // Rough estimate: 150-200 words per minute, ~7 characters per word
        const estimatedDuration = Math.max(180, Math.min(7200, 
          (recordingWithTranscript.transcript.length / 7) * (60 / 175)
        ))
        extractedDuration = Math.round(estimatedDuration)
        extractionMethod = 'transcript_estimate'
        confidence = 'low'
        console.log(`📝 Transcript-based duration estimate: ${extractedDuration}s`)
      }
    }

    // If we got a duration, update the recording
    if (extractedDuration && extractedDuration > 0) {
      console.log(`💾 Updating recording with extracted duration: ${extractedDuration}s`)
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          duration: extractedDuration,
          server_extraction_metadata: {
            extracted_at: new Date().toISOString(),
            method: extractionMethod,
            confidence: confidence,
            original_duration: recording.duration,
            file_size: blob?.size || recording.file_size
          }
        })
        .eq('id', recording_id)

      if (updateError) {
        console.error(`❌ Failed to update recording: ${updateError.message}`)
        throw updateError
      }

      return new Response(
        JSON.stringify({
          success: true,
          duration: extractedDuration,
          method: extractionMethod,
          confidence: confidence
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // No duration could be extracted
      console.error(`❌ Could not extract duration using any method`)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract duration using server-side methods',
          method: 'all_failed'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Duration extraction error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})