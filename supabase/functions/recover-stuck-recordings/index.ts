import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { recording_id, force_retry } = await req.json()

    if (!recording_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'recording_id is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔧 Recovering stuck recording: ${recording_id}`)

    // Get current recording status
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single()

    if (fetchError || !recording) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Recording not found: ${fetchError?.message}` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 Current status: ${recording.status}, created: ${recording.created_at}`)

    // Check if recording is actually stuck
    const createdAt = new Date(recording.created_at)
    const now = new Date()
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    const isStuck = (
      recording.status === 'processing' || 
      recording.status === 'transcribing' || 
      recording.status === 'processing_large_file'
    ) && hoursSinceCreated > 0.5 // 30 minutes

    if (!isStuck && !force_retry) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Recording is not stuck. Status: ${recording.status}, age: ${hoursSinceCreated.toFixed(1)} hours`,
          current_status: recording.status,
          hours_since_created: hoursSinceCreated
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🚨 Recording appears stuck: ${recording.status} for ${hoursSinceCreated.toFixed(1)} hours`)

    // Reset status and retry processing
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({ 
        status: 'transcribing',
        processing_progress: 0,
        error_message: `Recovery attempt at ${new Date().toISOString()}. Previous status: ${recording.status}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording_id)

    if (updateError) {
      console.error('❌ Failed to reset recording status:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to reset status: ${updateError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine file size for routing decision
    const fileSizeMB = recording.file_size ? recording.file_size / (1024 * 1024) : 0
    const isLargeFile = fileSizeMB > 50 // 50MB threshold

    let retryResult;

    if (isLargeFile) {
      console.log(`🔄 Retrying large file processing (${fileSizeMB.toFixed(1)}MB)...`)
      
      // Try Azure backend first
      try {
        const azureBackendUrl = Deno.env.get('AZURE_BACKEND_URL') || 'https://soundscribe-backend.azurewebsites.net'
        const azureResponse = await fetch(`${azureBackendUrl}/api/process-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://eci-sound-scribe.lovable.app'
          },
          body: JSON.stringify({
            recording_id: recording_id,
            file_url: recording.file_url,
            file_size: recording.file_size,
            is_large_file: true,
            file_type: recording.file_type || 'audio/mp3'
          })
        })

        if (azureResponse.ok) {
          const azureResult = await azureResponse.json()
          console.log('✅ Azure backend retry successful:', azureResult.message)
          retryResult = {
            method: 'azure_backend',
            result: azureResult
          }
        } else {
          throw new Error(`Azure backend failed: ${azureResponse.status}`)
        }
      } catch (azureError) {
        console.warn('⚠️ Azure backend retry failed, using Edge Function fallback:', azureError)
        
        // Fallback to Edge Function
        const { data: edgeResult, error: edgeError } = await supabaseClient.functions.invoke('process-large-recording', {
          body: { recording_id: recording_id }
        })

        if (edgeError) {
          throw new Error(`Edge Function fallback failed: ${edgeError.message}`)
        }

        retryResult = {
          method: 'edge_function_fallback',
          result: edgeResult
        }
      }
    } else {
      console.log(`🔄 Retrying standard processing (${fileSizeMB.toFixed(1)}MB)...`)
      
      // Use standard Edge Function processing
      const { data: edgeResult, error: edgeError } = await supabaseClient.functions.invoke('process-recording', {
        body: { 
          recording_id: recording_id,
          file_size: recording.file_size
        }
      })

      if (edgeError) {
        throw new Error(`Standard processing retry failed: ${edgeError.message}`)
      }

      retryResult = {
        method: 'standard_processing',
        result: edgeResult
      }
    }

    console.log(`✅ Recovery successful for recording: ${recording_id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Recording recovery initiated successfully',
        recording_id,
        previous_status: recording.status,
        hours_stuck: hoursSinceCreated.toFixed(1),
        retry_method: retryResult.method,
        file_size_mb: fileSizeMB.toFixed(1),
        is_large_file: isLargeFile,
        retry_result: retryResult.result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Recovery function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})