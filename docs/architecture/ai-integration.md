# AI Integration Architecture

## Azure OpenAI Service Integration

### Service Configuration
Azure OpenAI provides enterprise-grade AI capabilities with comprehensive security, compliance, and performance features.

#### Deployment Models
```typescript
// Configuration for different deployment types
interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployments: {
    whisper: string;
    gpt4: string;
    gpt4Turbo: string;
  };
  apiVersion: string;
  region: string;
}

const azureConfig: AzureOpenAIConfig = {
  endpoint: process.env.VITE_AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  deployments: {
    whisper: 'whisper-deployment',
    gpt4: 'gpt-4-deployment',
    gpt4Turbo: 'gpt-4-turbo-deployment',
  },
  apiVersion: '2024-02-01',
  region: 'eastus2',
};
```

#### Security Implementation
- **Data Isolation**: Customer data never used for model training
- **Network Security**: VNet integration and private endpoints
- **Compliance**: SOC 2, HIPAA, ISO 27001 certified
- **Encryption**: TLS 1.2+ in transit, AES-256 at rest

## Whisper API for Speech Recognition

### Audio Processing Pipeline
```typescript
// Edge Function: Audio transcription service
export async function transcribeAudio(
  audioFileUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    // Download audio file from Supabase Storage
    const audioResponse = await fetch(audioFileUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', options.language || 'en');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    formData.append('timestamp_granularities[]', 'word');
    
    // Call Azure OpenAI Whisper API
    const response = await fetch(
      `${azureConfig.endpoint}/openai/deployments/${azureConfig.deployments.whisper}/audio/transcriptions?api-version=${azureConfig.apiVersion}`,
      {
        method: 'POST',
        headers: {
          'api-key': azureConfig.apiKey,
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      text: result.text,
      segments: result.segments,
      words: result.words,
      language: result.language,
      duration: result.duration,
    };
    
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

interface TranscriptionOptions {
  language?: string;
  temperature?: number;
  prompt?: string;
}

interface TranscriptionResult {
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  language: string;
  duration: number;
}
```

### Speaker Identification Pipeline
```typescript
// Custom speaker identification using audio analysis
export async function identifySpeakers(
  transcriptionSegments: TranscriptionResult['segments'],
  audioFileUrl: string
): Promise<SpeakerMap> {
  const speakerMap: SpeakerMap = {};
  let currentSpeaker = 'Speaker 1';
  let speakerCount = 1;
  
  // Analyze segments for speaker changes
  for (let i = 0; i < transcriptionSegments.length; i++) {
    const segment = transcriptionSegments[i];
    const prevSegment = transcriptionSegments[i - 1];
    
    // Detect speaker change based on pause duration and audio characteristics
    if (prevSegment && segment.start - prevSegment.end > 2.0) {
      // Significant pause - likely speaker change
      speakerCount++;
      currentSpeaker = `Speaker ${speakerCount}`;
    }
    
    // Additional analysis using no_speech_prob and avg_logprob
    if (segment.no_speech_prob > 0.6 || segment.avg_logprob < -1.0) {
      // Low confidence segment - might be background noise or speaker change
      if (segment.text.trim().length > 0) {
        speakerCount++;
        currentSpeaker = `Speaker ${speakerCount}`;
      }
    }
    
    speakerMap[segment.id] = {
      speaker: currentSpeaker,
      confidence: 1 - segment.no_speech_prob,
      segment: segment,
    };
  }
  
  return speakerMap;
}

interface SpeakerMap {
  [segmentId: number]: {
    speaker: string;
    confidence: number;
    segment: TranscriptionResult['segments'][0];
  };
}

// Enhanced speaker identification with ML
export async function enhancedSpeakerIdentification(
  audioFileUrl: string,
  transcriptionSegments: TranscriptionResult['segments']
): Promise<EnhancedSpeakerMap> {
  // This would integrate with additional ML services for voice fingerprinting
  // For now, using rule-based approach with audio characteristics
  
  const speakerProfiles: SpeakerProfile[] = [];
  const speakerMap: EnhancedSpeakerMap = {};
  
  for (const segment of transcriptionSegments) {
    const audioFeatures = analyzeAudioFeatures(segment);
    const matchedProfile = findMatchingSpeaker(audioFeatures, speakerProfiles);
    
    if (matchedProfile) {
      speakerMap[segment.id] = {
        speakerId: matchedProfile.id,
        speakerName: matchedProfile.name,
        confidence: calculateConfidence(audioFeatures, matchedProfile),
        segment: segment,
      };
    } else {
      // Create new speaker profile
      const newProfile: SpeakerProfile = {
        id: `speaker_${speakerProfiles.length + 1}`,
        name: `Speaker ${speakerProfiles.length + 1}`,
        audioFeatures: audioFeatures,
      };
      speakerProfiles.push(newProfile);
      
      speakerMap[segment.id] = {
        speakerId: newProfile.id,
        speakerName: newProfile.name,
        confidence: 0.8,
        segment: segment,
      };
    }
  }
  
  return speakerMap;
}

interface SpeakerProfile {
  id: string;
  name: string;
  audioFeatures: AudioFeatures;
}

interface AudioFeatures {
  avgLogProb: number;
  compressionRatio: number;
  speechRate: number;
  pausePattern: number[];
}

interface EnhancedSpeakerMap {
  [segmentId: number]: {
    speakerId: string;
    speakerName: string;
    confidence: number;
    segment: TranscriptionResult['segments'][0];
  };
}
```

## GPT-4 Analysis Engine

### Sales Coaching Analysis
```typescript
// Comprehensive sales call analysis using GPT-4
export async function analyzeSalesCall(
  transcription: string,
  speakerMap: SpeakerMap,
  metadata: CallMetadata
): Promise<SalesAnalysis> {
  const systemPrompt = `You are an expert sales coach analyzing a sales call transcription. 
  Provide comprehensive coaching feedback focusing on:
  
  1. Talk time ratio between sales rep and prospect
  2. Discovery questions quality and quantity
  3. Objection handling effectiveness
  4. Closing techniques used
  5. Next steps clarity
  6. Overall call flow and structure
  7. Areas for improvement
  8. Positive highlights
  
  Rate each area on a scale of 1-10 and provide specific examples from the transcript.
  Format your response as structured JSON.`;
  
  const userPrompt = `Analyze this sales call:
  
  Call Duration: ${metadata.duration} minutes
  Participants: ${Object.values(speakerMap).map(s => s.speaker).join(', ')}
  
  Transcript:
  ${formatTranscriptWithSpeakers(transcription, speakerMap)}
  
  Please provide detailed coaching analysis.`;
  
  try {
    const response = await fetch(
      `${azureConfig.endpoint}/openai/deployments/${azureConfig.deployments.gpt4}/chat/completions?api-version=${azureConfig.apiVersion}`,
      {
        method: 'POST',
        headers: {
          'api-key': azureConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`GPT-4 analysis failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    const analysisData = JSON.parse(result.choices[0].message.content);
    
    return {
      overallScore: analysisData.overall_score,
      talkTimeRatio: analysisData.talk_time_ratio,
      discoveryQuestions: {
        score: analysisData.discovery_questions.score,
        count: analysisData.discovery_questions.count,
        quality: analysisData.discovery_questions.quality,
        examples: analysisData.discovery_questions.examples,
      },
      objectionHandling: {
        score: analysisData.objection_handling.score,
        objectionsRaised: analysisData.objection_handling.objections_raised,
        handlingEffectiveness: analysisData.objection_handling.effectiveness,
        examples: analysisData.objection_handling.examples,
      },
      closingTechniques: {
        score: analysisData.closing_techniques.score,
        techniquesUsed: analysisData.closing_techniques.techniques_used,
        effectiveness: analysisData.closing_techniques.effectiveness,
      },
      nextSteps: {
        score: analysisData.next_steps.score,
        clarity: analysisData.next_steps.clarity,
        commitment: analysisData.next_steps.commitment,
        timeline: analysisData.next_steps.timeline,
      },
      strengths: analysisData.strengths,
      improvementAreas: analysisData.improvement_areas,
      coachingTips: analysisData.coaching_tips,
      keyMoments: analysisData.key_moments,
    };
    
  } catch (error) {
    console.error('Sales analysis error:', error);
    throw error;
  }
}

interface CallMetadata {
  duration: number;
  participants: string[];
  callType: 'discovery' | 'demo' | 'closing' | 'follow-up';
  prospectInfo?: {
    company: string;
    title: string;
    industry: string;
  };
}

interface SalesAnalysis {
  overallScore: number;
  talkTimeRatio: {
    salesRep: number;
    prospect: number;
    ideal: number;
  };
  discoveryQuestions: {
    score: number;
    count: number;
    quality: string;
    examples: string[];
  };
  objectionHandling: {
    score: number;
    objectionsRaised: string[];
    handlingEffectiveness: string;
    examples: Array<{
      objection: string;
      response: string;
      effectiveness: number;
    }>;
  };
  closingTechniques: {
    score: number;
    techniquesUsed: string[];
    effectiveness: string;
  };
  nextSteps: {
    score: number;
    clarity: string;
    commitment: string;
    timeline: string;
  };
  strengths: string[];
  improvementAreas: string[];
  coachingTips: string[];
  keyMoments: Array<{
    timestamp: string;
    type: 'positive' | 'improvement' | 'critical';
    description: string;
    transcript: string;
  }>;
}
```

### Advanced Topic Extraction
```typescript
// Extract key topics and themes from conversation
export async function extractTopics(
  transcription: string,
  analysisContext: AnalysisContext
): Promise<TopicAnalysis> {
  const systemPrompt = `You are an expert at analyzing business conversations and extracting key topics, themes, and insights. 
  Identify:
  
  1. Primary business topics discussed
  2. Pain points mentioned by the prospect
  3. Budget/pricing discussions
  4. Decision-making process insights
  5. Competitor mentions
  6. Timeline and urgency indicators
  7. Stakeholder involvement
  8. Technical requirements
  
  For each topic, provide:
  - Topic name and category
  - Importance score (1-10)
  - Key quotes from the transcript
  - Sentiment (positive/neutral/negative)
  - Follow-up actions needed`;
  
  const userPrompt = `Analyze this business conversation for key topics:
  
  Context: ${analysisContext.callType} call with ${analysisContext.company}
  Industry: ${analysisContext.industry}
  
  Transcript:
  ${transcription}`;
  
  try {
    const response = await fetch(
      `${azureConfig.endpoint}/openai/deployments/${azureConfig.deployments.gpt4Turbo}/chat/completions?api-version=${azureConfig.apiVersion}`,
      {
        method: 'POST',
        headers: {
          'api-key': azureConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      }
    );
    
    const result = await response.json();
    const topicData = JSON.parse(result.choices[0].message.content);
    
    return {
      primaryTopics: topicData.primary_topics.map((topic: any) => ({
        name: topic.name,
        category: topic.category,
        importance: topic.importance,
        sentiment: topic.sentiment,
        quotes: topic.quotes,
        followUpActions: topic.follow_up_actions,
      })),
      painPoints: topicData.pain_points,
      budgetInfo: topicData.budget_info,
      decisionProcess: topicData.decision_process,
      competitors: topicData.competitors,
      timeline: topicData.timeline,
      stakeholders: topicData.stakeholders,
      technicalRequirements: topicData.technical_requirements,
    };
    
  } catch (error) {
    console.error('Topic extraction error:', error);
    throw error;
  }
}

interface AnalysisContext {
  callType: string;
  company: string;
  industry: string;
  participantRoles: string[];
}

interface TopicAnalysis {
  primaryTopics: Array<{
    name: string;
    category: string;
    importance: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    quotes: string[];
    followUpActions: string[];
  }>;
  painPoints: Array<{
    description: string;
    severity: number;
    solutions: string[];
  }>;
  budgetInfo: {
    mentioned: boolean;
    range?: string;
    decisionTimeline?: string;
    budgetHolder?: string;
  };
  decisionProcess: {
    stakeholders: string[];
    criteria: string[];
    timeline: string;
    nextSteps: string[];
  };
  competitors: Array<{
    name: string;
    context: string;
    sentiment: string;
  }>;
  timeline: {
    urgency: 'low' | 'medium' | 'high';
    keyDates: Array<{
      date: string;
      event: string;
    }>;
  };
  stakeholders: Array<{
    name?: string;
    role: string;
    influence: number;
    involvement: string;
  }>;
  technicalRequirements: string[];
}
```

## Batch Processing Optimization

### Cost-Effective Bulk Processing
```typescript
// Batch processing for large-scale analysis
export async function processBatchAnalysis(
  recordings: Array<{ id: string; transcription: string }>
): Promise<BatchProcessingResult> {
  // Split into optimal batch sizes (Azure OpenAI batch API supports up to 50,000 requests)
  const batchSize = 100;
  const batches = chunkArray(recordings, batchSize);
  
  const results: BatchProcessingResult = {
    processed: 0,
    failed: 0,
    results: [],
    errors: [],
  };
  
  for (const batch of batches) {
    try {
      // Create batch request file
      const batchRequests = batch.map((recording, index) => ({
        custom_id: `analysis-${recording.id}`,
        method: 'POST',
        url: `/chat/completions`,
        body: {
          model: azureConfig.deployments.gpt4,
          messages: [
            {
              role: 'system',
              content: 'Analyze this sales call transcript and provide coaching insights.',
            },
            {
              role: 'user',
              content: recording.transcription,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        },
      }));
      
      // Submit batch for processing
      const batchId = await submitBatchRequest(batchRequests);
      
      // Poll for completion (batch processing is async)
      const batchResult = await pollBatchCompletion(batchId);
      
      // Process results
      for (const result of batchResult.results) {
        if (result.response.status_code === 200) {
          results.processed++;
          results.results.push({
            recordingId: result.custom_id.replace('analysis-', ''),
            analysis: JSON.parse(result.response.body.choices[0].message.content),
          });
        } else {
          results.failed++;
          results.errors.push({
            recordingId: result.custom_id.replace('analysis-', ''),
            error: result.response.error,
          });
        }
      }
      
    } catch (error) {
      console.error('Batch processing error:', error);
      results.failed += batch.length;
      results.errors.push(...batch.map(r => ({
        recordingId: r.id,
        error: error.message,
      })));
    }
  }
  
  return results;
}

async function submitBatchRequest(requests: any[]): Promise<string> {
  // Create batch file
  const batchData = requests.map(req => JSON.stringify(req)).join('\n');
  
  const response = await fetch(
    `${azureConfig.endpoint}/openai/batches?api-version=${azureConfig.apiVersion}`,
    {
      method: 'POST',
      headers: {
        'api-key': azureConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_file_id: await uploadBatchFile(batchData),
        endpoint: '/chat/completions',
        completion_window: '24h',
      }),
    }
  );
  
  const result = await response.json();
  return result.id;
}

async function pollBatchCompletion(batchId: string): Promise<any> {
  const maxAttempts = 120; // 2 hours with 1-minute intervals
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const response = await fetch(
      `${azureConfig.endpoint}/openai/batches/${batchId}?api-version=${azureConfig.apiVersion}`,
      {
        headers: {
          'api-key': azureConfig.apiKey,
        },
      }
    );
    
    const batch = await response.json();
    
    if (batch.status === 'completed') {
      // Download results
      return await downloadBatchResults(batch.output_file_id);
    } else if (batch.status === 'failed' || batch.status === 'cancelled') {
      throw new Error(`Batch processing failed: ${batch.status}`);
    }
    
    // Wait 1 minute before checking again
    await new Promise(resolve => setTimeout(resolve, 60000));
    attempts++;
  }
  
  throw new Error('Batch processing timeout');
}

interface BatchProcessingResult {
  processed: number;
  failed: number;
  results: Array<{
    recordingId: string;
    analysis: any;
  }>;
  errors: Array<{
    recordingId: string;
    error: string;
  }>;
}
```

## Performance Optimization

### Token Management
```typescript
// Efficient token usage strategies
export class TokenManager {
  private static readonly MAX_TOKENS = {
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-4o': 128000,
  };
  
  static optimizePrompt(
    text: string,
    model: string,
    maxResponseTokens: number = 1000
  ): string {
    const maxInputTokens = this.MAX_TOKENS[model as keyof typeof this.MAX_TOKENS] - maxResponseTokens;
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxInputTokens) {
      return text;
    }
    
    // Truncate intelligently, preserving important sections
    return this.intelligentTruncation(text, maxInputTokens);
  }
  
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }
  
  static intelligentTruncation(text: string, maxTokens: number): string {
    const targetLength = maxTokens * 4; // Convert tokens to characters
    
    if (text.length <= targetLength) {
      return text;
    }
    
    // Try to preserve beginning and end, truncate middle
    const beginningLength = Math.floor(targetLength * 0.6);
    const endLength = Math.floor(targetLength * 0.3);
    
    const beginning = text.substring(0, beginningLength);
    const end = text.substring(text.length - endLength);
    
    return `${beginning}\n\n[... content truncated for length ...]\n\n${end}`;
  }
}

// Caching strategy for repeated analyses
export class AnalysisCache {
  private static cache = new Map<string, any>();
  
  static generateKey(transcription: string, analysisType: string): string {
    // Create hash of transcription + analysis type
    return `${analysisType}-${this.hashString(transcription)}`;
  }
  
  static async getCached<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
      return cached.data;
    }
    return null;
  }
  
  static setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Usage example with caching
export async function cachedSalesAnalysis(
  transcription: string,
  speakerMap: SpeakerMap,
  metadata: CallMetadata
): Promise<SalesAnalysis> {
  const cacheKey = AnalysisCache.generateKey(transcription, 'sales-analysis');
  
  // Check cache first
  const cached = await AnalysisCache.getCached<SalesAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Perform analysis
  const analysis = await analyzeSalesCall(transcription, speakerMap, metadata);
  
  // Cache result
  AnalysisCache.setCached(cacheKey, analysis);
  
  return analysis;
}
```

## Error Handling and Monitoring

### Comprehensive Error Management
```typescript
// Error handling for AI processing
export class AIProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AIProcessingError';
  }
}

export async function safeAIProcess<T>(
  operation: () => Promise<T>,
  context: { recordingId: string; operation: string }
): Promise<T> {
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Log error for monitoring
      console.error(`AI processing error (attempt ${attempt}/${maxRetries}):`, {
        recordingId: context.recordingId,
        operation: context.operation,
        error: error.message,
        attempt,
      });
      
      // Determine if retryable
      if (error instanceof AIProcessingError && !error.retryable) {
        throw error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new AIProcessingError(
    `AI processing failed after ${maxRetries} attempts: ${lastError.message}`,
    'MAX_RETRIES_EXCEEDED',
    false,
    lastError
  );
}

// Performance monitoring
export class AIPerformanceMonitor {
  static async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await operation();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      
      // Log metrics (could be sent to monitoring service)
      console.log('AI Operation Metrics:', {
        operation: operationName,
        duration,
        success,
        timestamp: new Date().toISOString(),
      });
      
      // Alert on slow operations
      if (duration > 30000) { // 30 seconds
        console.warn(`Slow AI operation detected: ${operationName} took ${duration}ms`);
      }
    }
  }
}
```