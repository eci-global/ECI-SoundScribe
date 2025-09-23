// @ts-nocheck
// Deno type declarations
declare const Deno: {
  env: { get(key: string): string | undefined };
};

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deploymentName: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  signal?: AbortSignal; // Add support for AbortSignal
}

interface TranscriptionRequest {
  file: File | Blob;
  filename?: string;  // ✅ ADD: Optional filename parameter
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export class AzureOpenAIClient {
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
  }

  /**
   * Create chat completion using Azure OpenAI
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<any> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;
    
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        max_tokens: request.max_tokens || 1000,
        temperature: request.temperature || 0.7,
        top_p: request.top_p || 1,
        frequency_penalty: request.frequency_penalty || 0,
        presence_penalty: request.presence_penalty || 0,
      }),
    };

    // Add AbortSignal if provided
    if (request.signal) {
      fetchOptions.signal = request.signal;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI Chat Completion Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url,
      });
      
      // Handle specific error cases
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorText}`);
      } else if (response.status === 401) {
        throw new Error(`Authentication failed: Check API key and endpoint`);
      } else if (response.status === 400) {
        throw new Error(`Bad request: ${errorText}`);
      } else if (response.status >= 500) {
        throw new Error(`Azure OpenAI service error: ${response.status} ${response.statusText}`);
      }
      
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Create transcription using Azure OpenAI Whisper with retry logic
   */
  async createTranscription(request: TranscriptionRequest): Promise<any> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/audio/transcriptions?api-version=${this.config.apiVersion}`;
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const formData = new FormData();
        // ✅ FIX: Use filename if provided, otherwise default to audio.mp4
        const filename = request.filename || 'audio.mp4';
        formData.append('file', request.file, filename);  // ✅ ADD: Include filename
        
        if (request.model) formData.append('model', request.model);
        if (request.language) formData.append('language', request.language);
        if (request.prompt) formData.append('prompt', request.prompt);
        if (request.response_format) formData.append('response_format', request.response_format);
        if (request.temperature !== undefined) formData.append('temperature', request.temperature.toString());

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'api-key': this.config.apiKey,
          },
          body: formData,
        });

        if (response.ok) {
          console.log('✅ Azure OpenAI Whisper transcription successful');
          return await response.json();
        }

        // Handle rate limiting (429) with retry
        if (response.status === 429) {
          const errorText = await response.text();
          console.warn(`⚠️ Rate limit hit (attempt ${retryCount + 1}/${maxRetries + 1}):`, errorText);
          
          if (retryCount < maxRetries) {
            // Extract retry-after from error message or use exponential backoff
            let waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            
            try {
              const errorData = JSON.parse(errorText);
              const message = errorData.error?.message || '';
              const retryMatch = message.match(/retry after (\d+) seconds/i);
              if (retryMatch) {
                waitTime = parseInt(retryMatch[1]) * 1000 + 1000; // Add 1s buffer
              }
            } catch (parseError) {
              // Use default exponential backoff
            }
            
            console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
        }

        // Handle other errors
        const errorText = await response.text();
        console.error('Azure OpenAI Transcription Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url,
        });
        throw new Error(`Azure OpenAI Transcription API error: ${response.status} ${response.statusText} - ${errorText}`);

      } catch (error) {
        if (retryCount < maxRetries && error.message.includes('429')) {
          console.warn(`⚠️ Retrying transcription (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded for Azure OpenAI transcription');
  }
}

/**
 * Create Azure OpenAI client for chat completions (GPT models)
 * Uses East US resource for chat completions
 */
export function createAzureOpenAIChatClient(): AzureOpenAIClient {
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
  const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-10-01-preview';
  const deploymentName = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT') || 'gpt-4o-mini';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY environment variables.');
  }

  console.log('🤖 Creating Azure OpenAI Chat Client:', {
    endpoint,
    deploymentName,
    hasApiKey: !!apiKey,
    apiVersion
  });

  return new AzureOpenAIClient({
    endpoint,
    apiKey,
    apiVersion,
    deploymentName,
  });
}

/**
 * Create Azure OpenAI client for audio transcription (Whisper)
 * Uses separate North Central US resource for Whisper transcription
 */
export function createAzureOpenAIWhisperClient(): AzureOpenAIClient {
  const endpoint = Deno.env.get('AZURE_OPENAI_WHISPER_ENDPOINT') || Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const apiKey = Deno.env.get('AZURE_OPENAI_WHISPER_API_KEY') || Deno.env.get('AZURE_OPENAI_API_KEY');
  const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-10-01-preview';
  const deploymentName = Deno.env.get('AZURE_OPENAI_WHISPER_DEPLOYMENT') || 'whisper-1';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI Whisper configuration missing. Please set AZURE_OPENAI_WHISPER_ENDPOINT and AZURE_OPENAI_WHISPER_API_KEY environment variables.');
  }

  console.log('🎤 Creating Azure OpenAI Whisper Client:', {
    endpoint,
    deploymentName,
    hasApiKey: !!apiKey,
    apiVersion
  });

  return new AzureOpenAIClient({
    endpoint,
    apiKey,
    apiVersion,
    deploymentName,
  });
}

/**
 * Utility function to migrate from OpenAI to Azure OpenAI format
 */
export function migrateOpenAIToAzure(openaiMessages: any[]): ChatMessage[] {
  return openaiMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Test Azure OpenAI connection for chat completions
 */
export async function testAzureOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createAzureOpenAIChatClient();
    const response = await client.createChatCompletion({
      messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
      max_tokens: 10,
      temperature: 0.1,
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test Azure OpenAI Whisper connection
 */
export async function testAzureOpenAIWhisperConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a simple test audio file (empty blob for connection test)
    const testBlob = new Blob(['test'], { type: 'audio/wav' });
    const testFile = new File([testBlob], 'test.wav', { type: 'audio/wav' });
    
    const client = createAzureOpenAIWhisperClient();
    await client.createTranscription({
      file: testFile,
      filename: 'test.wav'
    });
    
    return { success: true };
  } catch (error) {
    // Whisper will fail with empty audio, but we can check if the connection works
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('400') || errorMessage.includes('Bad request')) {
      // This is expected for empty audio, so connection is working
      return { success: true };
    }
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Enhanced JSON extraction from AI responses
 */
export function extractJsonFromAIResponse(content: string): any {
  if (!content) {
    throw new Error('Empty content provided');
  }

  // First, try to parse as-is
  try {
    return JSON.parse(content.trim());
  } catch (error) {
    console.warn('Direct JSON parsing failed, attempting to extract JSON...');
  }

  // Remove markdown code blocks
  let cleanedContent = content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find JSON object boundaries
  const jsonStart = cleanedContent.indexOf('{');
  const jsonEnd = cleanedContent.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const jsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('JSON extraction failed:', error);
    }
  }

  // Try to find array boundaries
  const arrayStart = cleanedContent.indexOf('[');
  const arrayEnd = cleanedContent.lastIndexOf(']');

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    const arrayString = cleanedContent.substring(arrayStart, arrayEnd + 1);
    
    try {
      return JSON.parse(arrayString);
    } catch (error) {
      console.warn('Array extraction failed:', error);
    }
  }

  throw new Error('Could not extract valid JSON from AI response');
}

/**
 * Validate AI moments structure
 */
export function validateAIMoments(moments: any): boolean {
  if (!Array.isArray(moments)) {
    return false;
  }

  return moments.every(moment => 
    moment && 
    typeof moment === 'object' &&
    typeof moment.type === 'string' &&
    typeof moment.start_time === 'number' &&
    typeof moment.end_time === 'number'
  );
} 