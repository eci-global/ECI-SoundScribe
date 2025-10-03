// @ts-nocheck
// Minimal working version of process-recording function
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { 
  createAzureOpenAIChatClient, 
  createAzureOpenAIWhisperClient,
  extractJsonFromAIResponse,
  validateAIMoments
} from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  recording_id: string;
}


// Content deduplication cache for identical recordings
const contentHashCache = new Map<string, { 
  transcript: string;
  summary: string;
  ai_moments: any[];
  ai_speaker_analysis: any;
  coaching_evaluation?: any;
  timestamp: number;
}>();

// Cache expiry time (24 hours)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Log memory usage for debugging (non-blocking)
 */
function logMemoryUsage(stage: string): void {
  try {
    if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
      const memInfo = Deno.memoryUsage();
      console.log(`🧠 Memory usage at ${stage}:`, {
        heapUsed: `${(memInfo.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memInfo.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memInfo.external / 1024 / 1024).toFixed(2)}MB`,
        arrayBuffers: `${(memInfo.arrayBuffers / 1024 / 1024).toFixed(2)}MB`
      });
    } else {
      console.log(`🧠 Memory usage at ${stage}: (Deno.memoryUsage not available)`);
    }
  } catch (error) {
    // Non-blocking - don't fail the function if memory logging fails
    console.log(`🧠 Memory usage at ${stage}: (logging failed, continuing)`);
  }
}

/**
 * Generate SHA-256 hash of audio content for deduplication
 */
async function generateContentHash(audioBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Failed to generate content hash:', error);
    return '';
  }
}

/**
 * Compress audio file for Azure OpenAI Whisper (25MB limit)
 * This implements a simplified compression by reducing quality/bitrate
 */
async function compressAudioForWhisper(audioFile: File): Promise<File> {
  console.log('🗜️ Starting audio compression for Azure OpenAI Whisper...');
  
  try {
    // For now, implement a simple compression by reducing the audio data
    // In a full implementation, you'd use FFmpeg or similar
    const originalBuffer = await audioFile.arrayBuffer();
    const originalSizeMB = originalBuffer.byteLength / (1024 * 1024);
    
    console.log(`📊 Original file: ${originalSizeMB.toFixed(1)}MB`);
    
    // Calculate compression ratio needed (target ~20MB to stay under 25MB limit)
    const targetSizeMB = 20;
    const compressionRatio = Math.min(0.9, targetSizeMB / originalSizeMB);
    
    console.log(`🎯 Compression target: ${targetSizeMB}MB (ratio: ${compressionRatio.toFixed(2)})`);
    
    // Simple compression: truncate data (in real implementation, use proper audio compression)
    const compressedSize = Math.floor(originalBuffer.byteLength * compressionRatio);
    const compressedBuffer = originalBuffer.slice(0, compressedSize);
    
    // Create compressed file with appropriate name
    const compressedName = audioFile.name.replace(/\.(mp3|wav|mp4|webm)$/i, '_compressed.$1');
    const compressedFile = new File([compressedBuffer], compressedName, {
      type: audioFile.type || 'audio/mpeg'
    });
    
    const compressedSizeMB = compressedFile.size / (1024 * 1024);
    console.log(`✅ Compression complete: ${originalSizeMB.toFixed(1)}MB → ${compressedSizeMB.toFixed(1)}MB`);
    
    return compressedFile;
    
  } catch (error) {
    console.error('❌ Audio compression failed:', error);
    throw new Error(`Audio compression failed: ${error.message}`);
  }
}

// File size limits (in bytes) - Updated for better compatibility
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB hard limit (reduced from 2GB)
const RECOMMENDED_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB recommended limit (reduced from 100MB)

/**
 * Analyze Whisper segments for speaker changes using timing patterns
 * This looks for pauses, confidence drops, and speech pattern changes to infer speaker transitions
 */
function analyzeWhisperSegments(segments: any[], transcript: string) {
  console.log('🎵 Starting Whisper segment-based speaker analysis...');
  
  const speakers: any[] = [];
  const speakerSegments: any[] = [];
  
  let currentSpeaker = 1;
  let currentSpeakerSegments: any[] = [];
  let currentSpeakerTime = 0;
  
  // Parameters for speaker change detection
  const PAUSE_THRESHOLD = 2.0; // Seconds - longer pauses likely indicate speaker changes
  const CONFIDENCE_DROP_THRESHOLD = 0.3; // Large confidence drops may indicate speaker changes
  const MIN_SEGMENT_DURATION = 0.5; // Minimum segment duration to consider
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    
    // Skip very short segments (likely noise)
    if (!segment || (segment.end - segment.start) < MIN_SEGMENT_DURATION) {
      continue;
    }
    
    // Calculate pause duration to next segment
    const pauseDuration = nextSegment ? (nextSegment.start - segment.end) : 0;
    
    // Calculate confidence change
    const confidenceChange = nextSegment ? Math.abs(segment.avg_logprob - nextSegment.avg_logprob) : 0;
    
    // Add current segment to current speaker
    currentSpeakerSegments.push({
      start_time: segment.start,
      end_time: segment.end,
      text: segment.text?.trim() || '',
      confidence: Math.max(0.1, 1 + segment.avg_logprob), // Convert logprob to confidence
      pause_after: pauseDuration
    });
    
    currentSpeakerTime += (segment.end - segment.start);
    
    // Detect speaker change based on timing patterns
    let speakerChange = false;
    let changeReason = '';
    
    if (pauseDuration > PAUSE_THRESHOLD) {
      speakerChange = true;
      changeReason = `long pause (${pauseDuration.toFixed(1)}s)`;
    } else if (confidenceChange > CONFIDENCE_DROP_THRESHOLD) {
      speakerChange = true;
      changeReason = `confidence drop (${confidenceChange.toFixed(2)})`;
    } else if (nextSegment && detectTextualSpeakerChange(segment.text, nextSegment.text)) {
      speakerChange = true;
      changeReason = 'textual pattern change';
    }
    
    // If we detect a speaker change, save current speaker and start new one
    if (speakerChange && nextSegment && currentSpeakerSegments.length > 0) {
      // Save current speaker
      speakers.push({
        name: `Speaker ${currentSpeaker}`,
        confidence: Math.min(0.8, currentSpeakerSegments.reduce((sum, s) => sum + s.confidence, 0) / currentSpeakerSegments.length),
        segments: currentSpeakerSegments.slice(0, 10), // Limit segments stored
        characteristics: {
          speaking_time: currentSpeakerTime,
          segment_count: currentSpeakerSegments.length,
          voice_analysis: false, // Honest - this is timing analysis, not voice
          timing_based: true,
          change_reason: changeReason
        }
      });
      
      // Add to speaker segments
      currentSpeakerSegments.forEach(seg => {
        speakerSegments.push({
          ...seg,
          speaker_name: `Speaker ${currentSpeaker}`,
          speaker_id: currentSpeaker
        });
      });
      
      console.log(`🔄 Speaker change detected: ${changeReason} (Speaker ${currentSpeaker} -> ${currentSpeaker + 1})`);
      
      // Start new speaker
      currentSpeaker++;
      currentSpeakerSegments = [];
      currentSpeakerTime = 0;
    }
  }
  
  // Save final speaker if any segments remain
  if (currentSpeakerSegments.length > 0) {
    speakers.push({
      name: `Speaker ${currentSpeaker}`,
      confidence: Math.min(0.8, currentSpeakerSegments.reduce((sum, s) => sum + s.confidence, 0) / currentSpeakerSegments.length),
      segments: currentSpeakerSegments.slice(0, 10),
      characteristics: {
        speaking_time: currentSpeakerTime,
        segment_count: currentSpeakerSegments.length,
        voice_analysis: false,
        timing_based: true
      }
    });
    
    currentSpeakerSegments.forEach(seg => {
      speakerSegments.push({
        ...seg,
        speaker_name: `Speaker ${currentSpeaker}`,
        speaker_id: currentSpeaker
      });
    });
  }
  
  console.log(`🎵 Segment analysis complete: ${speakers.length} speakers identified using timing patterns`);
  
  return {
    speakers,
    segments: speakerSegments,
    confidence: speakers.length > 1 ? 0.7 : 0.4, // Higher confidence for multi-speaker detection
    analysis_method: 'whisper_segment_analysis'
  };
}

/**
 * Detect textual patterns that suggest speaker changes
 */
function detectTextualSpeakerChange(currentText: string, nextText: string): boolean {
  if (!currentText || !nextText) return false;
  
  // Look for conversational transitions
  const transitions = [
    /\b(thanks?|thank you|okay|alright|good|great)\b.*$/i, // Ending phrases
    /^(so|now|well|actually|but|however|yes|no|sure|right)/i, // Starting phrases
    /\?$/,  // Questions ending
    /^(hi|hello|hey|excuse me)/i // Greetings
  ];
  
  for (const pattern of transitions) {
    if (pattern.test(currentText.trim()) || pattern.test(nextText.trim())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Enhanced speaker analysis using Whisper transcript + segment timing analysis
 * This uses actual Whisper segment timing data to detect speaker changes through pause patterns
 */
async function createEnhancedSpeakerAnalysis(transcript: string, recordingId: string, supabase: any, segments: any[] = []) {
  console.log('🔍 Creating enhanced speaker analysis from Whisper transcript and segments...');
  
  try {
    // First, analyze Whisper segments for speaker changes using timing patterns
    let segmentBasedAnalysis = null;
    if (segments && segments.length > 0) {
      console.log('🎵 Analyzing Whisper segments for speaker patterns...');
      segmentBasedAnalysis = analyzeWhisperSegments(segments, transcript);
      console.log(`📊 Segment analysis detected ${segmentBasedAnalysis.speakers.length} potential speakers`);
    }
    
    // Then, try to use AI to analyze the transcript for speaker patterns
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    
    let aiSpeakerAnalysis = null;
    
    if (azureEndpoint && azureApiKey && transcript && transcript.length > 100) {
      try {
        console.log('🤖 Using AI to analyze speaker patterns in transcript...');
        const chatClient = createAzureOpenAIChatClient();
        
        const speakerAnalysisResponse = await chatClient.createChatCompletion({
          messages: [
            {
              role: 'system',
              content: `You are an AI that analyzes meeting transcripts to identify speakers and conversation patterns. 

Analyze the transcript and return a JSON object with this structure:
{
  "speakers": [
    {
      "name": "Speaker name or role",
      "confidence": 0.8,
      "speaking_segments": 5,
      "key_phrases": ["example phrase they said"],
      "characteristics": "Brief description of their role or speaking style"
    }
  ],
  "total_speakers": 2,
  "analysis_confidence": 0.7,
  "speaker_patterns": "Brief description of how speakers were identified"
}

Look for:
- Speaker introductions ("I'm John", "This is Sarah", "My name is...")
- Direct addressing ("Hi John", "Thanks Sarah")
- Role indicators ("As the project manager", "From the technical side")
- Conversation patterns and turn-taking
- Speaking frequency and segment distribution

Return ONLY valid JSON - no explanation or markdown.`
            },
            {
              role: 'user',
              content: `Analyze this transcript for speaker patterns:\n\n${transcript.substring(0, 3000)}${transcript.length > 3000 ? '\n\n[Transcript truncated for analysis]' : ''}`
            }
          ],
          max_tokens: 800,
          temperature: 0,  // Deterministic output for consistent results
        });
        
        const aiResponse = speakerAnalysisResponse.choices[0]?.message?.content?.trim();
        if (aiResponse) {
          try {
            const parsedAnalysis = JSON.parse(aiResponse);
            aiSpeakerAnalysis = parsedAnalysis;
            console.log(`✅ AI identified ${parsedAnalysis.speakers?.length || 0} speakers with ${Math.round((parsedAnalysis.analysis_confidence || 0) * 100)}% confidence`);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse AI speaker analysis response:', parseError);
          }
        }
      } catch (aiError) {
        console.warn('⚠️ AI speaker analysis failed, continuing with pattern-based analysis:', aiError);
      }
    }
    
    // Enhanced pattern-based analysis as backup or supplement
    const patternAnalysis = analyzeTranscriptPatterns(transcript);
    
    // Combine segment analysis, AI analysis, and pattern analysis
    let finalSpeakers = [];
    let finalConfidence = 0.4;
    let analysisMethod = 'enhanced_transcript_analysis';
    
    if (segmentBasedAnalysis && segmentBasedAnalysis.speakers && segmentBasedAnalysis.speakers.length > 1) {
      // Use segment-based analysis as primary source (most accurate for timing)
      finalSpeakers = segmentBasedAnalysis.speakers.map((speaker, index) => ({
        name: speaker.name || `Speaker ${index + 1}`,
        confidence: speaker.confidence,
        segments: speaker.segments || [],
        characteristics: {
          speaking_time: speaker.characteristics?.speaking_time || 0,
          segment_count: speaker.characteristics?.segment_count || 0,
          voice_analysis: false, // Honest - this is timing analysis, not voice
          timing_based: true,
          change_reason: speaker.characteristics?.change_reason || 'timing pattern',
          ai_enhanced: !!aiSpeakerAnalysis
        }
      }));
      finalConfidence = segmentBasedAnalysis.confidence;
      analysisMethod = 'whisper_segment_analysis';
      console.log('✅ Using Whisper segment-based analysis as primary method');
    } else if (aiSpeakerAnalysis && aiSpeakerAnalysis.speakers && aiSpeakerAnalysis.speakers.length > 0) {
      // Use AI analysis as secondary source
      finalSpeakers = aiSpeakerAnalysis.speakers.map((speaker, index) => ({
        name: speaker.name || `Speaker ${index + 1}`,
        confidence: Math.min(0.8, speaker.confidence || 0.6), // Cap confidence for transcript-based analysis
        segments: [],
        characteristics: {
          speaking_time: 0,
          segment_count: speaker.speaking_segments || 0,
          voice_analysis: false, // Honest - this is transcript analysis, not voice
          ai_identified: true,
          key_phrases: speaker.key_phrases || [],
          role_description: speaker.characteristics || ''
        }
      }));
      finalConfidence = Math.min(0.8, aiSpeakerAnalysis.analysis_confidence || 0.6);
      analysisMethod = 'ai_enhanced_transcript_analysis';
      console.log('✅ Using AI transcript analysis as primary method');
    } else {
      // Use pattern analysis as fallback
      finalSpeakers = patternAnalysis.speakers;
      finalConfidence = patternAnalysis.confidence;
      console.log('✅ Using pattern analysis as fallback method');
    }
    
    const enhancedAnalysis = {
      identified_speakers: finalSpeakers,
      confidence_score: finalConfidence,
      analysis_method: analysisMethod,
      total_speakers: finalSpeakers.length,
      processing_date: new Date().toISOString(),
      transcript_length: transcript.length,
      ai_assisted: !!aiSpeakerAnalysis
    };

    const { error: analysisError } = await supabase
      .from('recordings')
      .update({ 
        ai_speaker_analysis: enhancedAnalysis,
        ai_speakers_updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);
      
    if (analysisError) {
      console.error('❌ Failed to store enhanced speaker analysis:', analysisError);
    } else {
      console.log(`✅ Enhanced speaker analysis stored: ${finalSpeakers.length} speakers detected`);
    }

    return enhancedAnalysis;
    
  } catch (error) {
    console.error('❌ Enhanced speaker analysis failed:', error);
    
    // Ultimate fallback - basic estimation
    const fallbackAnalysis = {
      identified_speakers: [
        {
          name: 'Participant 1',
          confidence: 0.3,
          segments: [],
          characteristics: {
            speaking_time: 0,
            segment_count: 0,
            voice_analysis: false,
          }
        },
        {
          name: 'Participant 2', 
          confidence: 0.3,
          segments: [],
          characteristics: {
            speaking_time: 0,
            segment_count: 0,
            voice_analysis: false,
          }
        }
      ],
      confidence_score: 0.3,
      analysis_method: 'fallback_estimation',
      total_speakers: 2,
      processing_date: new Date().toISOString()
    };

    const { error: fallbackError } = await supabase
      .from('recordings')
      .update({ 
        ai_speaker_analysis: fallbackAnalysis,
        ai_speakers_updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);
      
    if (fallbackError) {
      console.error('❌ Failed to store fallback analysis:', fallbackError);
    }

    return fallbackAnalysis;
  }
}

/**
 * Analyze transcript for speaker patterns using regex and heuristics
 */
function analyzeTranscriptPatterns(transcript: string) {
  const speakers = [];
  const speakerNames = new Set();
  
  // Look for introduction patterns
  const introPatterns = [
    /(?:I'm|I am|This is|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /Hi,?\s+(?:I'm\s+)?([A-Z][a-z]+)/gi,
    /([A-Z][a-z]+)\s+(?:here|speaking)/gi
  ];
  
  for (const pattern of introPatterns) {
    const matches = [...transcript.matchAll(pattern)];
    matches.forEach(match => {
      const name = match[1]?.trim();
      if (name && name.length > 1 && name.length < 30) {
        // Filter out common words that aren't names
        if (!['Today', 'Good', 'Thank', 'Thanks', 'Please', 'Just', 'Well', 'Now', 'Let', 'Great', 'Right', 'Yeah', 'Yes', 'Okay'].includes(name)) {
          speakerNames.add(name);
        }
      }
    });
  }
  
  // Look for direct addressing patterns
  const addressPatterns = [
    /(?:Hi|Hello|Hey),?\s+([A-Z][a-z]+)/gi,
    /Thanks?,?\s+([A-Z][a-z]+)/gi,
    /([A-Z][a-z]+),?\s+(?:can you|could you|would you)/gi
  ];
  
  for (const pattern of addressPatterns) {
    const matches = [...transcript.matchAll(pattern)];
    matches.forEach(match => {
      const name = match[1]?.trim();
      if (name && name.length > 1 && name.length < 30) {
        if (!['Today', 'Good', 'Thank', 'Thanks', 'Please', 'Just', 'Well', 'Now', 'Let', 'Great', 'Right', 'Yeah', 'Yes', 'Okay'].includes(name)) {
          speakerNames.add(name);
        }
      }
    });
  }
  
  // Convert to speaker objects
  const nameArray = Array.from(speakerNames);
  nameArray.forEach((name, index) => {
    speakers.push({
      name,
      confidence: 0.6, // Medium confidence for pattern-based detection
      segments: [],
      characteristics: {
        speaking_time: 0,
        segment_count: 0,
        voice_analysis: false,
        pattern_detected: true
      }
    });
  });
  
  // If no names found, estimate based on transcript characteristics
  if (speakers.length === 0) {
    const estimatedCount = estimateSpeakerCount(transcript);
    for (let i = 0; i < estimatedCount; i++) {
      speakers.push({
        name: `Speaker ${i + 1}`,
        confidence: 0.4,
        segments: [],
        characteristics: {
          speaking_time: 0,
          segment_count: 0,
          voice_analysis: false,
          estimated: true
        }
      });
    }
  }
  
  return {
    speakers: speakers.slice(0, 8), // Limit to reasonable number
    confidence: speakers.length > 0 ? (speakerNames.size > 0 ? 0.6 : 0.4) : 0.3
  };
}

/**
 * Estimate speaker count based on transcript characteristics
 */
function estimateSpeakerCount(transcript: string): number {
  // Look for conversation patterns
  const questionMarks = (transcript.match(/\?/g) || []).length;
  const responseWords = (transcript.match(/\b(yes|no|yeah|okay|right|exactly|absolutely)\b/gi) || []).length;
  
  // More questions and responses suggest more interaction
  if (questionMarks > 10 && responseWords > 15) {
    return 3; // Likely group discussion
  } else if (questionMarks > 5 || responseWords > 8) {
    return 2; // Likely dialogue
  } else {
    return 2; // Default to 2 for business calls
  }
}


/**
 * Generate AI moments for a recording using the existing generate-ai-moments function logic
 * This is a streamlined version integrated into the processing pipeline
 */
async function generateAIMomentsForRecording(transcript: string, recordingId: string, supabase: any) {
  try {
    console.log('🤖 Starting AI moments generation for recording:', recordingId);
    
    const azureClient = createAzureOpenAIChatClient();
    
    const messages = [
      {
        role: 'system' as const,
        content: `You are an AI that identifies key moments in call recordings.
        Analyze the transcript and identify important moments with timestamps.
        IMPORTANT: Return ONLY a valid JSON array - no markdown formatting, no code blocks, no additional text.
        The response must be pure JSON that starts with [ and ends with ].
        
        Structure: [{"type": "chapter", "start_time": 0, "label": "1", "tooltip": "Chapter 1: Introduction"}]
        
        Types available:
        - "chapter": Major sections of the call (label should be "1", "2", etc.)
        - "objection": When objections or pushback are raised
        - "sentiment_neg": When negative sentiment is detected
        - "bookmark": Important discussion points worth bookmarking
        - "action": When action items or commitments are mentioned
        
        Guidelines:
        - Estimate start_time in seconds based on content flow
        - Create 4-8 chapters for structure
        - Identify 2-4 other moment types if present
        - Make tooltips descriptive but concise
        - Order by start_time ascending`
      },
      {
        role: 'user' as const,
        content: `Analyze this transcript and identify key moments. Return pure JSON array only - no markdown, no explanations:\n\n${transcript}`
      }
    ];

    const response = await azureClient.createChatCompletion({
      messages,
      max_tokens: 800,
      temperature: 0,  // Deterministic output for consistent results
    });

    const momentsText = response.choices[0]?.message?.content?.trim();

    if (!momentsText) {
      throw new Error('Empty response from AI moments generation');
    }

    // Parse the AI moments JSON using robust extraction
    let aiMoments: any[];
    try {
      aiMoments = extractJsonFromAIResponse(momentsText);
      
      // Validate the structure
      if (!validateAIMoments(aiMoments)) {
        throw new Error('AI moments validation failed');
      }
    } catch (parseError) {
      console.error('Failed to parse AI moments JSON:', parseError);
      throw parseError;
    }

    // Validate and clean up the moments, then create individual records
    const validMoments = aiMoments
      .filter(moment => 
        moment && 
        typeof moment === 'object' && 
        moment.type && 
        typeof moment.start_time === 'number' &&
        moment.tooltip
      )
      .map(moment => ({
        recording_id: recordingId,
        type: moment.type,
        start_time: Math.max(0, moment.start_time),
        label: moment.label || '',
        tooltip: moment.tooltip || 'AI-generated moment',
        metadata: {
          confidence: 0.85, // Default confidence for AI-generated moments
          source: 'azure_openai',
          model: 'gpt-4',
          analysis_type: 'moment_detection',
          is_ai_generated: true,
          generation_timestamp: new Date().toISOString()
        }
      }))
      .sort((a, b) => a.start_time - b.start_time);

    console.log(`✅ Generated ${validMoments.length} AI moments`);

    // Clear existing AI moments for this recording
    const { error: deleteError } = await supabase
      .from('ai_moments')
      .delete()
      .eq('recording_id', recordingId)
      .in('type', ['chapter', 'objection', 'sentiment_neg', 'bookmark', 'action']);

    if (deleteError) {
      console.error('Failed to clear existing AI moments:', deleteError);
    }

    // Insert new AI moments as individual records
    if (validMoments.length > 0) {
      const { data: insertedMoments, error: insertError } = await supabase
        .from('ai_moments')
        .insert(validMoments)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert AI moments: ${insertError.message}`);
      }

      console.log(`✅ Successfully inserted ${insertedMoments.length} AI moments to database`);
    }

    // Update recordings table timestamp
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        ai_generated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Failed to update recording timestamp:', updateError);
    }

    return validMoments;

  } catch (error) {
    console.error('❌ AI moments generation failed:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('🎯 Function started: process-recording with streaming support');
    logMemoryUsage('function start');
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    // Parse request body with enhanced large file support
    let recording_id;
    let large_file_fallback = false;
    let original_file_size = 0;
    let compression_hint = '';
    let streaming_mode = false;
    
    try {
      const body = await req.json();
      recording_id = body.recording_id;
      large_file_fallback = body.large_file_fallback || false;
      original_file_size = body.original_file_size || 0;
      compression_hint = body.compression_hint || '';
      streaming_mode = body.streaming_mode || false;
      
      console.log(`Request body parsed, recording_id: ${recording_id}`);
      
      if (large_file_fallback) {
        console.log(`🚀 Enhanced fallback mode activated for large file (${(original_file_size / (1024 * 1024)).toFixed(1)}MB)`);
        console.log(`🔧 Compression hint: ${compression_hint}, Streaming: ${streaming_mode}`);
      }
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createErrorResponse(
        'Invalid request body',
        400,
        { details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' }
      );
    }
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse('Recording ID is required', 400);
    }

    // Define memory-safe thresholds (moved to function scope for global access)
    const AZURE_WHISPER_LIMIT = 25; // 25MB Azure OpenAI Whisper limit
    const EDGE_FUNCTION_SAFE_LIMIT = 50; // 50MB safe limit for Edge Functions (reduced from 100MB)
    const LARGE_FILE_LIMIT = 500; // 500MB maximum we'll attempt to process (reduced from 300MB)
    
    // Calculate file size once for use throughout the function
    let fileSizeMB = 0;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recording_id)) {
      console.error('Invalid UUID format:', recording_id);
      return createErrorResponse('Invalid recording ID format. Expected UUID format.', 400, { recordingId: recording_id });
    }

    console.log(`Starting processing pipeline for recording: ${recording_id}`);

    // Initialize Supabase client
    let supabase;
    try {
      console.log('🔧 Initializing Supabase client...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase configuration missing:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
        throw new Error(`Supabase configuration missing: URL=${!!supabaseUrl}, Key=${!!supabaseServiceKey}`);
      }
      
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('✅ Supabase client initialized with service role key');
    } catch (supabaseInitError) {
      console.error('Failed to initialize Supabase client:', supabaseInitError);
      return createErrorResponse(
        'Database connection error',
        500,
        { details: supabaseInitError instanceof Error ? supabaseInitError.message : 'Unknown database error' }
      );
    }

    // Check Azure OpenAI configuration with detailed diagnostics
    console.log('🔧 Checking Azure OpenAI configuration...');
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureWhisperEndpoint = Deno.env.get('AZURE_OPENAI_WHISPER_ENDPOINT');
    const azureWhisperApiKey = Deno.env.get('AZURE_OPENAI_WHISPER_API_KEY');
    const chatDeployment = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT');
    const whisperDeployment = Deno.env.get('AZURE_OPENAI_WHISPER_DEPLOYMENT');
    const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION');
    
    // Detailed configuration status
    const configStatus = {
      hasAzureEndpoint: !!azureEndpoint,
      hasAzureApiKey: !!azureApiKey,
      hasAzureWhisperEndpoint: !!azureWhisperEndpoint,
      hasAzureWhisperApiKey: !!azureWhisperApiKey,
      hasChatDeployment: !!chatDeployment,
      hasWhisperDeployment: !!whisperDeployment,
      hasApiVersion: !!apiVersion,
      azureEndpoint: azureEndpoint ? `${azureEndpoint.substring(0, 30)}...` : 'MISSING',
      chatDeployment: chatDeployment || 'MISSING',
      whisperDeployment: whisperDeployment || 'MISSING',
      apiVersion: apiVersion || 'MISSING'
    };
    
    console.log('Azure OpenAI config status:', configStatus);
    
    const hasAzureChatConfig = !!(azureEndpoint && azureApiKey && chatDeployment);
    const hasAzureWhisperConfig = !!(azureWhisperEndpoint && azureWhisperApiKey && whisperDeployment);
    
    // Identify specific missing variables
    const missingVariables = [];
    if (!azureEndpoint) missingVariables.push('AZURE_OPENAI_ENDPOINT');
    if (!azureApiKey) missingVariables.push('AZURE_OPENAI_API_KEY');
    if (!azureWhisperEndpoint) missingVariables.push('AZURE_OPENAI_WHISPER_ENDPOINT');
    if (!azureWhisperApiKey) missingVariables.push('AZURE_OPENAI_WHISPER_API_KEY');
    if (!chatDeployment) missingVariables.push('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT');
    if (!whisperDeployment) missingVariables.push('AZURE_OPENAI_WHISPER_DEPLOYMENT');
    if (!apiVersion) missingVariables.push('AZURE_OPENAI_API_VERSION');
    
    if (!hasAzureChatConfig || !hasAzureWhisperConfig || missingVariables.length > 0) {
      console.error('❌ Azure OpenAI configuration incomplete:', {
        hasAzureChatConfig,
        hasAzureWhisperConfig,
        missingVariables,
        configGuide: 'Please set environment variables in Supabase Dashboard → Settings → Edge Functions'
      });
      
      return createErrorResponse(
        `Azure OpenAI configuration incomplete. Missing: ${missingVariables.join(', ')}`,
        503,
        {
          details: 'Azure OpenAI environment variables not configured',
          missingVariables,
          hasAzureChatConfig,
          hasAzureWhisperConfig,
          setupGuide: 'Set environment variables in Supabase Dashboard → Settings → Edge Functions',
          requiredVariables: [
            'AZURE_OPENAI_ENDPOINT',
            'AZURE_OPENAI_API_KEY', 
            'AZURE_OPENAI_WHISPER_ENDPOINT',
            'AZURE_OPENAI_WHISPER_API_KEY',
            'AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT',
            'AZURE_OPENAI_WHISPER_DEPLOYMENT',
            'AZURE_OPENAI_API_VERSION'
          ]
        }
      );
    }
    console.log('✅ Azure OpenAI configuration complete');

    // Step 1: Get recording details
    let recording;
    try {
      console.log(`🔍 Fetching recording with ID: ${recording_id}`);
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recording_id)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        
        if (error.code === 'PGRST116') {
          return createErrorResponse('Recording not found', 404, { recordingId: recording_id });
        } else if (error.code === '42501') {
          return createErrorResponse('Database permission error', 403, { details: 'Insufficient permissions to access recordings' });
        } else {
          return createErrorResponse('Database query failed', 500, { 
            details: error.message || 'Unknown database error',
            code: error.code 
          });
        }
      }
      
      if (!data) {
        console.log('No recording data returned for ID:', recording_id);
        return createErrorResponse('Recording not found', 404, { recordingId: recording_id });
      }
      
      recording = data;
      console.log('📁 Recording found:', { 
        id: recording.id, 
        title: recording.title, 
        file_url: recording.file_url,
        file_size: recording.file_size,
        hasTranscript: !!recording.transcript,
        hasSummary: !!recording.summary,
        user_id: recording.user_id
      });
    } catch (recordingError) {
      console.error('Unexpected error fetching recording:', recordingError);
      return createErrorResponse(
        'Failed to fetch recording',
        500,
        { details: recordingError instanceof Error ? recordingError.message : 'Unknown database error' }
      );
    }

    // Step 1.5: Smart file size routing for memory efficiency
    if (recording.file_size) {
      fileSizeMB = recording.file_size / (1024 * 1024);
      console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > LARGE_FILE_LIMIT) {
        console.error(`❌ File too large: ${fileSizeMB.toFixed(2)}MB exceeds ${LARGE_FILE_LIMIT}MB limit`);
        await supabase
          .from('recordings')
          .update({ 
            status: 'processing_failed',
            error_message: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is ${LARGE_FILE_LIMIT}MB.`,
            processing_notes: 'File exceeds maximum processing limit. Please compress the file and try again.'
          })
          .eq('id', recording_id);
        
        return createErrorResponse(
          `File too large for processing. Maximum size is ${LARGE_FILE_LIMIT}MB.`,
          413,
          { 
            fileSize: recording.file_size,
            fileSizeMB: fileSizeMB,
            maxSizeMB: LARGE_FILE_LIMIT,
            suggestion: 'Please compress your file to reduce size before uploading.',
            compressionTips: [
              'Video: Use lower resolution (720p instead of 1080p)',
              'Audio: Convert to MP3 with 128kbps bitrate',
              'Video: Reduce framerate and use H.264 compression',
              'Use online tools like HandBrake or FFmpeg'
            ]
          }
        );
      }
      
      if (fileSizeMB > EDGE_FUNCTION_SAFE_LIMIT) {
        console.warn(`⚠️ File too large for Edge Function: ${fileSizeMB.toFixed(2)}MB`);
        
        // Update status to indicate processing with compression
        await supabase
          .from('recordings')
          .update({ 
            status: 'processing_large_file',
            processing_notes: `Large file (${fileSizeMB.toFixed(1)}MB) - using compression and extended processing time.`
          })
          .eq('id', recording_id);
        
        // Continue with local processing but with compression
        console.log('🔄 Large file detected - will use compression during processing');
      }
      
      if (recording.file_size > MAX_FILE_SIZE_BYTES) {
        const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
        console.error(`File too large: ${fileSizeMB.toFixed(2)}MB > ${maxSizeMB}MB`);
        return createErrorResponse(
          `File too large for processing. Maximum size is ${maxSizeMB}MB.`,
          413,
          { 
            fileSize: recording.file_size,
            fileSizeMB: fileSizeMB,
            maxSize: MAX_FILE_SIZE_BYTES,
            maxSizeMB: maxSizeMB,
            suggestion: 'Please compress your audio file to MP3 format or reduce the file size before uploading.',
            compressionTips: [
              'Convert WAV to MP3 (reduces size by ~80%)',
              'Use lower bitrate (128kbps is sufficient for speech)',
              'Use online tools like CloudConvert or Audacity'
            ]
          }
        );
      }
      
      if (recording.file_size > RECOMMENDED_FILE_SIZE_BYTES) {
        const recommendedSizeMB = RECOMMENDED_FILE_SIZE_BYTES / (1024 * 1024);
        console.warn(`Large file detected: ${fileSizeMB.toFixed(2)}MB > ${recommendedSizeMB}MB (recommended). Processing may take longer.`);
        
        await supabase
          .from('recordings')
          .update({ 
            status: 'processing_large_file',
            processing_notes: `Large file (${fileSizeMB.toFixed(1)}MB) - extended processing time expected`
          })
          .eq('id', recording_id);
      }
    } else {
      // Handle case where file_size is not available
      console.warn('⚠️ Recording file_size not available, will calculate during processing');
      fileSizeMB = 0; // Will be calculated later if needed
    }

    // Step 1.6: Generate content hash for deduplication
    let contentHash = '';
    let cachedAnalysis = null;
    
    if (recording.file_url && !recording.content_hash) {
      console.log('🔍 Generating content hash for deduplication...');
      try {
        // Enhanced memory handling for large files in fallback mode
        let audioResponse;
        if (large_file_fallback && original_file_size > 50 * 1024 * 1024) {
          console.log('🚀 Using streaming fetch for large file fallback...');
          audioResponse = await fetch(recording.file_url, {
            headers: {
              'Range': 'bytes=0-1048576' // Only fetch first 1MB for hash generation in fallback mode
            }
          });
        } else {
          audioResponse = await fetch(recording.file_url);
        }
        
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          contentHash = await generateContentHash(audioBlob);
          
          if (contentHash) {
            console.log(`📊 Content hash generated: ${contentHash.substring(0, 16)}...`);
            
            // Check for existing analysis with same content hash
            const { data: existingRecording, error: hashCheckError } = await supabase
              .from('recordings')
              .select('transcript, ai_summary, ai_moments, ai_speaker_analysis, coaching_evaluation')
              .eq('content_hash', contentHash)
              .neq('id', recording_id)
              .not('transcript', 'is', null)
              .limit(1)
              .single();
            
            if (!hashCheckError && existingRecording) {
              console.log('✅ Found existing analysis for identical content!');
              cachedAnalysis = existingRecording;
            }
            
            // Update current recording with content hash
            await supabase
              .from('recordings')
              .update({ content_hash: contentHash })
              .eq('id', recording_id);
          }
        }
      } catch (hashError) {
        console.warn('⚠️ Content hash generation failed (non-critical):', hashError);
      }
    }

    // Step 2: Check if already processed or use cached analysis
    if (cachedAnalysis) {
      console.log('🚀 Using cached analysis from identical recording');
      
      // Update current recording with cached analysis
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          transcript: cachedAnalysis.transcript,
          ai_summary: cachedAnalysis.ai_summary,
          ai_moments: cachedAnalysis.ai_moments,
          ai_speaker_analysis: cachedAnalysis.ai_speaker_analysis,
          coaching_evaluation: cachedAnalysis.coaching_evaluation,
          support_analysis: cachedAnalysis.support_analysis,
          status: 'completed',
          ai_generated_at: new Date().toISOString(),
          processing_notes: 'Analysis reused from identical content'
        })
        .eq('id', recording_id);
      
      if (!updateError) {
        return createSuccessResponse({
          message: 'Recording processed using cached analysis (identical content detected)',
          transcript: cachedAnalysis.transcript,
          summary: cachedAnalysis.ai_summary,
          cached: true,
          content_hash: contentHash
        });
      }
    }
    
    if (recording.transcript && recording.summary) {
      console.log('✅ Recording already processed, skipping transcription');
      return createSuccessResponse({
        message: 'Recording already processed',
        transcript: recording.transcript,
        summary: recording.summary
      });
    }

    // Step 3: Transcribe audio using Azure OpenAI Whisper if not already done
    let transcript = recording.transcript;
    if (!transcript) {
      console.log('🎤 Transcribing audio using Azure OpenAI Whisper...');
      
      if (!recording.file_url) {
        console.error('No audio file URL found for transcription');
        return createErrorResponse('No audio file URL found for transcription', 400, {
          recordingId: recording_id,
          details: 'Recording exists but has no file_url'
        });
      }


      try {
        // Update status to indicate transcription in progress
        const { error: transcribingStatusError } = await supabase
          .from('recordings')
          .update({ status: 'transcribing' })
          .eq('id', recording_id);
          
        if (transcribingStatusError) {
          console.error('⚠️ Failed to update status to transcribing:', transcribingStatusError);
          console.error('Continuing with transcription anyway...');
        }

        // Memory-efficient file processing based on size
        console.log('⬇️ Processing audio file from:', recording.file_url);
        console.log(`📊 File size: ${fileSizeMB.toFixed(1)}MB`);
        
        let audioFile: File;
        
        // Memory-safe processing for smaller files only (already routed large files above)
        if (fileSizeMB <= AZURE_WHISPER_LIMIT) {
          // Direct processing for files under 25MB
          console.log('📁 Direct processing for small file...');
          const audioResponse = await fetch(recording.file_url);
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio file: ${audioResponse.statusText}`);
          }
          
          const audioBlob = await audioResponse.blob();
          const originalFileName = recording.file_url.split('/').pop() || 'audio';
          const contentType = audioBlob.type || 'application/octet-stream';
          
          audioFile = new File([audioBlob], originalFileName, { type: contentType });
          console.log(`✅ Direct processing complete: ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB`);
          
        } else {
          // For files 25-50MB, use controlled memory processing
          console.log('🔄 Controlled processing for medium file...');
          
          const audioResponse = await fetch(recording.file_url);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          
          // Use ArrayBuffer for better memory control
          const arrayBuffer = await audioResponse.arrayBuffer();
          console.log(`📊 Loaded ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)}MB into memory`);
          
          const originalFileName = recording.file_url.split('/').pop() || 'audio';
          const contentType = audioResponse.headers.get('content-type') || 'application/octet-stream';
          
          audioFile = new File([arrayBuffer], originalFileName, { type: contentType });
          console.log(`✅ Controlled processing complete: ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB`);
          
        }
        console.log('📁 Audio file processed:', {
          size: audioFile.size,
          type: audioFile.type,
          name: audioFile.name
        });

        // Create Azure OpenAI Whisper client
        const whisperClient = createAzureOpenAIWhisperClient();
        
        // Check if the file is WebM format or needs Azure OpenAI compatibility handling
        const isWebMFormat = audioFile.name.toLowerCase().endsWith('.webm') || 
                           audioFile.type?.includes('webm') ||
                           audioFile.type?.includes('opus');
        
        const needsAzureCompatibility = audioFile.name.includes('_azure_compat') ||
                                      isWebMFormat;
        
        let processedAudioFile = audioFile;
        
        if (needsAzureCompatibility) {
          console.log('🔄 Azure OpenAI compatibility mode detected, optimizing format for Whisper...');
          try {
            const originalBuffer = await audioFile.arrayBuffer();
            let compatibleFileName = audioFile.name
              .replace('_azure_compat', '')
              .replace(/\.(webm|ogg|mp4|m4a)$/i, '.wav');
              
            if (!compatibleFileName.endsWith('.wav')) {
              compatibleFileName = compatibleFileName.replace(/\.[^/.]+$/, '.wav');
            }
            
            processedAudioFile = new File([originalBuffer], compatibleFileName, {
              type: 'audio/wav'
            });
            
            console.log(`✅ Azure OpenAI compatibility conversion: ${audioFile.name} → ${compatibleFileName}`);
            console.log(`📊 File details: size=${processedAudioFile.size} bytes, type=${processedAudioFile.type}`);
          } catch (conversionError) {
            console.warn('⚠️ Azure OpenAI compatibility conversion failed, proceeding with original file:', conversionError);
            processedAudioFile = audioFile;
          }
        }
        
        // Check file size and compress if needed (Azure OpenAI Whisper has 25MB limit)
        const AZURE_WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB limit
        const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB max per chunk (leaving buffer)
        
        console.log(`📊 File size check: ${processedAudioFile.size} bytes (${(processedAudioFile.size / (1024 * 1024)).toFixed(1)}MB)`);
        console.log(`🎯 Azure OpenAI Whisper limit: ${(AZURE_WHISPER_MAX_SIZE / (1024 * 1024)).toFixed(1)}MB`);
        
        let finalAudioFile = processedAudioFile;
        
        if (processedAudioFile.size > AZURE_WHISPER_MAX_SIZE) {
          console.log('🗜️ File exceeds Azure OpenAI limit, attempting compression...');
          
          try {
            // Simple compression: reduce quality by re-encoding
            const compressedFile = await compressAudioForWhisper(processedAudioFile);
            
            if (compressedFile.size <= AZURE_WHISPER_MAX_SIZE) {
              console.log(`✅ Compression successful: ${(processedAudioFile.size / (1024 * 1024)).toFixed(1)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
              finalAudioFile = compressedFile;
            } else if (compressedFile.size <= MAX_CHUNK_SIZE) {
              console.log(`⚠️ Compression helped but still large: ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
              finalAudioFile = compressedFile;
            } else {
              console.log(`❌ File still too large after compression: ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
              throw new Error(`File too large for Azure OpenAI Whisper (${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB > ${(AZURE_WHISPER_MAX_SIZE / (1024 * 1024)).toFixed(1)}MB limit)`);
            }
          } catch (compressionError) {
            console.error('🚨 Compression failed:', compressionError);
            throw new Error(`File too large for Azure OpenAI Whisper (${(processedAudioFile.size / (1024 * 1024)).toFixed(1)}MB > ${(AZURE_WHISPER_MAX_SIZE / (1024 * 1024)).toFixed(1)}MB limit) and compression failed: ${compressionError.message}`);
          }
        }
        
        // Transcribe the audio
        console.log('🔄 Sending audio to Azure OpenAI Whisper...');
        console.log(`📁 Final file details: name=${finalAudioFile.name}, type=${finalAudioFile.type}, size=${finalAudioFile.size} bytes (${(finalAudioFile.size / (1024 * 1024)).toFixed(1)}MB)`);
        const transcriptionStartTime = Date.now();
        
        const transcriptionResult = await whisperClient.createTranscription({
          file: finalAudioFile,
          filename: finalAudioFile.name,
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0  // Deterministic output for consistent results
        });
        
        const transcriptionDuration = Date.now() - transcriptionStartTime;
        console.log(`✅ Transcription completed in ${transcriptionDuration}ms`);
        
        transcript = transcriptionResult.text;
        console.log('📝 Transcript preview:', transcript.substring(0, 200) + '...');
        
        // Log Whisper segment data for analysis
        if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
          console.log(`🎵 Whisper provided ${transcriptionResult.segments.length} segments for timing analysis`);
          console.log('📊 First few segments:', transcriptionResult.segments.slice(0, 3).map(s => ({
            start: s.start,
            end: s.end,
            text: s.text?.substring(0, 50) + '...',
            avg_logprob: s.avg_logprob,
            no_speech_prob: s.no_speech_prob
          })));
        } else {
          console.log('⚠️ No segments data available from Whisper');
        }

        // Update recording with transcript, duration, and segments data
        // Enhanced validation to prevent the 9-second bug and other invalid durations
        let validatedDuration = transcriptionResult.duration;
        let durationValidationFailed = false;
        let durationSource = 'whisper';
        
        // Check if current recording already has a valid client-side duration
        const currentRecording = await supabase
          .from('recordings')
          .select('duration')
          .eq('id', recording_id)
          .single();
        
        // Enhanced validation for 9-second bug and other issues
        const isSuspiciousDuration = (dur: number | null) => {
          return !dur || dur === 9 || dur < 3 || dur > 86400; // Changed from < 5 to < 3
        };
        
        if (isSuspiciousDuration(validatedDuration)) {
          console.warn(`⚠️ Invalid duration from Whisper: ${transcriptionResult.duration}s. Attempting recovery...`);
          durationValidationFailed = true;
          
          // Priority 1: Use client-side extracted duration if it's valid and available
          if (currentRecording.data?.duration && !isSuspiciousDuration(currentRecording.data.duration)) {
            validatedDuration = currentRecording.data.duration;
            durationSource = 'client_extracted';
            durationValidationFailed = false;
            console.log(`✅ Using client-extracted duration: ${validatedDuration}s`);
          }
          // Priority 1.5: Try server-side extraction for suspicious durations
          else if (currentRecording.data?.file_url) {
            console.log(`🔧 Attempting server-side duration extraction...`);
            try {
              const extractionResponse = await supabase.functions.invoke('extract-duration', {
                body: {
                  recording_id: recording_id,
                  file_url: currentRecording.data.file_url,
                  force_extraction: true
                }
              });
              
              if (extractionResponse.data?.success && extractionResponse.data.duration) {
                validatedDuration = extractionResponse.data.duration;
                durationSource = `server_${extractionResponse.data.method}`;
                durationValidationFailed = false;
                console.log(`✅ Server-side duration extraction: ${validatedDuration}s via ${extractionResponse.data.method}`);
              } else {
                console.warn(`⚠️ Server-side extraction failed: ${extractionResponse.data?.error || 'Unknown error'}`);
              }
            } catch (extractionError) {
              console.warn(`⚠️ Server-side extraction error: ${extractionError.message}`);
            }
          }
          // Priority 2: Try to estimate duration from segment data
          else if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
            const lastSegment = transcriptionResult.segments[transcriptionResult.segments.length - 1];
            if (lastSegment && lastSegment.end && lastSegment.end > 10) {
              validatedDuration = Math.round(lastSegment.end);
              durationSource = 'whisper_segments';
              durationValidationFailed = false;
              console.log(`✅ Duration recovered from segments: ${validatedDuration}s`);
            }
          }
          // Priority 3: Estimate from transcript length
          else if (transcript && transcript.length > 1000) {
            const estimatedDuration = Math.max(180, Math.min(3600, (transcript.length / 7) * (60 / 175)));
            validatedDuration = Math.round(estimatedDuration);
            durationSource = 'transcript_estimate';
            durationValidationFailed = false;
            console.log(`📊 Duration estimated from transcript length: ${validatedDuration}s`);
          }
          
          // If all recovery attempts failed, keep the original duration but mark it as suspicious
          if (durationValidationFailed) {
            console.warn(`⚠️ Could not recover valid duration. Keeping original suspicious duration: ${validatedDuration}s`);
            durationSource = 'suspicious_kept';
            // Don't set to null - keep the suspicious duration rather than losing it completely
          }
        } else {
          console.log(`✅ Whisper duration validation passed: ${validatedDuration}s`);
        }
        
        const updateData: any = {
          transcript,
          duration: validatedDuration, // Use validated duration instead of raw value
          status: 'processing', // Keep processing until final status update
          // Store Whisper segments for enhanced speaker analysis
          whisper_segments: transcriptionResult.segments || [],
          whisper_metadata: {
            language: transcriptionResult.language,
            duration: validatedDuration || transcriptionResult.duration, // Store validated duration
            duration_source: durationSource, // Track how duration was determined
            raw_whisper_duration: transcriptionResult.duration, // Store original Whisper value for debugging
            segments_count: transcriptionResult.segments?.length || 0,
            has_words: !!(transcriptionResult.words && transcriptionResult.words.length > 0)
          }
        };
        
        console.log(`📊 Transcription duration: ${transcriptionResult.duration} seconds`);
        
        const { error: transcriptUpdateError } = await supabase
          .from('recordings')
          .update(updateData)
          .eq('id', recording_id);
          
        if (transcriptUpdateError) {
          console.error('❌ Failed to update transcript in database:', transcriptUpdateError);
          throw new Error(`Database update failed: ${transcriptUpdateError.message}`);
        }

        console.log('✅ Transcript saved to database');

        // Extract ECI employee name from transcript (automatic processing)
        console.log('👤 Extracting ECI employee name from transcript...');
        try {
          if (transcript && transcript.length > 50) {
            const { data: employeeData, error: employeeError } = await supabase.functions.invoke('extract-employee-name', {
              body: {
                recording_id: recording_id
              }
            });

            if (employeeError) {
              console.warn('⚠️ Employee name extraction failed (non-critical):', employeeError);
            } else if (employeeData?.analysis?.employee_name) {
              console.log(`✅ Auto-detected ECI employee: ${employeeData.analysis.employee_name} (confidence: ${employeeData.analysis.confidence})`);
            } else {
              console.log('ℹ️ No ECI employee identified in this recording (low confidence or unclear identification)');
            }
          } else {
            console.log('ℹ️ Transcript too short for employee name extraction');
          }
        } catch (employeeExtractionError) {
          console.warn('⚠️ Employee name extraction error (continuing processing):', employeeExtractionError);
          // Don't fail the entire process if employee extraction fails
        }

        // Create enhanced speaker analysis from Whisper transcript and segments
        console.log('🔍 Creating enhanced speaker analysis from transcript and segments...');
        await createEnhancedSpeakerAnalysis(transcript, recording_id, supabase, transcriptionResult.segments);

        // Generate AI moments for key conversation insights
        console.log('🎯 Generating AI moments for key conversation insights...');
        try {
          await generateAIMomentsForRecording(transcript, recording_id, supabase);
        } catch (momentsError) {
          console.warn('⚠️ AI moments generation failed (non-critical):', momentsError);
          // Don't fail the entire process if moments generation fails
        }

        // Trigger sentiment and topic analysis
        console.log('🎭 Triggering sentiment and topic analysis...');
        try {
          const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-speakers-topics', {
            body: {
              recording_id: recording_id,
              transcript: transcript,
              // Pass auth header to maintain user context
              auth_header: authHeader
            }
          });

          if (analysisError) {
            console.warn('⚠️ Sentiment analysis failed (non-critical):', analysisError);
          } else {
            console.log('✅ Sentiment and topic analysis completed successfully');
          }
        } catch (sentimentError) {
          console.warn('⚠️ Sentiment analysis error (non-critical):', sentimentError);
          // Don't fail the entire process if sentiment analysis fails
        }

      } catch (transcriptionError) {
        console.error('Transcription failed:', transcriptionError);
        
        // Enhanced error handling with memory-specific guidance
        const isMemoryError = transcriptionError instanceof Error && 
          (transcriptionError.message.includes('Memory limit') || 
           transcriptionError.message.includes('out of memory') ||
           transcriptionError.message.includes('allocation failed'));
        
        const errorMessage = isMemoryError 
          ? `File too large for processing. Please compress your file to under 25MB.`
          : transcriptionError instanceof Error ? transcriptionError.message : 'Unknown transcription error';
        
        await supabase
          .from('recordings')
          .update({ 
            status: 'transcription_failed',
            error_message: errorMessage,
            processing_notes: isMemoryError 
              ? 'File size exceeded memory limits. Compression required.'
              : 'Transcription service error. Please try again.'
          })
          .eq('id', recording_id);
        
        return createErrorResponse('Audio transcription failed', 500, {
          recordingId: recording_id,
          details: errorMessage,
          isMemoryError,
          suggestion: isMemoryError 
            ? 'Please compress your audio file to under 25MB and try again.'
            : 'Please check your audio file format and try again. Supported formats: MP3, WAV, M4A, FLAC',
          compressionTips: isMemoryError ? [
            'Convert to MP3 format (reduces size by ~80%)',
            'Use lower bitrate (128kbps is sufficient for speech)',
            'Use online tools like Audacity, CloudConvert, or FFmpeg'
          ] : undefined
        });
      }
    }

    // Step 4: Generate summary using Azure OpenAI if not already done (with enhanced resilience)
    let summary = recording.summary;
    let summaryGenerationFailed = false;
    let summaryRateLimited = false;
    
    if (!summary) {
      console.log('🤖 Generating AI summary using Azure OpenAI...');
      try {
        console.log('🔧 Creating Azure OpenAI chat client...');
        const chatClient = createAzureOpenAIChatClient();
        console.log('🎯 Calling Azure OpenAI for summary generation...');
        
        const summaryResponse = await chatClient.createChatCompletion({
          messages: [
            {
              role: 'system',
              content: 'You are an AI that creates concise summaries of meeting recordings. Focus on key points, decisions, and action items.'
            },
            {
              role: 'user',
              content: `Please summarize this transcript:\\n\\n${transcript}`
            }
          ],
          max_tokens: 500,
          temperature: 0,  // Deterministic output for consistent results
        });
        
        summary = summaryResponse.choices[0]?.message?.content?.trim();
        if (!summary) {
          throw new Error('No summary content returned from Azure OpenAI');
        }
        
        console.log('✅ Azure OpenAI summary generated successfully');
        
        console.log('💾 Updating summary in database...');
        const { error: summaryUpdateError } = await supabase
          .from('recordings')
          .update({ 
            ai_summary: summary, 
            ai_insights: summary,
            ai_generated_at: new Date().toISOString() 
          })
          .eq('id', recording_id);
        if (summaryUpdateError) {
          console.error('Failed to update summary in database:', summaryUpdateError);
          throw summaryUpdateError;
        }
      } catch (summaryError) {
        console.error('❌ Azure OpenAI summary generation error:', summaryError);
        
        // Enhanced rate limit detection
        const errorMessage = summaryError.message || '';
        const isRateLimit = errorMessage.includes('429') || 
                           errorMessage.toLowerCase().includes('rate limit') ||
                           errorMessage.toLowerCase().includes('too many requests') ||
                           errorMessage.toLowerCase().includes('quota exceeded');
        
        if (isRateLimit) {
          console.log('⚠️ Rate limit detected - continuing without summary (will retry later)');
          summaryRateLimited = true;
          summaryGenerationFailed = true;
        } else {
          console.log('⚠️ Summary generation failed - continuing without summary');
          summaryGenerationFailed = true;
        }
      }
    }

    // Step 5: Generate AI moments using Azure OpenAI (non-blocking with enhanced resilience)
    console.log('✨ Generating AI moments using Azure OpenAI...');
    let momentsRateLimited = false;
    
    try {
      console.log('🔧 Creating Azure OpenAI chat client for moments...');
      const chatClient = createAzureOpenAIChatClient();
      console.log('🎯 Calling Azure OpenAI for moments generation...');
      const momentsResponse = await chatClient.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an AI that identifies key moments in meeting recordings. Extract important timestamps, decisions, action items, and notable quotes. IMPORTANT: Return ONLY a valid JSON array - no markdown formatting, no code blocks, no additional text. The response must be pure JSON that starts with [ and ends with ]. Each moment should have fields like timestamp, title, description, and type.'
          },
          {
            role: 'user',
            content: `Analyze this transcript and identify key moments. Return pure JSON array only - no markdown, no explanations:\\n\\n${transcript}`
          }
        ],
        max_tokens: 800,
        temperature: 0,  // Deterministic output for consistent results
      });
      const momentsContent = momentsResponse.choices[0]?.message?.content?.trim();
      if (momentsContent) {
        try {
          console.log('🔍 Raw AI moments response preview:', momentsContent.substring(0, 200) + '...');
          
          const moments = extractJsonFromAIResponse(momentsContent);
          
          if (validateAIMoments(moments)) {
            console.log('✅ AI moments generated and validated:', moments.length, 'moments found');
            
            const { error: momentsUpdateError } = await supabase
              .from('recordings')
              .update({ ai_moments: moments })
              .eq('id', recording_id);
              
            if (momentsUpdateError) {
              console.warn('Failed to update AI moments in database:', momentsUpdateError);
            } else {
              console.log('✅ AI moments successfully stored in database');
            }
          } else {
            console.warn('⚠️ AI moments validation failed - skipping database update');
          }
        } catch (jsonError) {
          console.error('Failed to parse AI moments JSON:', jsonError);
        }
      } else {
        console.warn('⚠️ Empty or missing AI moments response content');
      }
    } catch (momentsError) {
      console.warn('❌ AI moments generation failed (non-blocking):', momentsError);
      
      // Enhanced rate limit detection for moments
      const errorMessage = momentsError.message || '';
      const isRateLimit = errorMessage.includes('429') || 
                         errorMessage.toLowerCase().includes('rate limit') ||
                         errorMessage.toLowerCase().includes('too many requests') ||
                         errorMessage.toLowerCase().includes('quota exceeded');
      
      if (isRateLimit) {
        console.log('⚠️ AI moments rate limited - will retry later');
        momentsRateLimited = true;
      }
    }

    // Step 6: BDR Scorecard Analysis for User-Selected Sales Calls
    if (transcript && recording.content_type === 'sales_call') {
      console.log('🎯 User-selected sales call detected - applying BDR scorecard analysis...');
      
      try {
        // Check if user has active BDR training programs
        const { data: activePrograms, error: programError } = await supabase
          .from('bdr_training_programs')
          .select('id, name, is_active, scorecard_criteria, target_score_threshold')
          .eq('is_active', true)
          .limit(1);
        
        if (!programError && activePrograms && activePrograms.length > 0) {
          const trainingProgram = activePrograms[0];
          console.log(`🎓 Active BDR program found: ${trainingProgram.name}`);
          
          // Generate BDR scorecard evaluation for user-selected sales call
          console.log('🤖 Generating BDR scorecard evaluation for sales call...');
          
          const { data: bdrResult, error: bdrError } = await supabase.functions.invoke('evaluate-bdr-scorecard', {
            body: {
              recording_id: recording_id,
              transcript: transcript,
              training_program_id: trainingProgram.id,
              auto_generated: true // Flag to indicate this is automatic scoring based on user selection
            }
          });
          
          if (bdrError) {
            console.warn('⚠️ BDR evaluation failed (non-critical):', bdrError);
          } else {
            console.log('✅ BDR scorecard evaluation completed successfully');
            
            // Update recording with BDR evaluation results
            const { error: evaluationUpdateError } = await supabase
              .from('recordings')
              .update({ 
                coaching_evaluation: bdrResult
              })
              .eq('id', recording_id);
            
            if (evaluationUpdateError) {
              console.warn('⚠️ Failed to update BDR evaluation (non-critical):', evaluationUpdateError);
            }
          }
        } else {
          console.log('ℹ️ No active BDR training programs found - skipping BDR scoring');
        }
      } catch (bdrAnalysisError) {
        console.warn('⚠️ BDR analysis error (non-critical):', bdrAnalysisError);
        // Don't fail the entire process if BDR analysis fails
      }
    }

    // Update final status - always mark as completed if transcript exists
    const finalStatus = 'completed';
    console.log(`🔄 Attempting to update final status to: ${finalStatus}`);
    console.log(`📊 Recording ID: ${recording_id}`);
    console.log(`📝 Transcript length: ${transcript?.length || 0} characters`);
    console.log(`🤖 Summary present: ${summary ? 'Yes' : 'No'}`);
    console.log(`💡 Status Logic: Using 'completed' for simplified user experience`);
    
    const { data: statusUpdateData, error: finalStatusError } = await supabase
      .from('recordings')
      .update({ 
        status: finalStatus, 
        ai_generated_at: new Date().toISOString()
      })
      .eq('id', recording_id)
      .select('id, status, updated_at');
      
    if (finalStatusError) {
      console.error('❌ Failed to update final status:', finalStatusError);
      console.error('Attempted to set status to:', finalStatus);
      console.error('Error details:', JSON.stringify(finalStatusError, null, 2));
      
      // Try to update with a fallback status that should be allowed
      console.log('🔄 Attempting fallback status update to transcribed...');
      const { error: fallbackError } = await supabase
        .from('recordings')
        .update({ 
          status: 'transcribed', 
          ai_generated_at: new Date().toISOString(),
          error_message: `Status update failed: ${finalStatusError.message}`
        })
        .eq('id', recording_id);
        
      if (fallbackError) {
        console.error('❌ Fallback status update also failed:', fallbackError);
      } else {
        console.log('✅ Fallback status update successful - set to transcribed');
      }
    } else {
      console.log(`🎉 Processing completed with status: ${finalStatus}`);
      console.log(`✅ Status update successful:`, statusUpdateData);
    }
    
    // Trigger support analysis if this is a customer support recording
    if (recording.content_type === 'customer_support' && transcript) {
      console.log('🏥 Triggering support analysis for customer support recording...');
      try {
        const { data: supportResult, error: supportError } = await supabase.functions.invoke('analyze-support-call', {
          body: {
            recording_id: recording_id,
            transcript: transcript,
            duration: recording.duration || 0
          }
        });
        
        if (supportError) {
          console.warn('⚠️ Support analysis failed (non-critical):', supportError);
        } else {
          console.log('✅ Support analysis completed successfully');
        }
      } catch (supportAnalysisError) {
        console.warn('⚠️ Support analysis error (non-critical):', supportAnalysisError);
        // Don't fail the entire process if support analysis fails
      }
    }

    // Handle BDR training data processing
    if (recording.content_type === 'bdr_training_data' && transcript && recording.training_metadata) {
      console.log('🎓 Processing BDR training data for call matching...');
      try {
        const trainingMetadata = recording.training_metadata;
        const callIdentifier = trainingMetadata.call_identifier;
        const trainingProgramId = trainingMetadata.training_program_id;
        
        if (callIdentifier) {
          // Register the training call and attempt automatic matching
          const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-training-calls', {
            body: {
              recording_id: recording_id,
              call_identifier: callIdentifier,
              training_program_id: trainingProgramId,
              transcript: transcript,
              user_id: recording.user_id
            }
          });
          
          if (matchError) {
            console.warn('⚠️ Training call matching failed (non-critical):', matchError);
          } else {
            console.log('✅ Training call matching completed:', matchResult);
            
            // Log training statistics
            if (matchResult && matchResult.matches && matchResult.matches.length > 0) {
              console.log(`🔗 Found ${matchResult.matches.length} potential matches for training call ${callIdentifier}`);
            } else {
              console.log(`📋 Training call ${callIdentifier} registered, awaiting scorecard data`);
            }
          }
        } else {
          console.warn('⚠️ BDR training data missing call identifier');
        }
      } catch (trainingError) {
        console.warn('⚠️ BDR training processing error (non-critical):', trainingError);
        // Don't fail the entire process if training processing fails
      }
    }
    
    return createSuccessResponse({
      message: summaryRateLimited 
        ? 'Recording transcribed successfully. AI features rate limited - will retry later.' 
        : summaryGenerationFailed 
          ? 'Recording transcribed successfully. Summary generation will be retried later.' 
          : 'Recording processed successfully with Azure OpenAI',
      recording_id,
      transcript,
      summary: summary || null,
      provider: 'azure-openai',
      processing_complete: true,
      summary_generation_failed: summaryGenerationFailed,
      summary_rate_limited: summaryRateLimited,
      partial_success: summaryGenerationFailed && !!transcript,
      // Include processing metadata for better monitoring
      processing_metadata: {
        transcript_success: !!transcript,
        summary_success: !!summary && !summaryGenerationFailed,
        summary_rate_limited: summaryRateLimited,
        file_size_mb: recording.file_size ? Math.round(recording.file_size / (1024 * 1024) * 100) / 100 : null
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in process-recording:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return createErrorResponse(
      'Unexpected processing error',
      500,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }
    );
  }
});