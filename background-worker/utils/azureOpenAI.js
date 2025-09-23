import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure OpenAI Client for background worker
 */
export class AzureOpenAIClient {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-01-preview';
    this.gptDeployment = process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT || 'gpt-4o-mini';
    this.whisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || 'whisper-1';
    
    // Separate Whisper endpoint if provided
    this.whisperEndpoint = process.env.AZURE_OPENAI_WHISPER_ENDPOINT || this.endpoint;
    this.whisperApiKey = process.env.AZURE_OPENAI_WHISPER_API_KEY || this.apiKey;

    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY');
    }
  }

  /**
   * Transcribe audio using Azure OpenAI Whisper
   */
  async transcribeAudio(audioBuffer, filename = 'audio.mp3', options = {}) {
    const startTime = Date.now();
    try {
      console.log(`🎤 Starting transcription for ${filename} (${audioBuffer.length} bytes)`);
      
      // Check Azure OpenAI Whisper file size limit (25MB)
      const AZURE_WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB
      const fileSizeMB = audioBuffer.length / (1024 * 1024);
      
      if (audioBuffer.length > AZURE_WHISPER_MAX_SIZE) {
        console.error(`❌ File too large for Azure OpenAI Whisper: ${fileSizeMB.toFixed(1)}MB > 25MB limit`);
        throw new Error(`File size ${fileSizeMB.toFixed(1)}MB exceeds Azure OpenAI Whisper limit (25MB). Please compress the file before transcription.`);
      }
      
      console.log(`✅ File size check passed: ${fileSizeMB.toFixed(1)}MB (under 25MB limit)`);
      
      const url = `${this.whisperEndpoint}/openai/deployments/${this.whisperDeployment}/audio/transcriptions?api-version=${this.apiVersion}`;
      
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
      // Optimize temperature for faster processing
      formData.append('temperature', (options.temperature !== undefined ? options.temperature : 0.1).toString());

      const response = await axios.post(url, formData, {
        headers: {
          'api-key': this.whisperApiKey,
          ...formData.getHeaders()
        },
        timeout: 120000, // Reduced from 180000 to 120000 (2 minutes)
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Transcription completed successfully in ${duration}ms`);
      return {
        success: true,
        data: response.data,
        processingTime: duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Transcription failed after ${duration}ms:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        processingTime: duration
      };
    }
  }

  /**
   * Generate chat completion using Azure OpenAI GPT
   */
  async generateChatCompletion(messages, options = {}) {
    const startTime = Date.now();
    try {
      const tokenCount = messages.reduce((total, msg) => total + (msg.content?.length || 0), 0);
      console.log(`🤖 Starting chat completion generation (estimated ${Math.ceil(tokenCount/4)} tokens)`);
      
      const url = `${this.endpoint}/openai/deployments/${this.gptDeployment}/chat/completions?api-version=${this.apiVersion}`;
      
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
        timeout: 45000, // Reduced from 60000 for faster timeout
        responseType: options.stream ? 'stream' : 'json'
      });

      const duration = Date.now() - startTime;
      const responseTokens = response.data?.usage?.completion_tokens || 0;
      console.log(`✅ Chat completion generated successfully in ${duration}ms (${responseTokens} tokens)`);
      return {
        success: true,
        data: response.data,
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
   * Generate summary from transcript
   */
  async generateSummary(transcript, options = {}) {
    // Optimized prompt - shorter, more direct
    const systemPrompt = `Create concise summaries capturing key points, decisions, and actions. 150-300 words, clear structure.`;

    const userPrompt = `Summarize this transcript:\n\n${transcript}`;

    return await this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      max_tokens: 400, // Reduced from 500
      temperature: 0.2, // Reduced for consistency
      ...options
    });
  }

  /**
   * Generate coaching evaluation
   */
  async generateCoachingEvaluation(transcript, options = {}) {
    // Optimized prompt - more concise while maintaining structure
    const systemPrompt = `Analyze sales call, return JSON coaching insights:
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

Be concise, practical, actionable.`;

    const userPrompt = `Analyze this sales call:\n\n${transcript}`;

    return await this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      max_tokens: 800, // Reduced from 1000
      temperature: 0.2, // Reduced for consistency
      ...options
    });
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