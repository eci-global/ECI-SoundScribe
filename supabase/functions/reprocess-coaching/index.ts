import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per minute per user
const userRequestCounts = new Map<string, { count: number; windowStart: number }>();

// Request deduplication to prevent processing the same recording multiple times
const DEDUP_WINDOW = 30 * 1000; // 30 seconds
const processingRequests = new Map<string, number>(); // recordingId -> timestamp

// Simple caching for similar transcripts (by hash)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const transcriptCache = new Map<string, { evaluation: any; timestamp: number }>();

// Helper function to create a simple hash for transcript content
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Helper function to calculate estimated cost
function calculateEstimatedCost(usage: any, model: string): number {
  // Approximate pricing (as of late 2024, prices may change)
  const pricing = {
    'gpt-4o': { input: 0.0025, output: 0.01 }, // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 } // per 1K tokens
  };
  
  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4o'];
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
  
  return parseFloat((inputCost + outputCost).toFixed(6));
}

interface ReprocessRequest {
  recording_id?: string
  batch_size?: number
  content_types?: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with the user's token
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting check
    const userId = user.id
    const currentTime = Date.now()
    const userRateLimit = userRequestCounts.get(userId)
    
    if (userRateLimit) {
      // Check if we're still in the same window
      if (currentTime - userRateLimit.windowStart < RATE_LIMIT_WINDOW) {
        if (userRateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded. Please wait before making another request.',
              retryAfter: RATE_LIMIT_WINDOW - (currentTime - userRateLimit.windowStart)
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userRateLimit.count++
      } else {
        // Reset the window
        userRateLimit.count = 1
        userRateLimit.windowStart = currentTime
      }
    } else {
      // First request for this user
      userRequestCounts.set(userId, { count: 1, windowStart: currentTime })
    }
    
    const { recording_id, batch_size = 10, content_types = ['sales_call', 'customer_support', 'team_meeting', 'training_session', 'other'] } = await req.json() as ReprocessRequest

    console.log('Reprocessing coaching data request:', { 
      recording_id, 
      batch_size, 
      content_types, 
      userId,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('User-Agent')
    })

    // Request deduplication for specific recording
    if (recording_id) {
      const lastProcessed = processingRequests.get(recording_id)
      if (lastProcessed && (currentTime - lastProcessed) < DEDUP_WINDOW) {
        return new Response(
          JSON.stringify({ 
            error: 'Request already being processed. Please wait.',
            message: 'This recording is already being processed for coaching generation.'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      processingRequests.set(recording_id, currentTime)
    }

    // Query for recordings that need coaching evaluation (user can only access their own recordings)
    let query = supabase
      .from('recordings')
      .select('id, title, transcript, content_type, enable_coaching, user_id')
      .eq('status', 'completed')
      .eq('user_id', userId) // Only allow access to user's own recordings
      .is('coaching_evaluation', null)
      .not('transcript', 'is', null)
      .in('content_type', content_types)
      .neq('enable_coaching', false)

    if (recording_id) {
      query = query.eq('id', recording_id)
    } else {
      query = query.limit(batch_size)
    }

    const { data: recordings, error } = await query

    if (error) {
      console.error('Error fetching recordings:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recordings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!recordings || recordings.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No recordings found that need coaching evaluation',
          processed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${recordings.length} recordings to process`)

    let processedCount = 0
    const results = []

    for (const recording of recordings) {
      try {
        console.log(`Processing recording: ${recording.title}`)
        
        // Check cache first to avoid redundant API calls
        const transcriptHash = simpleHash(recording.transcript)
        const cached = transcriptCache.get(transcriptHash)
        
        let coachingEvaluation
        if (cached && (currentTime - cached.timestamp) < CACHE_EXPIRY) {
          console.log(`Using cached evaluation for recording: ${recording.title}`)
          coachingEvaluation = cached.evaluation
          
          // Log cached usage (no cost)
          try {
            await supabase
              .from('coaching_usage_logs')
              .insert({
                user_id: userId,
                recording_id: recording.id,
                model_used: 'cached',
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                estimated_cost: 0,
                transcript_length: recording.transcript.length,
                was_cached: true
              })
          } catch (logError) {
            console.error('Failed to log cached usage to database:', logError)
          }
        } else {
          // Generate coaching evaluation using OpenAI
          coachingEvaluation = await generateCoachingEvaluation(
            recording.transcript,
            recording.content_type,
            supabase,
            userId,
            recording.id
          )
          
          // Cache the result
          transcriptCache.set(transcriptHash, {
            evaluation: coachingEvaluation,
            timestamp: currentTime
          })
        }

        // Update the recording with coaching evaluation
        const { error: updateError } = await supabase
          .from('recordings')
          .update({ 
            coaching_evaluation: coachingEvaluation,
            updated_at: new Date().toISOString()
          })
          .eq('id', recording.id)

        if (updateError) {
          console.error(`Error updating recording ${recording.id}:`, updateError)
          results.push({
            id: recording.id,
            title: recording.title,
            status: 'error',
            error: updateError.message
          })
        } else {
          processedCount++
          results.push({
            id: recording.id,
            title: recording.title,
            status: 'success'
          })
          console.log(`Successfully processed: ${recording.title}`)
        }
      } catch (error) {
        console.error(`Error processing recording ${recording.id}:`, error)
        results.push({
          id: recording.id,
          title: recording.title,
          status: 'error',
          error: error.message
        })
      }
    }

    // Clean up processing requests for completed recordings
    if (recording_id) {
      processingRequests.delete(recording_id)
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} of ${recordings.length} recordings`,
        processed: processedCount,
        total: recordings.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reprocessing error:', error)
    
    // Clean up processing requests on error
    try {
      const body = await req.clone().json()
      if (body.recording_id) {
        processingRequests.delete(body.recording_id)
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError)
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateCoachingEvaluation(
  transcript: string, 
  contentType: string, 
  supabase: any, 
  userId: string, 
  recordingId: string
) {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Domain-specific coaching prompts
  const prompts: Record<string, string> = {
    sales_call: `You are an expert sales coach analyzing a sales call transcript. Evaluate the performance based on these criteria:

1. Talk-time ratio (ideal: 30-40% rep talk time) - estimate percentage
2. Objection handling (1-10 scale) - how well objections were addressed
3. Discovery questions (count) - number of good discovery questions asked
4. Value articulation (1-10 scale) - how well value was communicated
5. Active listening (1-10 scale) - demonstration of listening skills
6. Next steps (true/false) - were clear next steps established
7. Rapport building (1-10 scale) - relationship building effectiveness

Provide specific examples and actionable feedback.`,

    customer_support: `You are an expert customer support coach analyzing a support call transcript. Evaluate the performance based on these criteria:

1. Problem resolution (1-10 scale) - effectiveness in solving the issue
2. Empathy demonstration (1-10 scale) - showing understanding and care
3. Technical accuracy (1-10 scale) - correctness of technical information
4. Follow-up clarity (1-10 scale) - clear next steps provided
5. Customer satisfaction (1-10 scale) - likely customer satisfaction level
6. Escalation handling (1-10 scale) - appropriate escalation decisions

Provide specific examples and actionable feedback.`,

    team_meeting: `You are an expert team communication coach analyzing a team meeting transcript. Evaluate the performance based on these criteria:

1. Participation level (1-10 scale) - engagement and contribution
2. Decision making (1-10 scale) - contribution to decisions
3. Communication clarity (1-10 scale) - clear and effective communication
4. Action items (true/false) - were action items clearly defined
5. Time management (1-10 scale) - efficiency and staying on topic
6. Collaboration (1-10 scale) - working effectively with others

Provide specific examples and actionable feedback.`,

    training_session: `You are an expert training coach analyzing a training session transcript. Evaluate the performance based on these criteria:

1. Knowledge transfer (1-10 scale) - effectiveness of teaching
2. Engagement level (1-10 scale) - keeping participants engaged
3. Question handling (1-10 scale) - responding to questions effectively
4. Clarity of explanation (1-10 scale) - clear and understandable content
5. Interactivity (1-10 scale) - encouraging participation
6. Comprehension checks (1-10 scale) - verifying understanding

Provide specific examples and actionable feedback.`,

    other: `You are an expert communication coach analyzing the following conversation transcript. Evaluate the speaker's performance based on clarity, engagement, listening skills, and overall effectiveness. Provide:

1. Overall score (1-100)
2. Strengths (bullet list)
3. Areas for improvement (bullet list)
4. Action items (numbered list)
5. Suggested responses or phrasing improvements for at least two situations you detect in the transcript.

Return your feedback in a structured JSON format.`
  }

  const systemPrompt = prompts[contentType] || prompts.other

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: transcript.length > 10000 ? 'gpt-4o' : 'gpt-3.5-turbo', // Use cheaper model for shorter transcripts
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}

IMPORTANT: Respond with a JSON object in this exact format:
{
  "overallScore": number (0-100),
  "contentType": "${contentType}",
  "criteria": {
    // Content-type specific criteria scores
  },
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "suggestedResponses": [
    {
      "situation": "description",
      "currentResponse": "what was said",
      "improvedResponse": "better way to say it"
    }
  ],
  "actionItems": ["action1", "action2", ...]
}`
        },
        {
          role: 'user',
          content: `Please analyze this ${contentType.replace('_', ' ')} transcript and provide coaching feedback:\n\n${transcript.slice(0, 12000)}` // Limit transcript length to control costs
        }
      ],
      temperature: 0,  // Deterministic output for consistent results
      max_tokens: 1500 // Reduced from 2000 to control costs
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  
  // Log token usage for cost monitoring
  const modelUsed = transcript.length > 10000 ? 'gpt-4o' : 'gpt-3.5-turbo'
  if (data.usage) {
    const estimatedCost = calculateEstimatedCost(data.usage, modelUsed)
    console.log('OpenAI API usage:', {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      model: modelUsed,
      transcriptLength: transcript.length,
      timestamp: new Date().toISOString(),
      estimatedCost
    })
    
    // Log to database for tracking
    try {
      await supabase
        .from('coaching_usage_logs')
        .insert({
          user_id: userId,
          recording_id: recordingId,
          model_used: modelUsed,
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
          estimated_cost: estimatedCost,
          transcript_length: transcript.length,
          was_cached: false
        })
    } catch (logError) {
      console.error('Failed to log usage to database:', logError)
      // Don't fail the main operation if logging fails
    }
  }

  try {
    return JSON.parse(content)
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content)
    throw new Error('Invalid response format from OpenAI')
  }
}