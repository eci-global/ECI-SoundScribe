import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure OpenAI Client for background worker with enhanced resilience
 */
export class AzureOpenAIClient {
  constructor() {
    // Dual deployment strategy - separate models for audio and chat
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-03-01-preview';
    
    // Primary configuration - shared endpoint and API key
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    
    // Separate deployments for different operations
    this.whisperEndpoint = process.env.AZURE_OPENAI_WHISPER_ENDPOINT || this.endpoint;
    this.whisperApiKey = process.env.AZURE_OPENAI_WHISPER_API_KEY || this.apiKey;
    this.whisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || 'whisper-1';
    this.gptDeployment = process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o';

    // Rate limiting configuration
    this.rateLimitConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 30000, // 30 second max delay
      backoffMultiplier: 2,
      jitterFactor: 0.1
    };

    if (!this.endpoint || !this.apiKey || !this.whisperDeployment || !this.gptDeployment) {
      throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_WHISPER_DEPLOYMENT, and AZURE_OPENAI_GPT4O_DEPLOYMENT');
    }
    
    console.log(`🤖 Azure OpenAI Client initialized with dual deployment strategy:`);
    console.log(`   Endpoint: ${this.endpoint}`);
    console.log(`   Whisper Endpoint: ${this.whisperEndpoint}`);
    console.log(`   Transcription Deployment: ${this.whisperDeployment} (Whisper for audio)`);
    console.log(`   Chat Deployment: ${this.gptDeployment} (GPT for completions)`);
    console.log(`   API Version: ${this.apiVersion}`);
    console.log(`   Strategy: Separate specialized deployments for optimal compatibility`);
  }

  /**
   * Enhanced retry logic with exponential backoff and jitter
   */
  async withRetry(operation, operationName, options = {}) {
    const { maxRetries = this.rateLimitConfig.maxRetries, isTranscription = false } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const isRateLimited = this.isRateLimitError(error);
        const isRetryable = isRateLimited || this.isRetryableError(error);

        console.log(`❌ ${operationName} attempt ${attempt}/${maxRetries} failed:`, 
          error.response?.data || error.message);

        if (attempt === maxRetries || !isRetryable) {
          // For transcription failures, we want to fail fast
          if (isTranscription) {
            console.error(`🚨 ${operationName} failed after ${attempt} attempts - this is critical for processing`);
            throw error;
          }
          
          // For AI generation (summary, coaching), we can continue without it
          if (isRateLimited) {
            console.log(`⚠️ ${operationName} rate limited after ${attempt} attempts - continuing without this feature`);
            return {
              success: false,
              error: 'Rate limit exceeded',
              rateLimited: true,
              canContinue: true
            };
          }
          
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, isRateLimited);
        console.log(`⏳ Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await this.sleep(delay);
      }
    }

    // Final error handling
    const isRateLimited = this.isRateLimitError(lastError);
    if (isRateLimited && !isTranscription) {
      console.log(`⚠️ ${operationName} permanently rate limited - continuing without this feature`);
      return {
        success: false,
        error: 'Rate limit exceeded after all retries',
        rateLimited: true,
        canContinue: true
      };
    }

    throw lastError;
  }

  /**
   * Check if error is rate limiting related
   */
  isRateLimitError(error) {
    if (!error) return false;
    
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error?.message || error.message || '';
    
    return status === 429 || 
           errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('too many requests') ||
           errorMessage.toLowerCase().includes('quota exceeded');
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;
    
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error?.message || error.message || '';
    
    // Rate limiting
    if (this.isRateLimitError(error)) return true;
    
    // Server errors
    if (status >= 500) return true;
    
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    // Specific Azure OpenAI errors
    if (errorMessage.includes('service unavailable') || 
        errorMessage.includes('internal server error') ||
        errorMessage.includes('bad gateway')) return true;
    
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(attempt, isRateLimited = false) {
    const baseDelay = isRateLimited ? this.rateLimitConfig.baseDelay * 2 : this.rateLimitConfig.baseDelay;
    const exponentialDelay = baseDelay * Math.pow(this.rateLimitConfig.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.rateLimitConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.rateLimitConfig.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Transcribe audio using Azure OpenAI Whisper with retry logic
   */
  async transcribeAudio(audioBuffer, filename = 'audio.mp3', options = {}) {
    const startTime = Date.now();
    
    const transcriptionOperation = async () => {
      console.log(`🎤 Starting transcription for ${filename} (${audioBuffer.length} bytes)`);
      
      // Validate audio buffer before sending
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty or invalid');
      }
      
      if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB Whisper limit
        throw new Error(`Audio chunk too large: ${audioBuffer.length} bytes (max 25MB for Whisper)`);
      }
      
      // Check for minimum file size (avoid sending tiny corrupted chunks)
      if (audioBuffer.length < 1024) { // 1KB minimum
        throw new Error(`Audio chunk too small: ${audioBuffer.length} bytes (likely corrupted)`);
      }
      
      // Log configuration for debugging
      // Ensure proper URL construction without double slashes
      const baseUrl = this.whisperEndpoint.endsWith('/') ? this.whisperEndpoint.slice(0, -1) : this.whisperEndpoint;
      const url = `${baseUrl}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=${this.apiVersion}`;
      console.log(`🌐 Whisper URL: ${url}`);
      console.log(`🔑 Using API version: ${this.apiVersion}`);
      console.log(`🎯 Deployment: ${this.whisperDeployment}`);
      
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: this.getContentType(filename)
      });
      
      // Add optional parameters with optimizations
      if (options.model) formData.append('model', options.model);
      if (options.language) formData.append('language', options.language);
      if (options.prompt) formData.append('prompt', options.prompt);
      if (options.response_format) formData.append('response_format', options.response_format);
      // Use temperature 0 for deterministic results (Azure OpenAI Whisper best practice)
      formData.append('temperature', (options.temperature !== undefined ? options.temperature : 0).toString());

      try {
        const response = await axios.post(url, formData, {
          headers: {
            'api-key': this.whisperApiKey,
            ...formData.getHeaders()
          },
          timeout: 180000, // Increased to 3 minutes for large chunks
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        return response.data;
      } catch (error) {
        // Enhanced error logging for 500 errors
        if (error.response?.status === 500) {
          console.error(`🚨 Azure OpenAI Whisper 500 Error Details:`);
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Status Text: ${error.response.statusText}`);
          console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
          console.error(`   File Size: ${audioBuffer.length} bytes`);
          console.error(`   Content Type: ${this.getContentType(filename)}`);
          console.error(`   API Version: ${this.apiVersion}`);
          console.error(`   Deployment: ${this.whisperDeployment}`);
          console.error(`   Endpoint: ${this.whisperEndpoint}`);
          
          // Check if it's a specific Azure service issue
          if (error.response.data?.error?.message) {
            console.error(`   Azure Error Message: ${error.response.data.error.message}`);
          }
        }
        throw error;
      }
    };

    try {
      const result = await this.withRetry(transcriptionOperation, 'Transcription', { 
        isTranscription: true,
        maxRetries: 5 // More retries for transcription since it's critical
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Transcription completed successfully in ${duration}ms`);
      return {
        success: true,
        data: result,
        processingTime: duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Transcription failed after ${duration}ms:`, error.response?.data || error.message);
      
      // Try with fallback API version if we got a 500 error
      if (error.response?.status === 500 && this.apiVersion.includes('2025-01-01')) {
        console.log(`🔄 Attempting fallback with stable API version due to 500 error...`);
        
        try {
          // Temporarily use stable API version
          const originalApiVersion = this.apiVersion;
          this.apiVersion = '2024-10-01-preview'; // Known stable version
          
          const fallbackOperation = async () => {
            console.log(`🔄 Fallback transcription attempt with API version: ${this.apiVersion}`);
            const baseUrl = this.whisperEndpoint.endsWith('/') ? this.whisperEndpoint.slice(0, -1) : this.whisperEndpoint;
            const url = `${baseUrl}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=${this.apiVersion}`;
            
            const formData = new FormData();
            formData.append('file', audioBuffer, {
              filename: filename,
              contentType: this.getContentType(filename)
            });
            
            // Add parameters
            if (options.model) formData.append('model', options.model);
            if (options.language) formData.append('language', options.language);
            if (options.prompt) formData.append('prompt', options.prompt);
            if (options.response_format) formData.append('response_format', options.response_format);
            formData.append('temperature', (options.temperature !== undefined ? options.temperature : 0).toString());

            const response = await axios.post(url, formData, {
              headers: {
                'api-key': this.whisperApiKey,
                ...formData.getHeaders()
              },
              timeout: 180000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });

            return response.data;
          };
          
          const fallbackResult = await this.withRetry(fallbackOperation, 'Fallback Transcription', {
            isTranscription: true,
            maxRetries: 3
          });
          
          // Restore original API version
          this.apiVersion = originalApiVersion;
          
          const fallbackDuration = Date.now() - startTime;
          console.log(`✅ Fallback transcription completed successfully in ${fallbackDuration}ms`);
          
          return {
            success: true,
            data: fallbackResult,
            processingTime: fallbackDuration,
            usedFallback: true
          };
          
        } catch (fallbackError) {
          // Restore original API version
          this.apiVersion = originalApiVersion;
          console.error(`❌ Fallback transcription also failed:`, fallbackError.response?.data || fallbackError.message);
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        processingTime: duration
      };
    }
  }

  /**
   * Generate chat completion using Azure OpenAI GPT with retry logic
   */
  async generateChatCompletion(messages, options = {}) {
    const startTime = Date.now();
    
    const chatOperation = async () => {
      const tokenCount = messages.reduce((total, msg) => total + (msg.content?.length || 0), 0);
      console.log(`🤖 Starting chat completion generation (estimated ${Math.ceil(tokenCount/4)} tokens)`);
      
      // Ensure proper URL construction without double slashes
      const baseUrl = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
      const url = `${baseUrl}/openai/deployments/${this.gptDeployment}/chat/completions?api-version=${this.apiVersion}`;
      console.log(`🤖 Chat Completion URL: ${url}`);
      console.log(`🤖 Using chat deployment: ${this.gptDeployment} (gpt-4o for completions)`);
      
      // Optimized for performance - reduced defaults
      const requestBody = {
        messages,
        max_tokens: options.max_tokens || 800, // Reduced from 1000
        temperature: options.temperature || 0.2, // Reduced from 0.3 for faster, more consistent responses
        top_p: options.top_p || 0.95, // Slightly reduced for faster generation
        frequency_penalty: options.frequency_penalty || 0,
        presence_penalty: options.presence_penalty || 0,
        stream: options.stream || false // Enable streaming support
      };

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        timeout: 45000, // 45 seconds
        responseType: options.stream ? 'stream' : 'json'
      });

      return response.data;
    };

    try {
      const result = await this.withRetry(chatOperation, 'Chat Completion', { 
        isTranscription: false,
        maxRetries: 3 // Standard retries for AI generation
      });
      
      // Handle rate limit response
      if (result && !result.success && result.rateLimited) {
        return result;
      }
      
      const duration = Date.now() - startTime;
      const responseTokens = result?.usage?.completion_tokens || 0;
      console.log(`✅ Chat completion generated successfully in ${duration}ms (${responseTokens} tokens)`);
      return {
        success: true,
        data: result,
        processingTime: duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Chat completion failed after ${duration}ms:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        processingTime: duration
      };
    }
  }

  /**
   * Generate summary from transcript with resilience
   */
  async generateSummary(transcript, options = {}) {
    // Enhanced prompt to generate structured summary with Key Points
    const systemPrompt = `Create a structured summary with the following format:

**Conversation Summary:**
[Brief overview of the conversation in 2-3 sentences]

**Key Points:**
• [First key point with bold sub-header]
• [Second key point with bold sub-header]  
• [Third key point with bold sub-header]

Use bold formatting (**text**) for sub-headers within bullet points. Keep each bullet point concise but informative.`;

    const userPrompt = `Summarize this transcript:\n\n${transcript}`;

    const result = await this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      max_tokens: 400, // Reduced from 500
      temperature: 0.2, // Reduced for consistency
      ...options
    });

    // Handle rate limiting gracefully
    if (result && !result.success && result.rateLimited) {
      console.log('⚠️ Summary generation rate limited - will retry later');
      return {
        success: false,
        error: 'Summary generation rate limited',
        rateLimited: true,
        canContinue: true
      };
    }

    return result;
  }

  /**
   * Generate coaching evaluation with resilience
   */
  async generateCoachingEvaluation(transcript, options = {}) {
    // Optimized prompt - more concise while maintaining structure
    const systemPrompt = `Analyze sales call and return ONLY valid JSON (no markdown, no code blocks, no backticks):

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
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2", "area3"],
  "actionItems": ["action1", "action2", "action3"],
  "summary": "<brief summary>"
}

Return ONLY the JSON object, nothing else.`;

    const userPrompt = `Analyze this sales call:\n\n${transcript}`;

    const result = await this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      max_tokens: 800, // Reduced from 1000
      temperature: 0.2, // Reduced for consistency
      ...options
    });

    // Handle rate limiting gracefully
    if (result && !result.success && result.rateLimited) {
      console.log('⚠️ Coaching evaluation rate limited - will retry later');
      return {
        success: false,
        error: 'Coaching evaluation rate limited',
        rateLimited: true,
        canContinue: true
      };
    }

    return result;
  }

  /**
   * Get appropriate content type for file
   */
  getContentType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'm4a': return 'audio/mp4';
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      default: return 'audio/mpeg';
    }
  }
}

export default AzureOpenAIClient;