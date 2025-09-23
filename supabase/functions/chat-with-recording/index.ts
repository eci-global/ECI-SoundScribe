// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: chat-with-recording (Azure OpenAI)');
    
    const { recordingId, message, sessionId, userId } = await req.json();
    
    if (!recordingId || !message || !userId) {
      return createErrorResponse('Recording ID, message, and user ID are required', 400);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recording details
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (fetchError || !recording) {
      return createErrorResponse('Recording not found', 404);
    }

    let currentSessionId = sessionId;

    // Create or get chat session
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('chat_sessions')
        .insert({
          recording_id: recordingId,
          user_id: userId,
          title: `Chat about ${recording.title}`,
        })
        .select()
        .single();

      if (sessionError) {
        return createErrorResponse(`Failed to create chat session: ${sessionError.message}`, 500);
      }

      currentSessionId = newSession.id;
    }

    // Save user message
    const { error: userMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message,
      });

    if (userMessageError) {
      return createErrorResponse(`Failed to save user message: ${userMessageError.message}`, 500);
    }

    // Get previous messages for context
    const { data: previousMessages, error: messagesError } = await supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching previous messages:', messagesError);
    }

    // Find relevant content using semantic search
    const relevantContent = await findRelevantContent(recordingId, message);
    
    // Prepare messages for Azure OpenAI
    const contextualInfo = [
      `Recording Title: ${recording.title}`,
      recording.description ? `Recording Description: ${recording.description}` : '',
      recording.summary ? `Summary: ${recording.summary}` : '',
      relevantContent.length > 0 ? `Relevant sections: ${relevantContent.join('\n\n')}` : '',
      recording.transcript ? `Full transcript available for reference.` : 'No transcript available yet.'
    ].filter(Boolean).join('\n\n');

    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant helping users discuss and understand the content of their recordings. 

${contextualInfo}

Please provide helpful, accurate responses about the recording content. Focus on the relevant sections provided, but you can reference the full context when needed. If asked about specific details not in the available content, let the user know that information isn't available.`
      },
      ...(previousMessages || []),
    ];

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      return createErrorResponse('Azure OpenAI configuration missing', 500);
    }

    // Generate AI response using Azure OpenAI
    console.log('Creating Azure OpenAI chat completion for chat response...');
    
    const azureClient = createAzureOpenAIChatClient();
    
    const aiResponse = await azureClient.createChatCompletion({
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const assistantMessage = aiResponse.choices[0]?.message?.content;

    if (!assistantMessage) {
      return createErrorResponse('Failed to generate AI response', 500);
    }

    // Save assistant message
    const { error: assistantMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantMessage,
      });

    if (assistantMessageError) {
      return createErrorResponse(`Failed to save assistant message: ${assistantMessageError.message}`, 500);
    }

    // Log usage
    const promptTokens = Math.ceil(messages.map(m => m.content).join('').length / 4);
    const completionTokens = Math.ceil(assistantMessage.length / 4);
    await logUsage(supabaseClient, userId, recordingId, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'chat-with-recording');

    console.log(`Chat response generated for recording ${recordingId} using Azure OpenAI`);

    return createSuccessResponse({ 
      success: true,
      response: assistantMessage,
      sessionId: currentSessionId,
      provider: 'azure-openai',
      model: 'gpt-4o-mini-2024-07-18',
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return createErrorResponse(
      'Chat function failed', 
      500, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Find relevant content using semantic search
async function findRelevantContent(recordingId: string, query: string): Promise<string[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for relevant chunks
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: relevantChunks, error } = await supabaseClient
      .rpc('search_recording_content', {
        recording_id_param: recordingId,
        query_embedding: queryEmbedding,
        similarity_threshold: 0.6,
        match_count: 3
      });

    if (error) {
      console.error('Semantic search error:', error);
      return [];
    }

    return relevantChunks?.map((chunk: any) => chunk.chunk_content) || [];
  } catch (error) {
    console.error('Error finding relevant content:', error);
    return [];
  }
}

// Generate embedding using Azure OpenAI (or fallback to OpenAI)
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Try Azure OpenAI first (if embeddings are available)
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    
    if (azureEndpoint && azureApiKey) {
      // Note: Azure OpenAI embeddings would need a separate deployment
      // For now, fall back to OpenAI for embeddings
      console.log('Using OpenAI for embeddings (Azure embeddings not configured)');
    }
    
    // Fallback to OpenAI for embeddings
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('No embedding service available');
      return [];
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('Embedding generation failed:', await response.text());
      return [];
    }

    const result = await response.json();
    return result.data[0]?.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}
