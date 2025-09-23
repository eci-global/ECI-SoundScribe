// Enhanced Whisper Segment Analysis
// Re-processes existing recordings with enhanced segment-based speaker detection
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface EnhancedAnalysisRequest {
  recording_id: string;
}

/**
 * Analyze Whisper segments for speaker changes using timing patterns
 * This looks for pauses, confidence drops, and speech pattern changes to infer speaker transitions
 */
function analyzeWhisperSegments(segments: any[], transcript: string) {
  console.log('🎵 Starting enhanced Whisper segment-based speaker analysis...');
  
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
  }
  
  console.log(`🎵 Enhanced segment analysis complete: ${speakers.length} speakers identified using timing patterns`);
  
  return {
    speakers,
    confidence: speakers.length > 1 ? 0.75 : 0.4, // Higher confidence for multi-speaker detection
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    const { recording_id } = await req.json() as EnhancedAnalysisRequest;

    if (!recording_id) {
      return createErrorResponse('Missing recording_id', 400);
    }

    console.log(`🎵 Starting enhanced Whisper analysis for recording: ${recording_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recording with existing Whisper segments
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, transcript, whisper_segments, whisper_metadata')
      .eq('id', recording_id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch recording:', fetchError);
      return createErrorResponse('Recording not found', 404);
    }

    if (!recording.whisper_segments || recording.whisper_segments.length === 0) {
      console.error('❌ No Whisper segments available for analysis');
      return createErrorResponse('No Whisper segments available for enhanced analysis', 400, {
        suggestion: 'This recording may need to be re-processed to include segment data'
      });
    }

    console.log(`📊 Processing ${recording.whisper_segments.length} Whisper segments for enhanced speaker detection`);

    // Perform enhanced segment analysis
    const segmentAnalysis = analyzeWhisperSegments(recording.whisper_segments, recording.transcript || '');

    // Create enhanced speaker analysis result
    const enhancedAnalysis = {
      identified_speakers: segmentAnalysis.speakers,
      confidence_score: segmentAnalysis.confidence,
      analysis_method: 'whisper_segment_analysis',
      total_speakers: segmentAnalysis.speakers.length,
      processing_date: new Date().toISOString(),
      segments_analyzed: recording.whisper_segments.length,
      enhanced_from_existing: true
    };

    // Update recording with enhanced analysis
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        ai_speaker_analysis: enhancedAnalysis,
        ai_speakers_updated_at: new Date().toISOString(),
      })
      .eq('id', recording_id);

    if (updateError) {
      console.error('❌ Failed to update enhanced analysis:', updateError);
      throw updateError;
    }

    console.log(`🎉 Enhanced Whisper analysis completed for recording ${recording_id}`);

    return createSuccessResponse({
      message: 'Enhanced Whisper segment analysis completed successfully',
      recording_id,
      speakers_detected: segmentAnalysis.speakers.length,
      confidence_score: segmentAnalysis.confidence,
      analysis_method: 'whisper_segment_analysis',
      segments_analyzed: recording.whisper_segments.length,
    });

  } catch (error) {
    console.error('❌ Enhanced Whisper analysis error:', error);
    return createErrorResponse(
      'Enhanced analysis failed',
      500,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    );
  }
});