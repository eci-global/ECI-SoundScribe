// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { 
  createAzureOpenAIChatClient,
  extractJsonFromAIResponse,
  validateAIMoments
} from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  recording_id: string;
  transcript?: string;
}

async function logUsage(
  supabase: any,
  userId: string,
  recordingId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  operation: string
) {
  try {
    // Calculate cost (Azure OpenAI pricing)
    const pricing = {
      'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 }
    };
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4o-mini-2024-07-18'];
    const cost = (promptTokens / 1000) * modelPricing.input + (completionTokens / 1000) * modelPricing.output;

    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        recording_id: recordingId,
        operation: operation,
        model_used: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost: cost,
        provider: 'azure-openai'
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: generate-ai-moments (Azure OpenAI)');
    
    const { recording_id, transcript }: RequestBody = await req.json();
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse('Recording ID is required', 400);
    }

    console.log(`Processing AI moments for recording: ${recording_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording with transcript if not provided
    let recordingTranscript = transcript;
    if (!recordingTranscript) {
      try {
        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .select('transcript, title')
          .eq('id', recording_id)
          .single();

        if (recordingError) {
          console.error(`Error fetching recording: ${recordingError.message}`);
          return createErrorResponse(`Recording not found: ${recordingError.message}`, 404);
        }

        if (!recording || !recording.transcript) {
          console.log('No transcript available yet for recording:', recording_id);
          return createSuccessResponse({ 
            success: false, 
            message: 'Transcript not available yet. Please process the recording first.',
            needs_processing: true
          }, 202); // Accepted but not yet processed
        }
        
        recordingTranscript = recording.transcript;
      } catch (dbError) {
        console.error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`, 500);
      }
    }

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      console.error('Azure OpenAI configuration missing');
      return createErrorResponse('Azure OpenAI configuration missing', 500);
    }

    // Generate AI moments (chapters, objections, sentiment, etc.)
    try {
      console.log('Creating Azure OpenAI chat completion for AI moments...');
      
      // Create Azure OpenAI client and generate moments
      const azureClient = createAzureOpenAIChatClient();
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI that identifies key moments in call recordings.
          Analyze the transcript and identify important moments with timestamps.
          IMPORTANT: Return ONLY a valid JSON array - no markdown formatting, no code blocks, no additional text.
          The response must be pure JSON that starts with [ and ends with ].
          
          Structure: [{"type": "chapter", "start_time": 0, "label": "1", "tooltip": "Chapter 1: Introduction"}]
          
          Types available:
          - "chapter": Major sections of the call (label should be "1", "2", etc.)
          - "objection": When objections or pushback are raised
          - "sentiment_neg": When negative sentiment is detected
          - "bookmark": Important discussion points worth bookmarking
          - "action": When action items or commitments are mentioned
          
          Guidelines:
          - Estimate start_time in seconds based on content flow
          - Create 4-8 chapters for structure
          - Identify 2-4 other moment types if present
          - Make tooltips descriptive but concise
          - Order by start_time ascending`
        },
        {
          role: 'user' as const,
          content: `Analyze this transcript and identify key moments. Return pure JSON array only - no markdown, no explanations:\n\n${recordingTranscript}`
        }
      ];

      const response = await azureClient.createChatCompletion({
        messages,
        max_tokens: 800,
        temperature: 0.4,
      });

      const momentsText = response.choices[0]?.message?.content?.trim();

      if (!momentsText) {
        console.error('Failed to generate AI moments: Empty response');
        return createErrorResponse('Failed to generate AI moments: Empty response', 500);
      }

      // Parse the AI moments JSON using robust extraction
      let aiMoments: any[];
      try {
        console.log('🔍 Raw AI moments response preview:', momentsText.substring(0, 200) + '...');
        
        // Use our robust JSON extraction utility
        aiMoments = extractJsonFromAIResponse(momentsText);
        
        // Validate the structure
        if (!validateAIMoments(aiMoments)) {
          throw new Error('AI moments validation failed');
        }
      } catch (parseError) {
        console.error('Failed to parse AI moments JSON:', parseError);
        console.log('Raw response:', momentsText);
        return createErrorResponse('Failed to parse AI moments response', 500);
      }

      // Validate and clean up the moments
      const validMoments = aiMoments
        .filter(moment => 
          moment && 
          typeof moment === 'object' && 
          moment.type && 
          typeof moment.start_time === 'number' &&
          moment.tooltip
        )
        .map(moment => ({
          type: moment.type,
          start_time: Math.max(0, moment.start_time),
          label: moment.label || '',
          tooltip: moment.tooltip || 'AI-generated moment'
        }))
        .sort((a, b) => a.start_time - b.start_time);

      console.log(`Generated ${validMoments.length} AI moments`);

      // Save to database
      try {
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            ai_moments: validMoments,
            ai_generated_at: new Date().toISOString()
          })
          .eq('id', recording_id);

        if (updateError) {
          console.error('Error updating recording with AI moments:', updateError);
          return createErrorResponse('Failed to save AI moments', 500);
        }
      } catch (dbError) {
        console.error(`Database error saving AI moments: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse('Failed to save AI moments to database', 500);
      }

      // Log usage
      const promptTokens = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
      const completionTokens = Math.ceil(momentsText.length / 4);
      await logUsage(supabase, 'system', recording_id, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'generate-ai-moments');

      console.log(`Successfully generated and saved ${validMoments.length} AI moments for recording ${recording_id} using Azure OpenAI`);

      return createSuccessResponse({
        success: true,
        moments: validMoments,
        count: validMoments.length,
        provider: 'azure-openai',
        model: 'gpt-4o-mini-2024-07-18',
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });

    } catch (azureError) {
      console.error(`Azure OpenAI API error: ${azureError instanceof Error ? azureError.message : 'Unknown error'}`);
      return createErrorResponse('AI moments generation failed', 500, azureError instanceof Error ? azureError.message : 'Unknown error');
    }

  } catch (error) {
    console.error('Error in generate-ai-moments:', error);
    return createErrorResponse('An unexpected error occurred', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});
