import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  createAzureOpenAIChatClient, 
  createAzureOpenAIWhisperClient, 
  testAzureOpenAIConnection,
  testAzureOpenAIWhisperConnection
} from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('🧪 Testing Azure OpenAI Connections...');
    
    // First, check environment variables
    const requiredVars = [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_WHISPER_ENDPOINT', 
      'AZURE_OPENAI_WHISPER_API_KEY',
      'AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT',
      'AZURE_OPENAI_WHISPER_DEPLOYMENT',
      'AZURE_OPENAI_API_VERSION'
    ];
    
    const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars);
      return createErrorResponse(
        `Missing required environment variables: ${missingVars.join(', ')}`,
        500,
        {
          missingVariables: missingVars,
          allRequiredVariables: requiredVars,
          setupGuide: 'Set these variables in Supabase Dashboard → Settings → Edge Functions',
          configurationStatus: requiredVars.reduce((acc, varName) => {
            acc[varName] = Deno.env.get(varName) ? 'SET ✅' : 'MISSING ❌';
            return acc;
          }, {} as Record<string, string>)
        }
      );
    }
    
    console.log('✅ All environment variables present');
    
    // Test chat completion connection (East US)
    console.log('🗨️ Testing Chat Completion (East US)...');
    const chatConnectionTest = await testAzureOpenAIConnection();
    
    if (!chatConnectionTest.success) {
      return createErrorResponse(
        `Azure OpenAI Chat connection failed: ${chatConnectionTest.error}`,
        500
      );
    }

    // Test Whisper connection (North Central US)
    console.log('🎤 Testing Whisper Connection (North Central US)...');
    const whisperConnectionTest = await testAzureOpenAIWhisperConnection();
    
    if (!whisperConnectionTest.success) {
      return createErrorResponse(
        `Azure OpenAI Whisper connection failed: ${whisperConnectionTest.error}`,
        500
      );
    }

    // Test actual chat completion
    const chatClient = createAzureOpenAIChatClient();
    const chatResponse = await chatClient.createChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for SoundScribe, an AI-powered call analysis platform.'
        },
        {
          role: 'user',
          content: 'Generate a brief test response to confirm Azure OpenAI is working correctly.'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const testResults = {
      chatConnection: 'SUCCESS ✅',
      whisperConnection: 'SUCCESS ✅',
      chatCompletion: 'SUCCESS ✅',
      architecture: 'Dual-Region Azure OpenAI',
      chatRegion: 'East US',
      whisperRegion: 'North Central US',
      chatModel: chatResponse.model || 'gpt-4o-mini',
      whisperModel: 'whisper-1',
      usage: chatResponse.usage,
      response: chatResponse.choices?.[0]?.message?.content || 'No response content',
      timestamp: new Date().toISOString(),
      chatEndpoint: Deno.env.get('AZURE_OPENAI_ENDPOINT'),
      whisperEndpoint: Deno.env.get('AZURE_OPENAI_WHISPER_ENDPOINT'),
      chatDeployment: Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT'),
      whisperDeployment: Deno.env.get('AZURE_OPENAI_WHISPER_DEPLOYMENT'),
      apiVersion: Deno.env.get('AZURE_OPENAI_API_VERSION')
    };

    console.log('✅ Azure OpenAI Full Integration Test Results:', testResults);

    return createSuccessResponse({
      message: 'Azure OpenAI full integration test completed successfully',
      results: testResults
    });

  } catch (error) {
    console.error('❌ Azure OpenAI Test Error:', error);
    
    return createErrorResponse(
      `Azure OpenAI test failed: ${error.message}`,
      500,
      {
        error: error.message,
        stack: error.stack,
        chatEndpoint: Deno.env.get('AZURE_OPENAI_ENDPOINT'),
        whisperEndpoint: Deno.env.get('AZURE_OPENAI_WHISPER_ENDPOINT'),
        hasChatApiKey: !!Deno.env.get('AZURE_OPENAI_API_KEY'),
        hasWhisperApiKey: !!Deno.env.get('AZURE_OPENAI_WHISPER_API_KEY'),
        chatDeployment: Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT'),
        whisperDeployment: Deno.env.get('AZURE_OPENAI_WHISPER_DEPLOYMENT')
      }
    );
  }
}); 