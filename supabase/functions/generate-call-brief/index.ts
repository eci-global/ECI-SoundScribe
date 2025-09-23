// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recordingId: string;
  transcript: string;
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
    console.log('Function started: generate-call-brief (Azure OpenAI)');
    
    const { recordingId, transcript }: RequestBody = await req.json();
    
    if (!recordingId || !transcript) {
      return createErrorResponse('Recording ID and transcript are required', 400);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      return createErrorResponse('Azure OpenAI configuration missing', 500);
    }

    console.log('Creating Azure OpenAI chat completion...');
    
    // Create Azure OpenAI client and generate call brief
    const azureClient = createAzureOpenAIChatClient();
    
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that analyzes call recordings and provides valuable insights. 
        Generate a concise, professional call brief that highlights key discussion points, decisions made, 
        and important insights from the conversation. Focus on business value and actionable information.
        Keep the brief to 2-3 sentences maximum.`
      },
      {
        role: 'user' as const,
        content: `Please analyze this call transcript and provide a brief summary with key insights:\n\n${transcript}`
      }
    ];

    const response = await azureClient.createChatCompletion({
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    const callBrief = response.choices[0]?.message?.content?.trim();

    if (!callBrief) {
      return createErrorResponse('Failed to generate call brief', 500);
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        ai_summary: callBrief,
        ai_generated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Error updating recording:', updateError);
      return createErrorResponse('Failed to save call brief', 500, updateError.message);
    }

    // Log usage
    const promptTokens = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
    const completionTokens = Math.ceil(callBrief.length / 4);
    await logUsage(supabase, 'system', recordingId, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'generate-call-brief');

    console.log(`Generated call brief for recording ${recordingId} using Azure OpenAI`);

    return createSuccessResponse({ 
      brief: callBrief,
      provider: 'azure-openai',
      model: 'gpt-4o-mini-2024-07-18',
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    });

  } catch (error) {
    console.error('Error in generate-call-brief:', error);
    return createErrorResponse(
      'Failed to generate call brief', 
      500, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});