import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { recording_id, optimization_mode = 'standard' } = await req.json()

    if (!recording_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'recording_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🚀 Optimized processing started: ${recording_id} (mode: ${optimization_mode})`)

    // Get recording details
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single()

    if (fetchError || !recording) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recording not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fileSize = recording.file_size || 0
    const fileSizeMB = fileSize / (1024 * 1024)
    
    console.log(`📊 Processing ${fileSizeMB.toFixed(1)}MB file with ${optimization_mode} mode`)

    // Determine processing route based on file size and optimization mode
    if (fileSizeMB > 50 || optimization_mode === 'azure_backend') {
      // Route to Azure backend for large files
      console.log('☁️ Routing to Azure backend for large file processing...')
      
      try {
        const azureBackendUrl = 'https://soundscribe-backend.azurewebsites.net'
        const azureResponse = await fetch(`${azureBackendUrl}/api/process-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Priority': 'high',
            'X-Optimization': 'speed'
          },
          body: JSON.stringify({
            recording_id: recording_id,
            file_url: recording.file_url,
            file_size: recording.file_size,
            is_large_file: true,
            optimization_mode: 'turbo'
          })
        })

        if (azureResponse.ok) {
          const azureResult = await azureResponse.json()
          console.log('✅ Azure backend processing started:', azureResult.message)
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Azure backend processing started with turbo mode',
              estimated_time: Math.ceil(fileSizeMB * 0.4) + ' seconds', // Optimized estimate
              processing_mode: 'azure_turbo',
              optimization_applied: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          throw new Error('Azure backend unavailable')
        }
      } catch (azureError) {
        console.warn('⚠️ Azure backend failed, falling back to Edge Function:', azureError)
        // Continue to Edge Function fallback
      }
    }

    // Edge Function processing with optimizations
    console.log('⚡ Processing with optimized Edge Function...')
    
    // Update status with optimization info
    await supabaseClient
      .from('recordings')
      .update({ 
        status: 'processing',
        processing_progress: 10,
        error_message: null
      })
      .eq('id', recording_id)

    // Start multiple AI processes in parallel
    const processingTasks = []
    
    // Task 1: Primary transcription (if needed)
    if (!recording.transcript) {
      processingTasks.push(
        supabaseClient.functions.invoke('process-audio', {
          body: { recording_id: recording_id }
        })
      )
    }
    
    // Task 2: AI analysis (can run in parallel)
    processingTasks.push(
      supabaseClient.functions.invoke('generate-ai-moments', {
        body: { 
          recording_id: recording_id,
          transcript: recording.transcript || '' 
        }
      })
    )
    
    // Task 3: Generate summary
    processingTasks.push(
      supabaseClient.functions.invoke('generate-call-brief', {
        body: { 
          recordingId: recording_id,
          transcript: recording.transcript || ''
        }
      })
    )

    // Execute tasks in parallel
    console.log(`🔄 Running ${processingTasks.length} parallel tasks...`)
    const results = await Promise.allSettled(processingTasks)
    
    // Process results
    let successCount = 0
    let errors = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++
        console.log(`✅ Task ${index + 1} completed successfully`)
      } else {
        errors.push(`Task ${index + 1}: ${result.reason}`)
        console.error(`❌ Task ${index + 1} failed:`, result.reason)
      }
    })
    
    // Update final status
    if (successCount > 0) {
      await supabaseClient
        .from('recordings')
        .update({ 
          status: 'completed',
          processing_progress: 100,
          ai_generated_at: new Date().toISOString()
        })
        .eq('id', recording_id)
      
      console.log(`🎉 Optimized processing completed: ${successCount}/${processingTasks.length} tasks successful`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Optimized processing completed',
          tasks_completed: successCount,
          total_tasks: processingTasks.length,
          optimization_mode: optimization_mode,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('All processing tasks failed')
    }

  } catch (error) {
    console.error('❌ Optimized processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        optimization_mode: 'fallback'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})