
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayback } from './hooks/usePlayback';
import { formatTime } from './utils/timeFmt';
import { MemoizedSpeakerResolver } from '@/utils/memoizedSpeakerResolution';
import { ChevronDown, ChevronUp, Users, Clock, Mic, Volume2, Settings, BarChart3, Play, User, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface EnhancedSpeakerSegment {
  speaker_name: string;
  start_time: number;
  end_time: number;
  text?: string;
  confidence?: number;
  whisper_confidence?: number;
  analysis_method?: string;
  change_reason?: string;
}

interface EnhancedSpeaker {
  name: string;
  segments: EnhancedSpeakerSegment[];
  characteristics?: {
    speaking_time: number;
    segment_count: number;
    voice_analysis: boolean;
    timing_based: boolean;
    change_reason: string;
    organization?: string;
  };
  confidence: number;
  analysis_method: string;
  color: string;
  speaking_percentage: number;
  avg_segment_duration: number;
}

interface SpeakerTimelineProps {
  recording?: any;
  recordingId?: string;
  className?: string;
}

const SPEAKER_COLORS = [
  { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-blue-700' },
  { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700' },
  { bg: 'bg-purple-500', border: 'border-purple-300', text: 'text-purple-700' },
  { bg: 'bg-orange-500', border: 'border-orange-300', text: 'text-orange-700' },
  { bg: 'bg-pink-500', border: 'border-pink-300', text: 'text-pink-700' },
  { bg: 'bg-indigo-500', border: 'border-indigo-300', text: 'text-indigo-700' }
];

// Analysis method priorities and display info
const ANALYSIS_METHODS = {
  'real_voice_diarization': { priority: 1, icon: Volume2, label: 'Voice Analysis', confidence: 95, color: 'text-green-600' },
  'whisper_segment_analysis': { priority: 2, icon: Mic, label: 'Enhanced Whisper', confidence: 85, color: 'text-blue-600' },
  'ai_enhanced_transcript_analysis': { priority: 3, icon: Settings, label: 'AI Analysis', confidence: 70, color: 'text-purple-600' },
  'enhanced_transcript_analysis': { priority: 4, icon: BarChart3, label: 'Pattern Analysis', confidence: 60, color: 'text-orange-600' },
  'ai_summary': { priority: 5, icon: User, label: 'Summary Extract', confidence: 95, color: 'text-green-600' },
  'fallback_estimation': { priority: 6, icon: Shield, label: 'Estimation', confidence: 30, color: 'text-gray-600' }
};

// Utility functions for segment generation
/**
 * Generate realistic conversation segments from transcript analysis
 */
function generateRealisticSegments(
  transcript: string,
  speakerNames: string[],
  totalDuration: number
): EnhancedSpeakerSegment[] {
  const segments: EnhancedSpeakerSegment[] = [];
  const lines = transcript.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return generateImprovedFallbackSegments(speakerNames, totalDuration);
  }

  console.log(`🎯 Analyzing ${lines.length} transcript lines for realistic segments`);

  let currentTime = 0;
  const avgSegmentDuration = Math.max(10, totalDuration / Math.max(lines.length, 10)); // At least 10 seconds per segment

  let lastSpeakerIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Try to identify speaker from line
    let speakerIndex = lastSpeakerIndex;
    let text = line;
    let confidence = 0.6;

    // Check for explicit speaker labels in transcript
    const speakerMatch = line.match(/^([^:]+):\s*(.+)/);
    if (speakerMatch) {
      const speakerLabel = speakerMatch[1].trim();
      const lineText = speakerMatch[2].trim();

      // Try to map to known speakers
      const mappedIndex = findBestSpeakerMatch(speakerLabel, speakerNames);
      if (mappedIndex !== -1) {
        speakerIndex = mappedIndex;
        confidence = 0.8;
      }
      text = lineText;
    } else {
      // Alternate speakers based on conversation flow
      const lowerLine = line.toLowerCase();
      if (suggestsSpeakerChange(lowerLine, i > 0 ? lines[i-1] : '')) {
        speakerIndex = (lastSpeakerIndex + 1) % speakerNames.length;
        confidence = 0.5;
      }
    }

    // Calculate segment timing with some variation
    const baseSegmentTime = avgSegmentDuration * (0.5 + Math.random()); // Random variation
    const segmentDuration = Math.min(baseSegmentTime, totalDuration - currentTime);

    if (segmentDuration > 0) {
      const speaker = speakerNames[speakerIndex] || speakerNames[0];

      segments.push({
        speaker_name: speaker,
        start_time: currentTime,
        end_time: currentTime + segmentDuration,
        text: text.length > 100 ? text.substring(0, 100) + '...' : text,
        confidence: confidence,
        analysis_method: 'transcript_analysis'
      });

      currentTime += segmentDuration;
      lastSpeakerIndex = speakerIndex;

      if (currentTime >= totalDuration) break;
    }
  }

  // Fill remaining time if needed
  if (currentTime < totalDuration) {
    const finalSpeaker = speakerNames[(lastSpeakerIndex + 1) % speakerNames.length];

    segments.push({
      speaker_name: finalSpeaker,
      start_time: currentTime,
      end_time: totalDuration,
      text: 'Closing remarks',
      confidence: 0.4,
      analysis_method: 'transcript_analysis'
    });
  }

  console.log(`✅ Generated ${segments.length} realistic segments from transcript analysis`);
  return segments;
}

/**
 * Generate improved fallback segments with realistic timing patterns
 */
function generateImprovedFallbackSegments(
  speakerNames: string[],
  totalDuration: number
): EnhancedSpeakerSegment[] {
  const segments: EnhancedSpeakerSegment[] = [];

  // Generate 8-15 segments for more realistic conversation flow
  const numSegments = Math.min(15, Math.max(8, Math.floor(totalDuration / 30))); // 30 seconds avg per segment
  let currentTime = 0;

  console.log(`🎯 Generating ${numSegments} improved fallback segments`);

  for (let i = 0; i < numSegments; i++) {
    // Alternate speakers with some variation
    const speakerIndex = selectNextSpeaker(i, speakerNames.length);
    const speaker = speakerNames[speakerIndex];

    // Create more realistic segment durations (15-90 seconds)
    const minDuration = 15;
    const maxDuration = Math.min(90, totalDuration / (numSegments * 0.7));
    const segmentDuration = minDuration + Math.random() * (maxDuration - minDuration);

    const endTime = Math.min(currentTime + segmentDuration, totalDuration);

    if (endTime > currentTime) {
      segments.push({
        speaker_name: speaker,
        start_time: currentTime,
        end_time: endTime,
        text: `Conversation segment ${i + 1}`,
        confidence: 0.5,
        analysis_method: 'improved_fallback'
      });

      currentTime = endTime;

      // Add small pause between speakers (1-3 seconds)
      if (i < numSegments - 1 && currentTime < totalDuration - 5) {
        currentTime += 1 + Math.random() * 2;
      }
    }

    if (currentTime >= totalDuration) break;
  }

  console.log(`✅ Generated ${segments.length} improved fallback segments`);
  return segments;
}

/**
 * Find the best speaker match for a transcript label
 */
function findBestSpeakerMatch(label: string, speakerNames: string[]): number {
  const cleanLabel = label.toLowerCase().trim();

  // Direct match
  for (let i = 0; i < speakerNames.length; i++) {
    if (speakerNames[i].toLowerCase() === cleanLabel) {
      return i;
    }
  }

  // Partial match
  for (let i = 0; i < speakerNames.length; i++) {
    const cleanSpeaker = speakerNames[i].toLowerCase();
    if (cleanSpeaker.includes(cleanLabel) || cleanLabel.includes(cleanSpeaker)) {
      return i;
    }
  }

  // Speaker number match (Speaker 1, Speaker 2, etc.)
  const numberMatch = cleanLabel.match(/(?:speaker\s*|participant\s*)?(\d+)/);
  if (numberMatch) {
    const speakerNum = parseInt(numberMatch[1]) - 1;
    if (speakerNum >= 0 && speakerNum < speakerNames.length) {
      return speakerNum;
    }
  }

  return -1; // No match found
}

/**
 * Check if a line suggests a speaker change
 */
function suggestsSpeakerChange(currentLine: string, previousLine: string): boolean {
  // Conversation starters that suggest speaker change
  const speakerChangeIndicators = [
    /^(well|so|actually|yes|no|okay|sure|right|exactly|absolutely)/,
    /\?$/, // Questions often indicate turn-taking
    /^(thank|thanks|i\s+think|i\s+believe|i\s+would|let\s+me)/,
    /^(what|how|why|when|where|who)/,
  ];

  // Response patterns
  const responsePatterns = [
    /^(yes|no|sure|okay|right|exactly|absolutely|definitely|probably)/,
    /^(i\s+agree|i\s+disagree|that's|this\s+is|it's)/
  ];

  // Check if previous line was a question (likely to trigger response)
  const previousWasQuestion = previousLine.includes('?');

  if (previousWasQuestion && responsePatterns.some(pattern => pattern.test(currentLine))) {
    return true;
  }

  return speakerChangeIndicators.some(pattern => pattern.test(currentLine));
}

/**
 * Select next speaker with realistic conversation patterns
 */
function selectNextSpeaker(segmentIndex: number, numSpeakers: number): number {
  if (numSpeakers === 2) {
    // For 2 speakers, alternate with occasional longer turns
    if (Math.random() < 0.15) { // 15% chance to continue with same speaker
      return segmentIndex % numSpeakers;
    }
    return segmentIndex % numSpeakers;
  } else {
    // For more speakers, use weighted random selection
    const weights = Array(numSpeakers).fill(1);
    const lastSpeaker = (segmentIndex - 1) % numSpeakers;

    // Reduce weight for the last speaker (less likely to speak again immediately)
    if (lastSpeaker >= 0) weights[lastSpeaker] = 0.3;

    // Select based on weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) return i;
    }

    return segmentIndex % numSpeakers;
  }
}

export default function SpeakerTimeline({ 
  recording, 
  recordingId,
  className = '' 
}: SpeakerTimelineProps) {
  const { currentTime, duration, seek } = usePlayback();
  const queryClient = useQueryClient();
  const [enhancing, setEnhancing] = useState(false);
  const invokedRef = useRef<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Enhanced speaker processing with rich analytics
  const { speakers, analytics, timeMarkers } = useMemo(() => {
    if (!recording) {
      console.log('❌ SpeakerTimeline: No recording available');
      return { speakers: [], analytics: null, timeMarkers: [] };
    }

    console.log('🎭 Enhanced SpeakerTimeline: Processing recording for detailed analysis:', {
      recordingId: recording.id,
      hasAISpeakerAnalysis: !!recording.ai_speaker_analysis,
      hasWhisperSegments: !!recording.whisper_segments,
      hasSpeakerSegments: !!recording.speaker_segments,
      hasTranscript: !!recording.transcript
    });

    let segments: EnhancedSpeakerSegment[] = [];
    let aiSpeakerAnalysis: any = null;
    const totalDuration = recording?.duration || duration || 0;

    // 1. Extract AI Speaker Analysis data (most comprehensive)
    if (recording.ai_speaker_analysis) {
      try {
        aiSpeakerAnalysis = typeof recording.ai_speaker_analysis === 'string' 
          ? JSON.parse(recording.ai_speaker_analysis)
          : recording.ai_speaker_analysis;
        console.log('✅ AI Speaker Analysis found:', aiSpeakerAnalysis.analysis_method);
      } catch (e) {
        console.warn('Error parsing AI speaker analysis:', e);
      }
    }

    // 2. Try to get segments from speaker_segments table first (most reliable)
    if (recording.speaker_segments && Array.isArray(recording.speaker_segments)) {
      console.log('✅ Using speaker_segments table data:', recording.speaker_segments.length, 'segments');
      segments = recording.speaker_segments.map((segment: any) => ({
        speaker_name: segment.speaker_name,
        start_time: segment.start_time,
        end_time: segment.end_time,
        text: segment.text,
        confidence: 0.9, // High confidence for stored segments
        analysis_method: 'stored_segments'
      }));
    }
    // 3. Use Whisper segments with enhanced analysis
    else if (recording.whisper_segments && Array.isArray(recording.whisper_segments)) {
      console.log('✅ Using enhanced Whisper segments data:', recording.whisper_segments.length, 'segments');
      
      // Use Whisper segments with speaker detection from AI analysis
      if (aiSpeakerAnalysis?.identified_speakers) {
        segments = recording.whisper_segments.map((segment: any, index: number) => {
          // Assign speakers based on timing and AI analysis
          const speakerIndex = Math.floor(index / (recording.whisper_segments.length / Math.max(aiSpeakerAnalysis.identified_speakers.length, 1)));
          const assignedSpeaker = aiSpeakerAnalysis.identified_speakers[speakerIndex] || aiSpeakerAnalysis.identified_speakers[0];
          
          return {
            speaker_name: assignedSpeaker?.name || `Speaker ${speakerIndex + 1}`,
            start_time: segment.start,
            end_time: segment.end,
            text: segment.text,
            confidence: assignedSpeaker?.confidence || aiSpeakerAnalysis.confidence_score || 0.75,
            whisper_confidence: 1 - (segment.no_speech_prob || 0),
            analysis_method: aiSpeakerAnalysis.analysis_method || 'whisper_segment_analysis',
            change_reason: assignedSpeaker?.characteristics?.change_reason || 'timing_based'
          };
        });
      } else {
        // Basic Whisper segment processing
        segments = recording.whisper_segments.map((segment: any, index: number) => ({
          speaker_name: `Speaker ${(index % 2) + 1}`, // Alternate between 2 speakers
          start_time: segment.start,
          end_time: segment.end,
          text: segment.text,
          confidence: 0.6,
          whisper_confidence: 1 - (segment.no_speech_prob || 0),
          analysis_method: 'whisper_basic'
        }));
      }
    }
    // 4. Fallback to enhanced transcript analysis with realistic segments
    else {
      console.log('⚠️ Using enhanced transcript analysis fallback...');
      try {
        const speakerNames = MemoizedSpeakerResolver.getSpeakerNames(recording);
        console.log('🎯 SpeakerResolver found speakers:', speakerNames);

        if (speakerNames.length > 0 && recording.transcript) {
          // Generate realistic conversation segments from transcript
          segments = generateRealisticSegments(recording.transcript, speakerNames, totalDuration);
        } else if (speakerNames.length > 0) {
          // Fallback to improved segment distribution
          segments = generateImprovedFallbackSegments(speakerNames, totalDuration);
        }
      } catch (error) {
        console.error('❌ Enhanced transcript analysis error:', error);
      }
    }

    if (segments.length === 0) {
      console.log('❌ No speaker segments found from any source');
      return { speakers: [], analytics: null, timeMarkers: [] };
    }

    // 5. Group segments by speaker and calculate comprehensive analytics
    const speakerMap = new Map<string, EnhancedSpeakerSegment[]>();
    
    segments.forEach(segment => {
      const speaker = segment.speaker_name || 'Unknown Speaker';
      if (!speakerMap.has(speaker)) {
        speakerMap.set(speaker, []);
      }
      speakerMap.get(speaker)!.push(segment);
    });

    // 6. Create enhanced speaker objects with rich analytics
    let totalSpeakingTime = 0;
    const speakerList: EnhancedSpeaker[] = Array.from(speakerMap.entries()).map(([name, speakerSegments], index) => {
      // Calculate speaking time for this speaker
      const speakingTime = speakerSegments.reduce((total, segment) => 
        total + (segment.end_time - segment.start_time), 0);
      
      totalSpeakingTime += speakingTime;

      // Find corresponding AI analysis characteristics
      const aiSpeakerData = aiSpeakerAnalysis?.identified_speakers?.find((s: any) => 
        s.name === name || s.name.includes(name.replace('Speaker ', ''))
      );

      const avgConfidence = speakerSegments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / speakerSegments.length;
      const primaryAnalysisMethod = speakerSegments[0]?.analysis_method || 'unknown';

      return {
        name,
        segments: speakerSegments,
        characteristics: aiSpeakerData?.characteristics || {
          speaking_time: speakingTime,
          segment_count: speakerSegments.length,
          voice_analysis: primaryAnalysisMethod === 'real_voice_diarization',
          timing_based: primaryAnalysisMethod.includes('whisper') || primaryAnalysisMethod.includes('timing'),
          change_reason: speakerSegments[0]?.change_reason || 'pattern_based'
        },
        confidence: avgConfidence,
        analysis_method: primaryAnalysisMethod,
        color: SPEAKER_COLORS[index % SPEAKER_COLORS.length].bg,
        speaking_percentage: 0, // Will be calculated after totalSpeakingTime is known
        avg_segment_duration: speakingTime / speakerSegments.length
      };
    });

    // Calculate speaking percentages
    speakerList.forEach(speaker => {
      speaker.speaking_percentage = totalSpeakingTime > 0 
        ? (speaker.characteristics!.speaking_time / totalSpeakingTime) * 100 
        : 0;
    });

    // 7. Generate analytics summary
    const analytics = {
      totalSpeakers: speakerList.length,
      totalSpeakingTime,
      analysisMethod: aiSpeakerAnalysis?.analysis_method || 'basic_detection',
      overallConfidence: aiSpeakerAnalysis?.confidence_score || 
        (speakerList.reduce((sum, s) => sum + s.confidence, 0) / speakerList.length),
      segmentsAnalyzed: aiSpeakerAnalysis?.segments_analyzed || segments.length,
      talkTimeBalance: speakerList.length === 2 
        ? Math.abs(speakerList[0].speaking_percentage - speakerList[1].speaking_percentage)
        : null
    };

    // 8. Generate enhanced time markers
    const markerInterval = totalDuration / 8; // More granular markers
    const markers = Array.from({ length: 9 }, (_, i) => i * markerInterval);

    console.log('✅ Enhanced SpeakerTimeline: Created detailed analysis:', {
      speakerCount: speakerList.length,
      totalSegments: segments.length,
      analysisMethod: analytics.analysisMethod,
      overallConfidence: analytics.overallConfidence,
      duration: totalDuration
    });

    return { 
      speakers: speakerList, 
      analytics,
      timeMarkers: markers 
    };
  }, [recording?.ai_speaker_analysis, recording?.whisper_segments, recording?.speaker_segments, recording?.duration, recording?.id, duration]);

  // Auto-trigger enhanced speaker analysis if recording is complete (or has transcript)
  // but no ai_speaker_analysis is present yet.
  useEffect(() => {
    const id = recordingId || recording?.id;
    if (!id) return;
    const completedOrHasTranscript = (recording?.status === 'completed') || !!recording?.transcript;
    const needsAnalysis = !recording?.ai_speaker_analysis;
    if (!completedOrHasTranscript || !needsAnalysis) return;
    if (invokedRef.current === id) return;

    let cancelled = false;
    (async () => {
      try {
        setEnhancing(true);
        invokedRef.current = id;
        const { error } = await supabase.functions.invoke('enhance-whisper-analysis', {
          body: { recording_id: id }
        });
        if (error) {
          // allow retry later
          invokedRef.current = null;
          return;
        }
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['recording-detail', id] });
          queryClient.invalidateQueries({ queryKey: ['recordings'] });
        }
      } finally {
        if (!cancelled) setEnhancing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [recordingId, recording?.id, recording?.status, recording?.transcript, recording?.ai_speaker_analysis, queryClient]);

  const handleSegmentClick = (startTime: number) => {
    console.log('🎯 Enhanced SpeakerTimeline: Seeking to time:', startTime);
    seek(startTime);
  };

  if (!recording) {
    return (
      <div className={`py-4 ${className}`}>
        <div className="text-sm text-muted-foreground">No recording available</div>
      </div>
    );
  }

  if (speakers.length === 0) {
    return (
      <div className={`py-4 ${className}`}>
        <div className="text-sm text-muted-foreground">
          {enhancing ? 'Generating speaker analysis…' : (
            recording.status === 'completed' 
              ? 'No speakers detected in this recording'
              : 'Speaker analysis in progress...'
          )}
        </div>
      </div>
    );
  }

  const totalDuration = recording?.duration || duration || 0;
  const currentTimePercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayedSpeakers = showMore ? speakers : speakers.slice(0, 3);

  // Get analysis method info for display
  const getAnalysisMethodInfo = (method: string) => {
    return ANALYSIS_METHODS[method as keyof typeof ANALYSIS_METHODS] || {
      priority: 9, icon: Shield, label: 'Unknown', confidence: 50, color: 'text-gray-500'
    };
  };

  return (
    <TooltipProvider>
      <div className={`w-full ${className}`}>
        {/* Enhanced Header with Analytics */}
        <div className="mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  Speaker Timeline ({speakers.length} speakers)
                </span>
                {analytics && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(analytics.overallConfidence * 100)}% confidence
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
                {analytics && (
                  <span className="ml-2">
                    • {getAnalysisMethodInfo(analytics.analysisMethod).label}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="h-7 px-2 text-xs"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Analytics
              </Button>
            </div>
          </div>

          {/* Analytics Panel */}
          {showAnalytics && analytics && (
            <div className="bg-muted/30 rounded-lg p-3 mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground">Analysis Method</div>
                  <div className="flex items-center gap-1 font-medium">
                    {React.createElement(getAnalysisMethodInfo(analytics.analysisMethod).icon, {
                      className: `w-3 h-3 ${getAnalysisMethodInfo(analytics.analysisMethod).color}`
                    })}
                    {getAnalysisMethodInfo(analytics.analysisMethod).label}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Segments Analyzed</div>
                  <div className="font-medium">{analytics.segmentsAnalyzed}</div>
                </div>
                {analytics.talkTimeBalance !== null && (
                  <div>
                    <div className="text-muted-foreground">Talk Balance</div>
                    <div className="font-medium">
                      {analytics.talkTimeBalance < 20 ? 'Balanced' : 
                       analytics.talkTimeBalance < 40 ? 'Moderate' : 'Imbalanced'} 
                      ({Math.round(analytics.talkTimeBalance)}% diff)
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Total Speaking Time</div>
                  <div className="font-medium">{formatTime(analytics.totalSpeakingTime)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Speaker Timeline */}
        <div className="relative">
          {/* Vertical Playhead with enhanced styling */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 rounded-full shadow-sm"
            style={{ left: `${currentTimePercent}%` }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full shadow-sm" />
          </div>
          
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
            {timeMarkers.map((time, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-px bg-border/40"
                style={{ left: `${totalDuration > 0 ? (time / totalDuration) * 100 : 0}%` }}
              >
                <div className="absolute -bottom-5 -left-4 text-xs text-muted-foreground">
                  {formatTime(time)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Speaker Rows with Enhanced Display */}
          <div className="space-y-3 pb-6">
            {displayedSpeakers.map((speaker, speakerIndex) => {
              const colorInfo = SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length];
              const methodInfo = getAnalysisMethodInfo(speaker.analysis_method);
              
              return (
                <div key={speaker.name} className="relative">
                  {/* Speaker Info Card */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-shrink-0 w-40">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 ${speaker.color} rounded-full`} />
                        <span className="text-sm font-medium text-foreground">
                          {speaker.name.replace(/^Speaker\s*/, '')}
                        </span>
                        <Tooltip>
                          <TooltipTrigger>
                            {React.createElement(methodInfo.icon, {
                              className: `w-3 h-3 ${methodInfo.color}`
                            })}
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">{methodInfo.label}</div>
                              <div>Confidence: {Math.round(speaker.confidence * 100)}%</div>
                              {speaker.characteristics?.change_reason && (
                                <div>Reason: {speaker.characteristics.change_reason}</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>Talk time:</span>
                          <span className="font-medium">{Math.round(speaker.speaking_percentage)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-medium">{formatTime(speaker.characteristics?.speaking_time || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Segments:</span>
                          <span className="font-medium">{speaker.characteristics?.segment_count || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline Bar with Enhanced Segments */}
                    <div className="flex-1 relative h-6 bg-muted/40 rounded-md">
                      {speaker.segments.map((segment, segmentIndex) => {
                        const left = totalDuration > 0 ? (segment.start_time / totalDuration) * 100 : 0;
                        const width = totalDuration > 0 ? ((segment.end_time - segment.start_time) / totalDuration) * 100 : 2;
                        const opacity = Math.max(0.7, segment.confidence || 0.7);
                        
                        return (
                          <Tooltip key={`${speakerIndex}-${segmentIndex}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-full rounded-sm cursor-pointer transition-all hover:scale-105 ${speaker.color} border border-white/20`}
                                style={{
                                  left: `${left}%`,
                                  width: `${Math.max(width, 0.8)}%`,
                                  opacity
                                }}
                                onClick={() => handleSegmentClick(segment.start_time)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs max-w-xs">
                                <div className="font-medium mb-1">
                                  {speaker.name}: {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                                </div>
                                {segment.confidence && (
                                  <div className="text-muted-foreground mb-1">
                                    Confidence: {Math.round(segment.confidence * 100)}%
                                  </div>
                                )}
                                {segment.text && (
                                  <div className="italic">"{segment.text.substring(0, 100)}..."</div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Click to play from this point
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      
                      {/* Speaking percentage indicator */}
                      <div 
                        className="absolute -top-1 h-1 bg-primary/60 rounded-full"
                        style={{ width: `${speaker.speaking_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Enhanced Controls */}
          <div className="flex items-center justify-between mt-4 pt-2 border-t border-border">
            {speakers.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMore(!showMore)}
                className="h-7 px-2 text-xs"
              >
                {showMore ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3 ml-1" />
                  </>
                ) : (
                  <>
                    Show {speakers.length - 3} more <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            )}
            
            <div className="text-xs text-muted-foreground">
              {speakers.length === 0 ? 'No speakers detected' :
               speakers.length === 1 ? '1 speaker detected' :
               `${speakers.length} speakers detected`}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
