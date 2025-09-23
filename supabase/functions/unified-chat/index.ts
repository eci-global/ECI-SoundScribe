import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

function handleCORSPreflight(): Response {
  return new Response(null, {
    headers: corsHeaders,
    status: 200
  })
}

function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      ...data
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  )
}

function createErrorResponse(
  error: string | Error,
  status: number = 500
): Response {
  const errorMessage = error instanceof Error ? error.message : error

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  )
}

// Azure OpenAI Chat Client
class AzureOpenAIChatClient {
  private endpoint: string
  private apiKey: string
  private apiVersion: string
  private deploymentName: string

  constructor() {
    this.endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') || ''
    this.apiKey = Deno.env.get('AZURE_OPENAI_API_KEY') || ''
    this.apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-10-01-preview'
    this.deploymentName = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT') || 'gpt-4o-mini'
  }

  async createChatCompletion(messages: any[], maxTokens: number = 800) {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature: 0.3 // Slightly more creative for conversational responses
      }),
    })

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} - ${response.statusText}`)
    }

    return await response.json()
  }
}

interface UnifiedChatRequest {
  recordingId: string
  question: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

/**
 * Detect available context for the recording to determine appropriate response strategy
 */
async function detectRecordingContext(recordingId: string, supabase: any): Promise<{
  recording: any
  bdrEvaluation: any | null
  coachingData: any | null
  hasTranscript: boolean
  hasBDRData: boolean
  hasCoachingData: boolean
}> {
  // Get recording data
  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', recordingId)
    .single()

  if (recordingError || !recording) {
    throw new Error('Recording not found')
  }

  // Check for BDR evaluation data
  let bdrEvaluation = null
  try {
    const { data: bdrData } = await supabase
      .from('bdr_scorecard_evaluations')
      .select(`
        *,
        bdr_training_programs(*)
      `)
      .eq('recording_id', recordingId)
      .order('evaluated_at', { ascending: false })
      .limit(1)

    if (bdrData && bdrData.length > 0) {
      bdrEvaluation = bdrData[0]
    }
  } catch (error) {
    console.warn('No BDR evaluation data available:', error)
  }

  // Extract coaching data from recording
  const coachingData = recording.coaching_evaluation || null

  return {
    recording,
    bdrEvaluation,
    coachingData,
    hasTranscript: Boolean(recording.transcript),
    hasBDRData: Boolean(bdrEvaluation),
    hasCoachingData: Boolean(coachingData)
  }
}

/**
 * Generate context-aware response based on available data
 */
async function generateContextAwareResponse(
  context: any,
  question: string,
  conversationHistory: any[],
  chatClient: AzureOpenAIChatClient
): Promise<string> {
  const { recording, bdrEvaluation, coachingData, hasBDRData, hasCoachingData, hasTranscript } = context

  // Build comprehensive context prompt
  let systemPrompt = `You are an expert sales call analysis assistant. Help users understand and analyze their recorded sales conversations.`

  let contextSection = `
RECORDING CONTEXT:
- Title: ${recording.title || 'Unknown Recording'}
- Duration: ${recording.duration ? `${Math.round(recording.duration / 60)} minutes` : 'Unknown'}
- Content Type: ${recording.content_type || 'General Call'}
- Status: ${recording.status}
- Has Transcript: ${hasTranscript ? 'Yes' : 'No'}
`

  // Add transcript context if available
  if (hasTranscript && recording.transcript) {
    const truncatedTranscript = recording.transcript.length > 2000
      ? recording.transcript.substring(0, 2000) + '...[truncated]'
      : recording.transcript

    contextSection += `
CALL TRANSCRIPT:
${truncatedTranscript}
`
  }

  // Add AI insights if available
  if (recording.ai_summary) {
    contextSection += `
AI SUMMARY:
${recording.ai_summary}
`
  }

  if (recording.ai_insights) {
    const insights = typeof recording.ai_insights === 'string'
      ? recording.ai_insights
      : JSON.stringify(recording.ai_insights, null, 2)
    contextSection += `
AI INSIGHTS:
${insights}
`
  }

  // Add BDR-specific context if available
  if (hasBDRData && bdrEvaluation) {
    const overallScore = bdrEvaluation.overall_score || 0
    const criteriaScores = bdrEvaluation.criteria_scores || {}
    const coachingNotes = bdrEvaluation.coaching_notes || ''

    contextSection += `
BDR SCORECARD EVALUATION:
- Overall Score: ${overallScore.toFixed(1)}/4.0
- Training Program: ${bdrEvaluation.bdr_training_programs?.name || 'BDR Fundamentals'}
- Evaluation Source: ${coachingNotes.startsWith('Manager Assessment:') ? 'Manager Review' : 'AI Analysis'}

DETAILED CRITERIA SCORES:
${Object.entries(criteriaScores).map(([criterion, data]: [string, any]) => {
  const score = data?.score || 0
  const maxScore = data?.maxScore || 4
  const feedback = data?.feedback || ''
  return `- ${criterion.replace(/_/g, ' ')}: ${score}/${maxScore} - ${feedback}`
}).join('\n')}

COACHING NOTES:
${coachingNotes}

BDR INSIGHTS:
- Key Strengths: ${bdrEvaluation.strengths?.join(', ') || 'See detailed analysis'}
- Improvement Areas: ${bdrEvaluation.improvement_areas?.join(', ') || 'See coaching notes'}
`
  }

  // Add general coaching context if available
  if (hasCoachingData && coachingData) {
    const coaching = typeof coachingData === 'string' ? coachingData : JSON.stringify(coachingData, null, 2)
    contextSection += `
COACHING EVALUATION:
${coaching}
`
  }

  // Add appropriate instructions based on context
  let instructions = `
INSTRUCTIONS:
- Provide helpful, specific answers about this sales call
- Reference specific parts of the transcript, AI analysis, or evaluation data when relevant
- Give actionable insights and suggestions when appropriate
- Be conversational but professional
- If asked about scores or evaluations, explain the reasoning behind them
- Suggest specific improvements when discussing areas for development
`

  if (hasBDRData) {
    instructions += `
- For BDR scorecard questions, reference specific criteria scores and provide coaching guidance
- Explain scoring rationale using the 0-4 scale (0=Not Demonstrated, 1=Developing, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class)
- Provide manager-level coaching insights for BDR skill development
`
  }

  const fullSystemPrompt = systemPrompt + contextSection + instructions

  // Build conversation with context
  const messages = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory,
    { role: 'user', content: question }
  ]

  try {
    console.log('🤖 Generating context-aware response for question:', question)

    const completion = await chatClient.createChatCompletion(messages, 1000)
    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from Azure OpenAI')
    }

    console.log('✅ Generated context-aware response')
    return response

  } catch (error) {
    console.error('❌ Failed to generate response:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight()
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request
    const requestBody: UnifiedChatRequest = await req.json()
    const { recordingId, question, conversationHistory = [] } = requestBody

    if (!recordingId || !question) {
      return createErrorResponse('Missing required parameters: recordingId and question', 400)
    }

    console.log(`💬 Unified chat question received for recording ${recordingId}: "${question}"`)

    // Detect available context for this recording
    const context = await detectRecordingContext(recordingId, supabase)

    console.log('📊 Context analysis:', {
      hasBDRData: context.hasBDRData,
      hasCoachingData: context.hasCoachingData,
      hasTranscript: context.hasTranscript,
      contentType: context.recording.content_type
    })

    // Initialize Azure OpenAI client
    const chatClient = new AzureOpenAIChatClient()

    // Generate context-aware response
    const response = await generateContextAwareResponse(
      context,
      question,
      conversationHistory,
      chatClient
    )

    return createSuccessResponse({
      response,
      recordingId,
      context: {
        hasBDRData: context.hasBDRData,
        hasCoachingData: context.hasCoachingData,
        hasTranscript: context.hasTranscript,
        contentType: context.recording.content_type
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Unified chat failed:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Chat request failed',
      500
    )
  }
})