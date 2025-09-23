// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkData {
  index: number;
  content: string;
  embedding: number[];
}

async function logUsage(
  supabase: any,
  userId: string,
  recordingId: string,
  model: string,
  totalTokens: number,
  operation: string,
  provider: string
) {
  try {
    // Calculate cost (Embedding pricing)
    const pricing = {
      'text-embedding-3-small': { input: 0.00002 }, // OpenAI pricing per 1k tokens
      'text-embedding-ada-002': { input: 0.0001 }, // Legacy OpenAI pricing
      'azure-text-embedding': { input: 0.00002 } // Azure pricing (similar to OpenAI)
    };
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['text-embedding-3-small'];
    const cost = (totalTokens / 1000) * modelPricing.input;

    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        recording_id: recordingId,
        operation: operation,
        model_used: model,
        prompt_tokens: totalTokens,
        completion_tokens: 0,
        total_tokens: totalTokens,
        estimated_cost: cost,
        provider: provider
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: generate-embeddings (Azure OpenAI + OpenAI fallback)');
    
    const { recordingId, transcript } = await req.json();
    
    if (!recordingId || !transcript) {
      return createErrorResponse('Recording ID and transcript are required', 400);
    }

    console.log('Generating embeddings for recording:', recordingId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Split transcript into chunks
    const chunks = splitTextIntoChunks(transcript, 500); // 500 characters per chunk
    console.log(`Split transcript into ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    const chunkData: ChunkData[] = [];
    let totalTokens = 0;
    let usedProvider = 'openai'; // Default fallback
    let usedModel = 'text-embedding-3-small';
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        const { embedding, tokens, provider, model } = await generateEmbedding(chunk);
        chunkData.push({
          index: i,
          content: chunk,
          embedding: embedding
        });
        totalTokens += tokens;
        usedProvider = provider;
        usedModel = model;
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${i}:`, error);
        // Continue processing other chunks
      }
      
      // Add small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Clear existing chunks for this recording
    const { error: deleteError } = await supabase
      .from('recording_chunks')
      .delete()
      .eq('recording_id', recordingId);

    if (deleteError) {
      console.error('Error deleting existing chunks:', deleteError);
    }

    // Store chunks with embeddings
    const chunksToInsert = chunkData.map(chunk => ({
      recording_id: recordingId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: chunk.embedding
    }));

    const { error: insertError } = await supabase
      .from('recording_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      return createErrorResponse(`Failed to store chunks: ${insertError.message}`, 500);
    }

    // Log usage
    await logUsage(supabase, 'system', recordingId, usedModel, totalTokens, 'generate-embeddings', usedProvider);

    console.log(`Successfully stored ${chunkData.length} chunks with embeddings using ${usedProvider}`);

    return createSuccessResponse({ 
      success: true,
      chunksProcessed: chunkData.length,
      totalChunks: chunks.length,
      provider: usedProvider,
      model: usedModel,
      totalTokens: totalTokens
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    return createErrorResponse(
      'Failed to generate embeddings', 
      500, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Split text into chunks with overlap
function splitTextIntoChunks(text: string, chunkSize: number, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // If we're not at the end, try to break at a sentence or word boundary
    if (end < text.length) {
      // Look for sentence ending
      const sentenceEnd = text.lastIndexOf('.', end);
      const questionEnd = text.lastIndexOf('?', end);
      const exclamationEnd = text.lastIndexOf('!', end);
      
      const maxSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (maxSentenceEnd > start + chunkSize * 0.7) {
        end = maxSentenceEnd + 1;
      } else {
        // Look for word boundary
        const spaceIndex = text.lastIndexOf(' ', end);
        if (spaceIndex > start + chunkSize * 0.7) {
          end = spaceIndex;
        }
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

// Generate embedding using Azure OpenAI (preferred) or OpenAI (fallback)
async function generateEmbedding(text: string): Promise<{
  embedding: number[];
  tokens: number;
  provider: string;
  model: string;
}> {
  // Estimate tokens (rough calculation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(text.length / 4);

  // Try Azure OpenAI first (if embeddings deployment is available)
  const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
  const azureEmbeddingDeployment = Deno.env.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  
  if (azureEndpoint && azureApiKey && azureEmbeddingDeployment) {
    try {
      console.log('Attempting to use Azure OpenAI for embeddings...');
      
      const azureApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-02-15-preview';
      const url = `${azureEndpoint}/openai/deployments/${azureEmbeddingDeployment}/embeddings?api-version=${azureApiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': azureApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data && result.data[0] && result.data[0].embedding) {
          console.log('Successfully used Azure OpenAI for embeddings');
          return {
            embedding: result.data[0].embedding,
            tokens: result.usage?.total_tokens || estimatedTokens,
            provider: 'azure-openai',
            model: 'azure-text-embedding'
          };
        }
      } else {
        console.warn('Azure OpenAI embeddings failed, falling back to OpenAI:', await response.text());
      }
    } catch (azureError) {
      console.warn('Azure OpenAI embeddings error, falling back to OpenAI:', azureError);
    }
  } else {
    console.log('Azure OpenAI embeddings not configured, using OpenAI fallback');
  }

  // Fallback to OpenAI
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('No embedding service available. Please configure Azure OpenAI embeddings or OpenAI API key.');
  }

  console.log('Using OpenAI for embeddings...');
  
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
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.data || !result.data[0] || !result.data[0].embedding) {
    throw new Error('Invalid embedding response from OpenAI');
  }

  return {
    embedding: result.data[0].embedding,
    tokens: result.usage?.total_tokens || estimatedTokens,
    provider: 'openai',
    model: 'text-embedding-3-small'
  };
}