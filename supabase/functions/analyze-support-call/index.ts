import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SupportAnalysisRequest {
  recording_id: string;
  transcript: string;
  duration: number;
}

interface ServqualMetrics {
  empathy: number;
  assurance: number;
  responsiveness: number;
  reliability: number;
  tangibles: number;
}

interface SupportAnalysisResult {
  servqualMetrics: ServqualMetrics;
  customerSatisfaction: number;
  escalationRisk: 'low' | 'medium' | 'high';
  resolutionEffectiveness: number;
  keyInsights: string[];
  coachingRecommendations: string[];
  escalationIndicators: string[];
  satisfactionSignals: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { recording_id, transcript, duration }: SupportAnalysisRequest = await req.json()

    if (!recording_id || !transcript) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Recording ID and transcript are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 Starting support analysis for recording: ${recording_id}`)

    // Create Azure OpenAI client with timeout protection
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const azureApiVersion = '2024-10-01-preview'
    const deploymentName = 'gpt-4o-mini'

    if (!azureEndpoint || !azureApiKey) {
      throw new Error('Azure OpenAI configuration missing')
    }

    // Construct Azure OpenAI request
    const azureUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${azureApiVersion}`
    
    const prompt = `Analyze this customer support call transcript using the SERVQUAL framework. Provide detailed metrics and insights.

TRANSCRIPT:
${transcript}

CALL DURATION: ${Math.round(duration / 60)} minutes

Please analyze this support call and provide a JSON response with the following structure:
{
  "servqualMetrics": {
    "empathy": <0-100 score for how well the agent showed understanding and care>,
    "assurance": <0-100 score for agent knowledge, competence, and professionalism>,
    "responsiveness": <0-100 score for willingness to help and prompt service>,
    "reliability": <0-100 score for ability to perform service dependably and accurately>,
    "tangibles": <0-100 score for professional communication and presentation>
  },
  "customerSatisfaction": <0-100 overall satisfaction score>,
  "escalationRisk": <"low", "medium", or "high" based on customer frustration and unresolved issues>,
  "resolutionEffectiveness": <0-100 score for how well the issue was resolved>,
  "keyInsights": [<array of 3-5 key insights about the call>],
  "coachingRecommendations": [<array of 3-5 specific coaching recommendations for the agent>],
  "escalationIndicators": [<array of specific phrases or moments that indicate escalation risk>],
  "satisfactionSignals": [<array of specific phrases or moments that indicate customer satisfaction>]
}

Focus on:
1. Agent empathy and emotional intelligence
2. Technical competence and problem-solving ability  
3. Communication clarity and professionalism
4. Customer's emotional state throughout the call
5. Issue resolution effectiveness
6. Specific moments of excellence or concern

Provide specific examples from the transcript to support your scoring.`

    // Make request to Azure OpenAI with timeout protection
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout

    let analysisResponse;
    try {
      const response = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureApiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert customer service analyst specializing in SERVQUAL framework evaluation. Provide detailed, actionable analysis in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Azure OpenAI API error:', response.status, errorText)
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`)
      }

      analysisResponse = await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Support analysis timed out after 45 seconds')
      }
      throw error
    }

    console.log('✅ Azure OpenAI analysis completed')

    // Parse the analysis result
    let analysisResult: SupportAnalysisResult
    try {
      const content = analysisResponse.choices[0].message.content
      analysisResult = JSON.parse(content)
      
      // Validate required fields
      if (!analysisResult.servqualMetrics || !analysisResult.customerSatisfaction) {
        throw new Error('Invalid analysis result structure')
      }
    } catch (parseError) {
      console.error('Failed to parse analysis result:', parseError)
      throw new Error('Failed to parse AI analysis result')
    }

    // Store the analysis in the database
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        support_analysis: analysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Failed to store analysis: ${updateError.message}`)
    }

    console.log(`✅ Support analysis stored for recording: ${recording_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        message: 'Support analysis completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Support analysis error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Support analysis failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})