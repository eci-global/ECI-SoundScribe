
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing OpenAI API key...');
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is missing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    console.log('API key found, testing connectivity...');

    // Test 1: Check if API key is valid by listing models
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text();
      console.error('Models API test failed:', errorText);
      
      let errorMessage = 'API key validation failed';
      if (modelsResponse.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (modelsResponse.status === 429) {
        errorMessage = 'Rate limit exceeded';
      } else if (modelsResponse.status === 403) {
        errorMessage = 'API key does not have required permissions';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: errorText,
          status: modelsResponse.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const modelsData = await modelsResponse.json();
    console.log(`Models API test passed. Found ${modelsData.data?.length || 0} models.`);

    // Test 2: Test chat completions with a simple request
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "API test successful" if you can read this.' }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Chat API test failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Chat completions test failed',
          details: errorText,
          status: chatResponse.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const chatData = await chatResponse.json();
    const testMessage = chatData.choices[0]?.message?.content || '';
    console.log('Chat API test passed:', testMessage);

    // Test 3: Check account usage/billing info (optional)
    let usageInfo = null;
    try {
      const usageResponse = await fetch('https://api.openai.com/v1/usage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (usageResponse.ok) {
        usageInfo = await usageResponse.json();
      }
    } catch (error) {
      console.log('Usage API not accessible (this is normal for some API keys)');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OpenAI API key is working correctly',
        tests: {
          modelsAccess: true,
          chatCompletions: true,
          testResponse: testMessage
        },
        apiInfo: {
          modelsAvailable: modelsData.data?.length || 0,
          keyValid: true,
          usageInfo: usageInfo || 'Not available'
        },
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error testing OpenAI API:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
