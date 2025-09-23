import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ReanalyzeRequest {
  recording_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { recording_id }: ReanalyzeRequest = await req.json()

    if (!recording_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Recording ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 Starting support reanalysis for recording: ${recording_id}`)

    // Get the existing recording
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, transcript, duration, title')
      .eq('id', recording_id)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch recording: ${fetchError.message}`)
    }

    if (!recording) {
      throw new Error('Recording not found')
    }

    if (!recording.transcript) {
      throw new Error('Recording must have a transcript for support analysis')
    }

    console.log(`📋 Found recording: ${recording.title}`)

    // Call the analyze-support-call function to perform the analysis
    const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
      'analyze-support-call',
      {
        body: {
          recording_id: recording.id,
          transcript: recording.transcript,
          duration: recording.duration || 0,
        },
      }
    )

    if (analysisError) {
      console.error('❌ Analysis function error:', analysisError)
      throw new Error(`Support analysis failed: ${analysisError.message}`)
    }

    if (!analysisResult?.success) {
      console.error('❌ Analysis not successful:', analysisResult)
      throw new Error(analysisResult?.error || 'Support analysis was not successful')
    }

    console.log(`✅ Support reanalysis completed for recording: ${recording_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Support reanalysis completed successfully',
        recording_id,
        analysis: analysisResult.analysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Support reanalysis error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Support reanalysis failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})