import type { Recording } from '@/types/recording';
import { isAISpeakerAnalysis } from '@/types/recording';

export interface ResolvedSpeaker {
  id: string;
  name: string;
  displayName: string;
  confidence: number;
  segments: number;
  isAiIdentified: boolean;
  organization?: string;
  // Whisper-enhanced fields
  speakingTime?: number;
  voiceAnalysis?: boolean;
}

export interface SpeakerResolutionResult {
  speakers: ResolvedSpeaker[];
  totalCount: number;
  method: 'real_voice_diarization' | 'whisper_segment_analysis' | 'ai_enhanced_transcript_analysis' | 'enhanced_transcript_analysis' | 'ai_summary' | 'ai_speaker_analysis' | 'transcript_parsing' | 'fallback_estimation' | 'fallback';
  confidence: number;
}

// Cache for intermediate analysis results to prevent redundant processing
const analysisCache = new WeakMap<Recording, {
  [method: string]: SpeakerResolutionResult;
}>();

/**
 * Centralized speaker resolution system
 * Provides consistent speaker identification across all Spotlight components
 */
export class SpeakerResolver {
  
  /**
   * Get actual participants from the recording using multiple data sources
   * Prioritizes REAL voice analysis data for accuracy, eliminates fake confidence scores
   */
  static resolveActualSpeakers(recording: Recording): SpeakerResolutionResult {
    console.log('🎭 SpeakerResolver: Starting speaker resolution for recording:', recording?.id);
    
    // Quick early exit checks to prevent unnecessary processing
    if (!recording) {
      console.log('🎭 SpeakerResolver: No recording provided, returning empty result');
      return {
        speakers: [],
        totalCount: 0,
        method: 'fallback',
        confidence: 0
      };
    }
    
    // Check if we have cached intermediate results for this recording
    let cache = analysisCache.get(recording);
    if (!cache) {
      cache = {};
      analysisCache.set(recording, cache);
    }
    
    // Method 1: Use real voice diarization (HIGHEST PRIORITY - actual voice analysis)
    if (!cache['real_voice_diarization']) {
      cache['real_voice_diarization'] = this.extractFromRealVoiceDiarization(recording);
    }
    const realVoiceResult = cache['real_voice_diarization'];
    if (realVoiceResult.speakers.length > 0) {
      console.log('✅ Using REAL voice diarization analysis:', realVoiceResult);
      return realVoiceResult;
    }
    
    // Method 2: Use Whisper segment analysis (high accuracy using timing patterns)
    if (!cache['whisper_segment_analysis']) {
      cache['whisper_segment_analysis'] = this.extractFromWhisperSegmentAnalysis(recording);
    }
    const segmentResult = cache['whisper_segment_analysis'];
    if (segmentResult.speakers.length > 0) {
      console.log('✅ Using Whisper segment analysis:', segmentResult);
      return segmentResult;
    }
    
    // Method 3: Use AI-enhanced transcript analysis (highest accuracy for text-based analysis)
    if (!cache['ai_enhanced_transcript_analysis']) {
      cache['ai_enhanced_transcript_analysis'] = this.extractFromAIEnhancedTranscriptAnalysis(recording);
    }
    const aiEnhancedResult = cache['ai_enhanced_transcript_analysis'];
    if (aiEnhancedResult.speakers.length > 0) {
      console.log('✅ Using AI-enhanced transcript analysis:', aiEnhancedResult);
      return aiEnhancedResult;
    }
    
    // Method 4: Extract from AI summary (high accuracy for participant names)
    if (!cache['ai_summary']) {
      cache['ai_summary'] = this.extractFromAISummary(recording);
    }
    const summaryResult = cache['ai_summary'];
    if (summaryResult.speakers.length > 0) {
      console.log('✅ Using AI summary method:', summaryResult);
      return summaryResult;
    }
    
    // Method 5: Use enhanced transcript pattern analysis
    if (!cache['enhanced_transcript_analysis']) {
      cache['enhanced_transcript_analysis'] = this.extractFromEnhancedTranscriptAnalysis(recording);
    }
    const enhancedPatternResult = cache['enhanced_transcript_analysis'];
    if (enhancedPatternResult.speakers.length > 0) {
      console.log('✅ Using enhanced pattern analysis method:', enhancedPatternResult);
      return enhancedPatternResult;
    }
    
    // Method 6: Use legacy AI speaker analysis
    if (!cache['ai_speaker_analysis']) {
      cache['ai_speaker_analysis'] = this.extractFromAISpeakerAnalysis(recording);
    }
    const aiAnalysisResult = cache['ai_speaker_analysis'];
    if (aiAnalysisResult.speakers.length > 0) {
      console.log('✅ Using legacy AI analysis method:', aiAnalysisResult);
      return aiAnalysisResult;
    }
    
    // Method 7: Intelligent transcript parsing (consolidate generic speakers)
    if (!cache['transcript_parsing']) {
      cache['transcript_parsing'] = this.extractFromTranscript(recording);
    }
    const transcriptResult = cache['transcript_parsing'];
    if (transcriptResult.speakers.length > 0) {
      console.log('✅ Using transcript parsing method:', transcriptResult);
      return transcriptResult;
    }
    
    // Method 8: Check for explicit fallback estimation
    if (!cache['fallback_estimation']) {
      cache['fallback_estimation'] = this.extractFromFallbackEstimation(recording);
    }
    const fallbackEstimationResult = cache['fallback_estimation'];
    if (fallbackEstimationResult.speakers.length > 0) {
      console.log('⚠️ Using explicit fallback estimation:', fallbackEstimationResult);
      return fallbackEstimationResult;
    }
    
    // Method 9: Conservative fallback (last resort)
    if (!cache['fallback']) {
      cache['fallback'] = this.getFallbackSpeakers(recording);
    }
    const fallbackResult = cache['fallback'];
    console.log('⚠️ Using conservative fallback method:', fallbackResult);
    return fallbackResult;
  }
  
  /**
   * Extract from real voice diarization (HIGHEST PRIORITY - actual voice analysis)
   */
  private static extractFromRealVoiceDiarization(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'real_voice_diarization', confidence: 0 };
    }
    
    const analysis = recording.ai_speaker_analysis;
    
    // Check if this is real voice diarization
    const isRealVoiceDiarization = analysis.analysis_method === 'real_voice_diarization';
    
    if (!isRealVoiceDiarization) {
      return { speakers: [], totalCount: 0, method: 'real_voice_diarization', confidence: 0 };
    }
    
    console.log('🎤 Using REAL voice diarization analysis from external service:', analysis.service_provider || 'unknown');
    
    const speakers: ResolvedSpeaker[] = [];
    
    // Add speakers identified by real voice analysis
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `voice-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: Math.min(0.95, speaker.confidence || 0.9), // High confidence for real voice analysis
          segments: speaker.segments?.length || 0,
          isAiIdentified: true,
          organization: speaker.characteristics?.organization,
          // Real voice analysis metadata
          speakingTime: speaker.characteristics?.speaking_time || 0,
          voiceAnalysis: true // This is REAL voice analysis
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'real_voice_diarization',
      confidence: Math.min(0.95, analysis.confidence_score || 0.9) // High confidence for real voice analysis
    };
  }
  
  /**
   * Extract from Whisper segment analysis (timing-based speaker detection)
   */
  private static extractFromWhisperSegmentAnalysis(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'whisper_segment_analysis', confidence: 0 };
    }
    
    const analysis = recording.ai_speaker_analysis;
    
    // Check if this is Whisper segment analysis
    const isWhisperSegmentAnalysis = analysis.analysis_method === 'whisper_segment_analysis';
    
    if (!isWhisperSegmentAnalysis) {
      return { speakers: [], totalCount: 0, method: 'whisper_segment_analysis', confidence: 0 };
    }
    
    console.log('🎵 Using Whisper segment-based timing analysis');
    
    const speakers: ResolvedSpeaker[] = [];
    
    // Add speakers identified by segment timing analysis
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `segment-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: Math.min(0.8, speaker.confidence || 0.7), // Good confidence for timing analysis
          segments: speaker.segments?.length || 0,
          isAiIdentified: false, // This is timing-based, not AI-identified
          organization: speaker.characteristics?.organization,
          // Timing analysis metadata
          speakingTime: speaker.characteristics?.speaking_time || 0,
          voiceAnalysis: false // This is timing analysis, not voice
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'whisper_segment_analysis',
      confidence: Math.min(0.8, analysis.confidence_score || 0.7) // Good confidence for timing analysis
    };
  }
  
  /**
   * Extract from AI-enhanced transcript analysis (highest priority method)
   */
  private static extractFromAIEnhancedTranscriptAnalysis(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'ai_enhanced_transcript_analysis', confidence: 0 };
    }
    
    const analysis = recording.ai_speaker_analysis;
    
    // Check if this is AI-enhanced transcript analysis
    const isAIEnhanced = analysis.analysis_method === 'ai_enhanced_transcript_analysis';
    
    if (!isAIEnhanced) {
      return { speakers: [], totalCount: 0, method: 'ai_enhanced_transcript_analysis', confidence: 0 };
    }
    
    console.log('🤖 Using AI-enhanced transcript analysis:', analysis.analysis_method);
    
    const speakers: ResolvedSpeaker[] = [];
    
    // Add speakers identified by AI transcript analysis
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `ai-enhanced-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: speaker.confidence || 0.7, // Good confidence for AI analysis
          segments: speaker.segments?.length || 0,
          isAiIdentified: true,
          organization: speaker.characteristics?.organization,
          // AI analysis metadata
          speakingTime: speaker.characteristics?.speaking_time || 0,
          voiceAnalysis: false // This is transcript analysis, not voice
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'ai_enhanced_transcript_analysis',
      confidence: Math.min(0.8, analysis.confidence_score || 0.7) // Good confidence for AI analysis
    };
  }
  
  /**
   * Extract from enhanced transcript pattern analysis
   */
  private static extractFromEnhancedTranscriptAnalysis(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'enhanced_transcript_analysis', confidence: 0 };
    }
    
    const analysis = recording.ai_speaker_analysis;
    
    // Check if this is enhanced transcript pattern analysis
    const isEnhancedPattern = analysis.analysis_method === 'enhanced_transcript_analysis';
    
    if (!isEnhancedPattern) {
      return { speakers: [], totalCount: 0, method: 'enhanced_transcript_analysis', confidence: 0 };
    }
    
    console.log('📝 Using enhanced transcript pattern analysis:', analysis.analysis_method);
    
    const speakers: ResolvedSpeaker[] = [];
    
    // Add speakers identified by pattern analysis
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `pattern-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: speaker.confidence || 0.6, // Medium confidence for pattern analysis
          segments: speaker.segments?.length || 0,
          isAiIdentified: speaker.characteristics?.pattern_detected || false,
          organization: speaker.characteristics?.organization,
          speakingTime: speaker.characteristics?.speaking_time || 0,
          voiceAnalysis: false // This is pattern analysis, not voice
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'enhanced_transcript_analysis',
      confidence: Math.min(0.7, analysis.confidence_score || 0.6) // Medium confidence for pattern analysis
    };
  }
  
  /**
   * Extract real participant names from AI summary
   * Made public for direct use by components that need simple speaker extraction
   */
  public static extractFromAISummary(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_summary) {
      return { speakers: [], totalCount: 0, method: 'ai_summary', confidence: 0 };
    }
    
    const participantPatterns = [
      // "Participants: Ashley (ECI Manufacturing), Kendra Knoth"
      /(?:participants?|attendees?)[:\s]*([^.\n\r]+)/i,
      // "Between Ashley (ECI Manufacturing) and Kendra Knoth"
      /between\s+([^.\n\r]+)/i,
      // "Meeting with Ashley (ECI Manufacturing), Kendra Knoth"
      /(?:meeting|call|conversation)\s+with\s+([^.\n\r]+)/i,
      // "Ashley (ECI Manufacturing) and Kendra Knoth discussed"
      /^([^.\n\r]*(?:\([^)]+\)[^.\n\r]*,?\s*)+)\s+(?:discussed|talked|spoke)/im
    ];

    for (const pattern of participantPatterns) {
      const match = recording.ai_summary.match(pattern);
      if (match) {
        const participantText = match[1].trim();
        console.log(`🎯 Found participant text: "${participantText}"`);
        
        const speakers = this.parseParticipantText(participantText);
        
        if (speakers.length > 0) {
          return {
            speakers,
            totalCount: speakers.length,
            method: 'ai_summary',
            confidence: 0.95
          };
        }
      }
    }
    
    return { speakers: [], totalCount: 0, method: 'ai_summary', confidence: 0 };
  }
  
  /**
   * Parse participant text like "Ashley (ECI Manufacturing), Kendra Knoth"
   * Made public for direct use by components
   */
  public static parseParticipantText(text: string): ResolvedSpeaker[] {
    const speakers: ResolvedSpeaker[] = [];
    
    // Split by common separators
    const parts = text.split(/,|\sand\s|\&/).map(p => p.trim()).filter(p => p.length > 0);
    
    parts.forEach((part, index) => {
      // Extract name and organization: "Ashley (ECI Manufacturing)" -> name: "Ashley", org: "ECI Manufacturing"
      const match = part.match(/^([^(]+)(?:\s*\(([^)]+)\))?/);
      if (match) {
        const name = match[1].trim();
        const organization = match[2]?.trim();
        
        if (name.length >= 2 && name.length <= 50) {
          const displayName = organization ? `${name} (${organization})` : name;
          
          speakers.push({
            id: `ai-summary-${index}`,
            name,
            displayName,
            confidence: 0.95,
            segments: 0, // Will be calculated later
            isAiIdentified: true,
            organization
          });
          
          console.log(`👤 Extracted participant: "${name}" org: "${organization || 'none'}"`);
        }
      }
    });
    
    return speakers;
  }
  
  /**
   * Extract from AI speaker analysis (voice-based)
   */
  private static extractFromAISpeakerAnalysis(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'ai_speaker_analysis', confidence: 0 };
    }
    
    const speakers: ResolvedSpeaker[] = [];
    const analysis = recording.ai_speaker_analysis;
    
    // Add identified speakers
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `ai-identified-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: speaker.confidence || 0.8,
          segments: speaker.segments?.length || 0,
          isAiIdentified: true,
          organization: speaker.characteristics?.organization
        });
      });
    }
    
    // Add unidentified segments as separate speakers
    if (analysis.unidentified_segments) {
      analysis.unidentified_segments.forEach((segment, index) => {
        speakers.push({
          id: `ai-unidentified-${index}`,
          name: segment.speaker_label,
          displayName: segment.speaker_label,
          confidence: 0.3,
          segments: segment.segments?.length || 0,
          isAiIdentified: false
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'ai_speaker_analysis',
      confidence: analysis.confidence_score || 0.8
    };
  }
  
  /**
   * Extract from transcript with intelligent consolidation
   */
  private static extractFromTranscript(recording: Recording): SpeakerResolutionResult {
    if (!recording.transcript) {
      return { speakers: [], totalCount: 0, method: 'transcript_parsing', confidence: 0 };
    }
    
    const lines = recording.transcript.split('\n').filter(l => l.trim());
    const speakerSegments = new Map<string, { count: number; texts: string[] }>();
    
    lines.forEach(line => {
      // Try multiple speaker patterns
      const patterns = [
        /^([A-Za-z][A-Za-z\s]+):\s*(.+)/, // "John Smith: text"
        /^\[[\d:]+\]\s*([A-Za-z][A-Za-z\s]+):\s*(.+)/, // "[00:00] John: text"
        /^(Speaker\s*[A-Z]|\w+):\s*(.+)/ // "Speaker A: text" or "Agent: text"
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const speaker = match[1].trim();
          const text = match[2].trim();
          
          if (speaker.length <= 30 && text.length > 0) {
            if (!speakerSegments.has(speaker)) {
              speakerSegments.set(speaker, { count: 0, texts: [] });
            }
            const segment = speakerSegments.get(speaker)!;
            segment.count++;
            segment.texts.push(text);
          }
          break;
        }
      }
    });
    
    // Convert to resolved speakers, filtering out noise
    const speakers: ResolvedSpeaker[] = [];
    let speakerIndex = 0;
    
    for (const [name, data] of speakerSegments.entries()) {
      // Filter out speakers with very few segments (likely noise)
      if (data.count >= 2) {
        speakers.push({
          id: `transcript-${speakerIndex}`,
          name,
          displayName: name,
          confidence: Math.min(0.8, data.count / 10), // Higher confidence for more segments
          segments: data.count,
          isAiIdentified: false
        });
        speakerIndex++;
      }
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'transcript_parsing',
      confidence: 0.6
    };
  }
  
  /**
   * Extract from explicit fallback estimation (honest about being estimated)
   */
  private static extractFromFallbackEstimation(recording: Recording): SpeakerResolutionResult {
    if (!recording.ai_speaker_analysis || !isAISpeakerAnalysis(recording.ai_speaker_analysis)) {
      return { speakers: [], totalCount: 0, method: 'fallback_estimation', confidence: 0 };
    }
    
    const analysis = recording.ai_speaker_analysis;
    
    // Check if this is the explicit fallback estimation
    const isFallbackEstimation = analysis.analysis_method === 'fallback_estimation';
    
    if (!isFallbackEstimation) {
      return { speakers: [], totalCount: 0, method: 'fallback_estimation', confidence: 0 };
    }
    
    console.log('⚠️ Using explicit fallback estimation (clearly marked as not voice-based)');
    
    const speakers: ResolvedSpeaker[] = [];
    
    // Add speakers from fallback estimation with clear indication they're estimated
    if (analysis.identified_speakers) {
      analysis.identified_speakers.forEach((speaker, index) => {
        speakers.push({
          id: `fallback-${index}`,
          name: speaker.name,
          displayName: speaker.name,
          confidence: Math.min(0.3, speaker.confidence || 0.3), // Low confidence for estimation
          segments: speaker.segments?.length || 0,
          isAiIdentified: false, // Not actually AI-identified
          // Explicitly mark as estimated, not voice analysis
          speakingTime: speaker.characteristics?.speaking_time || 0,
          voiceAnalysis: false // Clearly indicate this is NOT voice analysis
        });
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'fallback_estimation',
      confidence: Math.min(0.3, analysis.confidence_score || 0.3) // Low confidence for estimation
    };
  }

  /**
   * Conservative fallback when other methods fail
   */
  private static getFallbackSpeakers(recording: Recording): SpeakerResolutionResult {
    // Try to extract names from transcript first
    if (recording?.transcript) {
      const extractedSpeakers = this.extractSpeakerNamesFromTranscript(recording.transcript);
      if (extractedSpeakers.length > 0) {
        return {
          speakers: extractedSpeakers,
          totalCount: extractedSpeakers.length,
          method: 'fallback',
          confidence: 0.4
        };
      }
    }
    
    // Conservative estimate: most business calls have 2-4 participants
    const estimatedCount = recording?.content_type === 'team_meeting' ? 3 : 2;
    
    const speakers: ResolvedSpeaker[] = [];
    for (let i = 0; i < estimatedCount; i++) {
      speakers.push({
        id: `fallback-${i}`,
        name: `Participant ${i + 1}`,
        displayName: `Participant ${i + 1}`,
        confidence: 0.3,
        segments: 0,
        isAiIdentified: false
      });
    }
    
    return {
      speakers,
      totalCount: speakers.length,
      method: 'fallback',
      confidence: 0.3
    };
  }
  
  /**
   * Extract actual speaker names from transcript introduction patterns
   */
  private static extractSpeakerNamesFromTranscript(transcript: string): ResolvedSpeaker[] {
    const speakers: ResolvedSpeaker[] = [];
    const names = new Set<string>();

    // Enhanced introduction patterns - more specific and accurate
    const introPatterns = [
      // Direct self-introductions
      /(?:I'm|I am|This is|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,
      // Name in conversation context
      /(?:Hi|Hello),?\s+(?:this\s+is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:from|with|calling|here)/gi,
      // Professional introductions
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:speaking|here|from\s+[A-Z])/gi,
      // Name followed by role/company
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:at|from|with)\s+[A-Z]/gi,
      // Transcript speaker labels (but not generic ones)
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?):(?!\s*(?:Hi|Hello|Yes|No|Okay|Well|Um|Uh))/gim
    ];

    // Common words and greetings to exclude (expanded list)
    const excludeWords = new Set([
      'Hi', 'Hello', 'Hey', 'Good', 'Thank', 'Thanks', 'Please', 'Just', 'Well',
      'Now', 'Let', 'Great', 'Okay', 'Yes', 'No', 'Um', 'Uh', 'So', 'Actually',
      'Really', 'Sure', 'Right', 'Today', 'Tomorrow', 'Yesterday', 'Morning',
      'Afternoon', 'Evening', 'Here', 'There', 'This', 'That', 'What', 'When',
      'Where', 'Why', 'How', 'Can', 'Could', 'Should', 'Would', 'Will', 'May',
      'Might', 'Must', 'Need', 'Want', 'Like', 'Know', 'Think', 'Feel', 'See',
      'Look', 'Call', 'Phone', 'Meet', 'Talk', 'Speak', 'Say', 'Tell', 'Ask'
    ]);

    // Try each pattern with better validation
    for (const pattern of introPatterns) {
      const matches = [...transcript.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) {
          const name = match[1].trim();

          // Enhanced validation
          if (this.isValidSpeakerName(name, excludeWords)) {
            names.add(name);
            console.log(`✅ Extracted valid speaker name: "${name}" from pattern`);
          } else {
            console.log(`❌ Rejected invalid speaker name: "${name}"`);
          }
        }
      });
    }

    // Try extracting from structured transcript format
    const transcriptSpeakers = this.extractFromStructuredTranscript(transcript, excludeWords);
    transcriptSpeakers.forEach(name => names.add(name));

    // Convert to ResolvedSpeaker objects with role-based fallback
    const nameArray = Array.from(names);
    if (nameArray.length === 0) {
      // Provide role-based names instead of random words
      return this.generateRoleBasedSpeakers(transcript);
    }

    nameArray.forEach((name, index) => {
      speakers.push({
        id: `extracted-${index}`,
        name,
        displayName: name,
        confidence: 0.7, // Higher confidence for properly extracted names
        segments: 0,
        isAiIdentified: false
      });
    });

    // Limit to reasonable number of speakers
    return speakers.slice(0, 6);
  }

  /**
   * Validate if a potential speaker name is actually a name
   */
  private static isValidSpeakerName(name: string, excludeWords: Set<string>): boolean {
    // Basic validation
    if (!name || name.length < 2 || name.length > 50) return false;

    // Check against exclude words
    if (excludeWords.has(name)) return false;

    // Check if it's a single excluded word
    const words = name.split(/\s+/);
    if (words.length === 1 && excludeWords.has(words[0])) return false;

    // Must start with capital letter
    if (!/^[A-Z]/.test(name)) return false;

    // Reject if all caps (likely not a name)
    if (name === name.toUpperCase()) return false;

    // Reject if contains numbers or special chars
    if (/[\d@#$%^&*()_+=\[\]{}|;':"<>?/\\]/.test(name)) return false;

    // Reject common generic labels
    if (/^(?:Speaker|User|Agent|Customer|Client|Rep|Representative|Person|Individual|Someone|Caller)[\s\d]*$/i.test(name)) {
      return false;
    }

    return true;
  }

  /**
   * Extract speaker names from structured transcript format
   */
  private static extractFromStructuredTranscript(transcript: string, excludeWords: Set<string>): string[] {
    const speakers: string[] = [];
    const lines = transcript.split('\n');

    for (const line of lines) {
      // Match patterns like "John Smith: Hello there"
      const match = line.match(/^([A-Z][A-Za-z\s]+?):\s*(.+)/);
      if (match && match[1] && match[2]) {
        const name = match[1].trim();
        const text = match[2].trim();

        // Validate the name and ensure it's not just a greeting
        if (this.isValidSpeakerName(name, excludeWords) &&
            text.length > 3 &&
            !excludeWords.has(text.split(/\s+/)[0])) {
          speakers.push(name);
          console.log(`✅ Found structured speaker: "${name}"`);
        }
      }
    }

    return [...new Set(speakers)]; // Remove duplicates
  }

  /**
   * Generate role-based speaker names when no actual names are found
   */
  private static generateRoleBasedSpeakers(transcript: string): ResolvedSpeaker[] {
    const speakers: ResolvedSpeaker[] = [];

    // Analyze transcript content to determine likely roles
    const content = transcript.toLowerCase();
    const isSupport = /(?:support|help|issue|problem|ticket|case|resolve|assist)/i.test(content);
    const isSales = /(?:product|price|buy|purchase|deal|offer|quote|proposal|demo)/i.test(content);
    const isMeeting = /(?:meeting|discuss|agenda|presentation|review|update)/i.test(content);

    // Count approximate number of speakers from dialogue patterns
    const dialoguePatterns = transcript.split(/\n/).filter(line =>
      /^[A-Za-z\s]+:/.test(line) || line.includes('?') || line.includes('.')
    );

    const estimatedSpeakers = Math.min(Math.max(2, Math.ceil(dialoguePatterns.length / 10)), 4);

    // Generate appropriate role-based names
    for (let i = 0; i < estimatedSpeakers; i++) {
      let name: string;
      if (isSupport) {
        name = i === 0 ? 'Support Agent' : 'Customer';
      } else if (isSales) {
        name = i === 0 ? 'Sales Rep' : 'Prospect';
      } else if (isMeeting) {
        name = `Participant ${i + 1}`;
      } else {
        name = i === 0 ? 'Host' : `Participant ${i + 1}`;
      }

      speakers.push({
        id: `role-${i}`,
        name,
        displayName: name,
        confidence: 0.5, // Medium confidence for role-based names
        segments: 0,
        isAiIdentified: false
      });
    }

    console.log(`✅ Generated ${speakers.length} role-based speakers for ${isSupport ? 'support' : isSales ? 'sales' : 'meeting'} context`);
    return speakers;
  }
  
  /**
   * Map transcript lines to actual speakers using resolved speaker data
   * FIXED: Preserves all transcript speakers when AI analysis is incomplete
   */
  static mapTranscriptToSpeakers(
    transcriptLines: Array<{ speaker: string; text: string; timestamp: number }>,
    resolvedSpeakers: ResolvedSpeaker[]
  ): Array<{ speaker: string; text: string; timestamp: number }> {
    
    if (resolvedSpeakers.length === 0) return transcriptLines;
    
    // Get unique speakers from transcript
    const transcriptSpeakers = [...new Set(transcriptLines.map(l => l.speaker))];
    console.log('🔄 mapTranscriptToSpeakers: transcript speakers:', transcriptSpeakers);
    console.log('🔄 mapTranscriptToSpeakers: resolved speakers:', resolvedSpeakers.map(s => s.displayName));
    
    // Don't map if we have more transcript speakers than resolved speakers
    // This indicates incomplete AI analysis - preserve original transcript speakers
    if (transcriptSpeakers.length > resolvedSpeakers.length) {
      console.log('⚠️ mapTranscriptToSpeakers: More transcript speakers than resolved - preserving original');
      return transcriptLines;
    }
    
    // Create mapping from generic names to actual names
    const speakerMap = new Map<string, string>();
    
    // Map generic "Speaker 1", "Speaker 2" to actual names
    resolvedSpeakers.forEach((speaker, index) => {
      speakerMap.set(`Speaker ${index + 1}`, speaker.displayName);
      speakerMap.set(`Speaker${index + 1}`, speaker.displayName);
      speakerMap.set(speaker.name, speaker.displayName);
    });
    
    // Also try exact matches for speakers that already have names
    resolvedSpeakers.forEach(speaker => {
      // Match variations like "**Ashley (ECI Manufacturing)" to "Ashley (ECI Manufacturing)"
      transcriptSpeakers.forEach(transcriptSpeaker => {
        const cleanTranscriptSpeaker = transcriptSpeaker.replace(/^\*+\s*/, '').trim();
        if (cleanTranscriptSpeaker === speaker.displayName || 
            cleanTranscriptSpeaker === speaker.name ||
            cleanTranscriptSpeaker.includes(speaker.name)) {
          speakerMap.set(transcriptSpeaker, speaker.displayName);
        }
      });
    });
    
    const mappedLines = transcriptLines.map(line => ({
      ...line,
      speaker: speakerMap.get(line.speaker) || line.speaker
    }));
    
    // Check if mapping was successful (speakers were actually mapped)
    const mappedSpeakers = [...new Set(mappedLines.map(l => l.speaker))];
    const successfulMappings = mappedSpeakers.filter(speaker => 
      resolvedSpeakers.some(rs => rs.displayName === speaker)
    ).length;
    
    console.log('🔄 mapTranscriptToSpeakers: successful mappings:', successfulMappings, 'of', resolvedSpeakers.length);
    
    // If mapping failed (no speakers were successfully mapped), return original
    if (successfulMappings === 0) {
      console.log('⚠️ mapTranscriptToSpeakers: No successful mappings - preserving original');
      return transcriptLines;
    }
    
    return mappedLines;
  }
  
  /**
   * Get speaker count for a recording (used by CallBriefCard, etc.)
   */
  static getSpeakerCount(recording: Recording): number {
    const result = this.resolveActualSpeakers(recording);
    return result.totalCount;
  }
  
  /**
   * Get display names for speakers (used by OutlinePanel, etc.)
   */
  static getSpeakerNames(recording: Recording): string[] {
    const result = this.resolveActualSpeakers(recording);
    // Add defensive check to ensure result is valid
    if (!result || !result.speakers || !Array.isArray(result.speakers)) {
      console.error('getSpeakerNames: Invalid result from resolveActualSpeakers', result);
      return [];
    }
    return result.speakers.map(s => s.displayName);
  }
}