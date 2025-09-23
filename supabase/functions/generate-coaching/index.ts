// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createErrorResponse, createSuccessResponse, handleCORSPreflight } from '../_shared/cors.ts';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recordingId?: string;
  recording_id?: string;
  options?: {
    silent?: boolean;
  };
}

// Rate limiting and retry logic
const RATE_LIMIT_DELAY = 60000; // 1 minute
const MAX_RETRIES = 3;
const BACKOFF_MULTIPLIER = 2;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function calculateTokens(text: string): Promise<{ prompt: number; estimated_completion: number }> {
  // Rough token calculation (1 token ≈ 4 characters)
  const promptTokens = Math.ceil(text.length / 4);
  const estimatedCompletionTokens = 800; // Estimated based on typical coaching responses
  return {
    prompt: promptTokens,
    estimated_completion: estimatedCompletionTokens
  };
}

async function calculateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
      // Azure OpenAI pricing (Enterprise rates)
  const pricing = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };
  
  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4o-mini'];
  const inputCost = (promptTokens / 1000) * modelPricing.input;
  const outputCost = (completionTokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}

async function logUsage(
  supabase: any,
  userId: string,
  recordingId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  cost: number,
  transcriptLength: number,
  wasCached: boolean = false
) {
  try {
    await supabase
      .from('coaching_usage_logs')
      .insert({
        user_id: userId,
        recording_id: recordingId,
        model_used: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost: cost,
        transcript_length: transcriptLength,
        was_cached: wasCached
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

async function makeAzureOpenAIRequest(messages: any[], model: string = 'gpt-4o-mini', retryCount = 0): Promise<any> {
  try {
    const azureClient = createAzureOpenAIChatClient();

    // Increased timeout for Azure OpenAI processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for better reliability

    const response = await azureClient.createChatCompletion({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: 800, // Further reduced for faster coaching generation
      temperature: 0.2, // More focused responses for faster generation
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again with a shorter transcript.');
    }
    
    // Handle rate limiting
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      if (retryCount < MAX_RETRIES) {
        const backoffDelay = RATE_LIMIT_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCount);
        console.log(`Rate limited. Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(backoffDelay);
        return makeAzureOpenAIRequest(messages, model, retryCount + 1);
      } else {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    
    if (retryCount < MAX_RETRIES && (error.message.includes('network') || error.message.includes('timeout'))) {
      const backoffDelay = RATE_LIMIT_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCount);
      console.log(`Network error, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(backoffDelay);
      return makeAzureOpenAIRequest(messages, model, retryCount + 1);
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: generate-coaching (Azure OpenAI)');
    
    // Parse request body
    let recording_id;
    let options = {};
    try {
      const body = await req.json();
      // Support both parameter formats for compatibility
      recording_id = body.recordingId || body.recording_id;
      options = body.options || {};
      console.log(`Request body parsed, recording_id: ${recording_id}`);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createErrorResponse(
        'Invalid request body. Please provide a valid JSON with recording_id.',
        400,
        parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      );
    }
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse(
        'Recording ID is required. Please provide recordingId or recording_id in the request.',
        400
      );
    }

    // Initialize Supabase client
    let supabase;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(`Supabase configuration missing: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
      }
      
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase client initialized successfully');
    } catch (supabaseInitError) {
      console.error('Failed to initialize Supabase client:', supabaseInitError);
      return createErrorResponse(
        'Database connection error. Please try again later.',
        500,
        supabaseInitError instanceof Error ? supabaseInitError.message : 'Unknown database error'
      );
    }

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      console.error('Azure OpenAI configuration missing');
      return createErrorResponse(
        'Azure OpenAI configuration error. Please contact support.',
        500,
        'Azure OpenAI API key or endpoint not configured'
      );
    }

    // Get recording with transcript
    let recording;
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('id, user_id, transcript, title, coaching_evaluation, enable_coaching')
        .eq('id', recording_id)
        .single();

      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Recording not found');
      }
      
      recording = data;
      console.log('Recording found:', { id: recording.id, title: recording.title });
    } catch (recordingError) {
      console.error('Recording fetch error:', recordingError);
      if (recordingError.message?.includes('not found') || recordingError.code === 'PGRST116') {
        return createErrorResponse(
          'Recording not found. Please check the recording ID and try again.',
          404
        );
      }
      return createErrorResponse(
        'Failed to fetch recording details. Please try again later.',
        500,
        recordingError instanceof Error ? recordingError.message : 'Unknown database error'
      );
    }

    // Check if coaching is enabled
    if (!recording.enable_coaching) {
      console.warn('Coaching analysis is disabled for recording:', recording_id);
      return createErrorResponse(
        'Coaching analysis is disabled for this recording. Please enable coaching in the recording settings.',
        400
      );
    }

    // Check if coaching evaluation already exists
    if (recording.coaching_evaluation) {
      console.log('Coaching evaluation already exists for recording:', recording_id);
      return createSuccessResponse({
        message: 'Coaching evaluation already exists',
        coaching_evaluation: recording.coaching_evaluation
      });
    }

    // Check if transcript is available
    if (!recording.transcript) {
      console.error('No transcript available for recording:', recording_id);
      return createErrorResponse(
        'No transcript available for coaching analysis. Please ensure the recording has been fully processed.',
        400
      );
    }

    const model = 'gpt-4o-mini'; // Use cost-effective model
    const transcriptLength = recording.transcript.length;

    // Optimize transcript length based on content - reduce even further for faster coaching
    const maxTranscriptLength = 4000; // Reduced for faster coaching generation
    let truncatedTranscript = recording.transcript;
    
    if (recording.transcript.length > maxTranscriptLength) {
      // Smart truncation: try to keep complete sentences
      truncatedTranscript = recording.transcript.substring(0, maxTranscriptLength);
      const lastSentenceEnd = Math.max(
        truncatedTranscript.lastIndexOf('.'),
        truncatedTranscript.lastIndexOf('!'),
        truncatedTranscript.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > maxTranscriptLength * 0.8) {
        truncatedTranscript = truncatedTranscript.substring(0, lastSentenceEnd + 1);
      }
      
      truncatedTranscript += '...';
      console.log(`Transcript truncated from ${recording.transcript.length} to ${truncatedTranscript.length} characters`);
    }

    // Calculate estimated tokens and cost
    let tokenEstimate;
    try {
      tokenEstimate = await calculateTokens(truncatedTranscript);
      console.log(`Generating coaching analysis for recording: ${recording_id}`);
      console.log(`Original transcript length: ${transcriptLength} characters`);
      console.log(`Using transcript length: ${truncatedTranscript.length} characters`);
      console.log(`Estimated tokens: ${tokenEstimate.prompt + tokenEstimate.estimated_completion}`);
    } catch (tokenError) {
      console.warn('Failed to calculate tokens:', tokenError);
      tokenEstimate = { prompt: 2000, estimated_completion: 800 }; // Fallback estimates
    }

    // Generate coaching evaluation using Azure OpenAI
    let result;
    try {
      const messages = [
        {
          role: 'system',
          content: `Analyze call transcript. Return JSON:
{
  "overallScore": <0-100>,
  "criteria": {
    "talkTimeRatio": <0-100>,
    "objectionHandling": <0-10>,
    "discoveryQuestions": <count>,
    "valueArticulation": <0-10>,
    "activeListening": <0-10>,
    "nextSteps": <boolean>,
    "rapport": <0-10>
  },
  "strengths": ["item1", "item2", "item3"],
  "improvements": ["area1", "area2", "area3"],
  "actionItems": ["action1", "action2", "action3"],
  "summary": "<2-3 sentences>"
}
Be concise and practical.`
        },
        {
          role: 'user',
          content: `Analyze this transcript:\n\n${truncatedTranscript}`
        }
      ];

      result = await makeAzureOpenAIRequest(messages, model);
      console.log('Azure OpenAI response received successfully');
    } catch (azureError) {
      console.error('Azure OpenAI API error:', azureError);
      
      if (azureError.message.includes('API key')) {
        return createErrorResponse(
          'AI service configuration error. Please contact support.',
          503,
          azureError.message
        );
      } else if (azureError.message.includes('rate limit')) {
        return createErrorResponse(
          'AI service is currently busy. Please wait a few minutes and try again.',
          429,
          azureError.message
        );
      } else if (azureError.message.includes('timed out')) {
        return createErrorResponse(
          'Analysis timed out. Please try again with a shorter recording.',
          408,
          azureError.message
        );
      } else {
        return createErrorResponse(
          'Failed to generate coaching analysis. Please try again later.',
          500,
          azureError.message
        );
      }
    }

    const coachingText = result.choices[0]?.message?.content?.trim();
    if (!coachingText) {
      console.error('No coaching content in Azure OpenAI response');
      return createErrorResponse(
        'AI service returned an empty response. Please try again.',
        500,
        'The AI model returned an empty response'
      );
    }

    // Parse coaching evaluation
    let coachingEvaluation;
    try {
      coachingEvaluation = JSON.parse(coachingText);
      console.log('Successfully parsed coaching evaluation JSON');
    } catch (parseError) {
      console.error('Failed to parse coaching evaluation JSON:', parseError);
      console.error('Raw coaching text:', coachingText);
      return createErrorResponse(
        'AI service returned invalid data. Please try again.',
        500,
        'The AI response was not valid JSON'
      );
    }

    // Calculate actual cost based on usage
    const promptTokens = result.usage?.prompt_tokens || tokenEstimate.prompt;
    const completionTokens = result.usage?.completion_tokens || tokenEstimate.estimated_completion;
    let actualCost;
    try {
      actualCost = await calculateCost(model, promptTokens, completionTokens);
      console.log(`Actual tokens used: ${promptTokens + completionTokens}`);
      console.log(`Cost: $${actualCost.toFixed(6)}`);
    } catch (costError) {
      console.warn('Failed to calculate cost:', costError);
      actualCost = 0.01; // Fallback cost
    }

    // Log usage for analytics
    try {
      await logUsage(
        supabase,
        recording.user_id,
        recording_id,
        model,
        promptTokens,
        completionTokens,
        actualCost,
        transcriptLength,
        false
      );
      console.log('Usage logged successfully');
    } catch (logError) {
      console.warn('Failed to log usage:', logError);
      // Continue even if logging fails
    }

    // Save coaching evaluation to database
    try {
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          coaching_evaluation: coachingEvaluation,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording_id);

      if (updateError) {
        throw updateError;
      }
      console.log('Coaching evaluation saved to database');
    } catch (updateError) {
      console.error('Failed to save coaching evaluation:', updateError);
      // Continue to return the coaching evaluation even if saving fails
    }

    console.log(`Coaching analysis completed for recording: ${recording_id}`);

    return createSuccessResponse({
      coaching_evaluation: coachingEvaluation,
      usage: {
        tokens: promptTokens + completionTokens,
        cost: actualCost
      }
    });

  } catch (error) {
    console.error('Error in generate-coaching:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate coaching analysis';
    let statusCode = 500;
    
    if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
      errorMessage = 'AI service is currently busy. Please wait a few minutes and try again.';
      statusCode = 429;
    } else if (error.message.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
      statusCode = 503;
    } else if (error.message.includes('transcript')) {
      errorMessage = 'No transcript available for analysis. Please ensure the recording has been fully processed.';
      statusCode = 400;
    } else if (error.message.includes('timed out') || error.message.includes('timeout')) {
      errorMessage = 'Analysis timed out. Please try again with a shorter recording.';
      statusCode = 408;
    }
    
    return createErrorResponse(
      errorMessage,
      statusCode,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

