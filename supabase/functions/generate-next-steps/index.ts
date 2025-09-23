// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { createSuccessResponse, createErrorResponse, handleCORSPreflight } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recordingId?: string;
  recording_id?: string;
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
    console.log('Function started: generate-next-steps (Azure OpenAI)');
    
    const body: RequestBody = await req.json();
    
    // Support both parameter names for flexibility
    const recordingId = body.recordingId || body.recording_id;
    
    if (!recordingId) {
      console.error('Missing recordingId in request');
      return createErrorResponse(
        'Recording ID is required. Please provide recordingId or recording_id in the request.',
        400
      );
    }

    console.log(`Generating next steps for recording: ${recordingId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return createErrorResponse(
        'Server configuration error. Please contact support.',
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transcript from database if not provided
    let transcript = body.transcript;
    if (!transcript) {
      console.log('Transcript not provided, fetching from database...');
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('transcript')
        .eq('id', recordingId)
        .single();

      if (fetchError) {
        console.error('Error fetching recording:', fetchError);
        return createErrorResponse(
          'Recording not found. Please check the recording ID and try again.',
          404
        );
      }

      if (!recording?.transcript) {
        console.error('No transcript available for recording');
        return createErrorResponse(
          'No transcript available for next steps analysis. Please ensure the recording has been fully processed.',
          400
        );
      }

      transcript = recording.transcript;
    }

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      console.error('Azure OpenAI configuration missing');
      return createErrorResponse(
        'AI service temporarily unavailable. Please try again later.',
        503
      );
    }

    try {
      console.log('Creating Azure OpenAI chat completion for next steps...');
      
      // Create Azure OpenAI client and generate next steps
      const azureClient = createAzureOpenAIChatClient();
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant that analyzes call recordings and identifies actionable next steps.
          Extract specific action items, follow-up tasks, and commitments made during the conversation.
          Return a JSON array of strings, each representing a specific action item.
          Focus on concrete, actionable tasks with clear ownership when possible.
          If no specific action items are mentioned, return an empty array.`
        },
        {
          role: 'user' as const,
          content: `Please analyze this call transcript and identify specific action items and next steps:\n\n${transcript}`
        }
      ];

      const response = await azureClient.createChatCompletion({
        messages,
        max_tokens: 300,
        temperature: 0.5,
      });

      const nextStepsText = response.choices[0]?.message?.content?.trim();

      if (!nextStepsText) {
        console.error('Failed to generate next steps: Empty response');
        return createErrorResponse(
          'AI analysis produced no results. The transcript may be too short or unclear.',
          422
        );
      }

      // Try to parse as JSON array, fallback to splitting by lines
      let nextSteps: string[];
      try {
        nextSteps = JSON.parse(nextStepsText);
        if (!Array.isArray(nextSteps)) {
          throw new Error('Not an array');
        }
      } catch (parseError) {
        // Fallback: split by lines and clean up
        console.warn('Failed to parse next steps as JSON, using fallback parsing');
        nextSteps = nextStepsText
          .split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5); // Limit to 5 items
      }

      // Save to database
      try {
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            ai_next_steps: nextSteps,
            ai_generated_at: new Date().toISOString()
          })
          .eq('id', recordingId);

        if (updateError) {
          console.error('Error updating recording:', updateError);
          return createErrorResponse(
            'Analysis completed but failed to save. Please contact support.',
            500,
            { nextSteps: nextSteps } // Return the next steps anyway
          );
        }
      } catch (dbError) {
        console.error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse(
          'Analysis completed but failed to save. Please contact support.',
          500,
          { nextSteps: nextSteps } // Return the next steps anyway
        );
      }

      // Log usage
      const promptTokens = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
      const completionTokens = Math.ceil(nextStepsText.length / 4);
      await logUsage(supabase, 'system', recordingId, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'generate-next-steps');

      console.log(`Generated ${nextSteps.length} next steps for recording ${recordingId} using Azure OpenAI`);

      return createSuccessResponse({ 
        success: true, 
        nextSteps: nextSteps,
        provider: 'azure-openai',
        model: 'gpt-4o-mini-2024-07-18',
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });

    } catch (azureError) {
      console.error(`Error calling Azure OpenAI API: ${azureError instanceof Error ? azureError.message : 'Unknown error'}`);
      return createErrorResponse(
        'AI analysis service is temporarily unavailable. Please try again later.',
        503
      );
    }
  } catch (error) {
    console.error('Error in generate-next-steps:', error);
    
    return createErrorResponse(
      'An unexpected error occurred. Please try again.',
      500
    );
  }
});