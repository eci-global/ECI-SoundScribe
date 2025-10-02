import React, { useMemo } from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { Clock, Star, AlertCircle, CheckCircle, TrendingUp, MessageCircle, Users, Sparkles, RefreshCw, Heart, Shield } from 'lucide-react';
import { useAIMoments } from '@/hooks/useAIMoments';
import { useRecordingDetail } from '@/hooks/useRecordingDetail';
import { useSupportMode } from '@/contexts/SupportContext';
import type { Recording } from '@/types/recording';

interface MomentsPanelProps {
  recording?: Recording | null;
}

interface KeyMoment {
  id: string;
  label: string;
  timestamp: number;
  type: 'question' | 'decision' | 'objection' | 'commitment' | 'emotional' | 'competitive' | 'pricing' | 'action';
  severity: 'low' | 'medium' | 'high';
  content: string;
  speaker?: string;
}

interface Chapter {
  title: string;
  timestamp: number;
  duration: number;
  description: string;
}

export default function MomentsPanel({ recording }: MomentsPanelProps) {
  const { bookmarks, transcriptLines, seek } = useSpotlight();
  const { generateAIMoments, isGenerating, error } = useAIMoments();
  const { data: recordingDetail } = useRecordingDetail(recording?.id || '');
  const supportMode = useSupportMode();

  const isSupport = recording?.content_type === 'customer_support' || recording?.content_type === 'support_call' || supportMode.supportMode;

  // Helper function to assess transcript data quality
  const assessTranscriptQuality = (lines: typeof transcriptLines) => {
    if (!lines || lines.length === 0) return { hasContent: false, hasTimestamps: false, quality: 'none' };
    
    const hasRealTimestamps = lines.some(line => line.timestamp > 0);
    const timestampVariety = new Set(lines.map(l => l.timestamp)).size;
    const hasGoodTimestampSpread = timestampVariety > lines.length * 0.3; // At least 30% unique timestamps
    
    return {
      hasContent: true,
      hasTimestamps: hasRealTimestamps,
      quality: hasRealTimestamps && hasGoodTimestampSpread ? 'good' : hasRealTimestamps ? 'fair' : 'estimated'
    };
  };

  const transcriptQuality = assessTranscriptQuality(transcriptLines);

  /* ----------------- AI-Enhanced Chapters ----------------- */
  const chapters = useMemo(() => {
    if (!transcriptLines || transcriptLines.length === 0 || !recording) return [];
    
    // Get duration from recording or from last transcript timestamp
    const recordingDuration = recording.duration || 0;
    const lastTimestamp = transcriptLines.length > 0 ? transcriptLines[transcriptLines.length - 1].timestamp : 0;
    const totalDuration = Math.max(recordingDuration, lastTimestamp);
    
    // Ensure we have meaningful duration
    if (totalDuration < 60) return []; // Less than 1 minute, no chapters
    
    const segments = Math.max(3, Math.min(8, Math.floor(totalDuration / 300))); // 5-min segments, 3-8 chapters
    
    // Analyze content to generate smarter chapter titles
    const chapterTitles = [];
    const contentType = recording.content_type || 'other';
    
    switch (contentType) {
      case 'sales_call':
        chapterTitles.push(
          { title: 'Opening & Introductions', desc: 'Call setup and introductions' },
          { title: 'Discovery & Needs', desc: 'Understanding customer requirements' },
          { title: 'Solution Presentation', desc: 'Product demo and value proposition' },
          { title: 'Objection Handling', desc: 'Addressing concerns and questions' },
          { title: 'Next Steps & Close', desc: 'Agreeing on follow-up actions' }
        );
        break;
      case 'customer_support':
        chapterTitles.push(
          { title: 'Issue Identification', desc: 'Understanding the problem' },
          { title: 'Troubleshooting', desc: 'Working through solutions' },
          { title: 'Resolution & Testing', desc: 'Implementing and verifying fixes' },
          { title: 'Follow-up Planning', desc: 'Ensuring customer satisfaction' }
        );
        break;
      case 'team_meeting':
        chapterTitles.push(
          { title: 'Agenda Overview', desc: 'Meeting objectives and topics' },
          { title: 'Status Updates', desc: 'Progress reports and updates' },
          { title: 'Discussion & Decisions', desc: 'Key discussions and decisions' },
          { title: 'Action Items', desc: 'Next steps and assignments' }
        );
        break;
      default:
        chapterTitles.push(
          { title: 'Opening', desc: 'Beginning of conversation' },
          { title: 'Main Discussion', desc: 'Primary topics covered' },
          { title: 'Key Points', desc: 'Important details and decisions' },
          { title: 'Conclusion', desc: 'Wrap-up and next steps' }
        );
    }
    
    const segmentDuration = totalDuration / Math.min(segments, chapterTitles.length);
    
    return chapterTitles.slice(0, segments).map((chapter, i) => ({
      title: chapter.title,
      timestamp: Math.floor(i * segmentDuration),
      duration: Math.floor(segmentDuration),
      description: chapter.desc
    }));
  }, [transcriptLines, recording]);

  /* ----------------- AI-Enhanced Key Moments ----------------- */
  const keyMoments = useMemo(() => {
    if (!transcriptLines || transcriptLines.length === 0 || !recording) return [];
    
    // PRIORITY 1: Use AI-generated moments if available from transformed data
    const transformedAIMoments = recordingDetail?.ai_moments;
    if (transformedAIMoments && Array.isArray(transformedAIMoments) && transformedAIMoments.length > 0) {
      console.log('🤖 Using transformed AI-generated moments:', transformedAIMoments.length);
      
      const aiMoments: KeyMoment[] = transformedAIMoments
        .filter((moment: any) => moment && moment.type)
        .map((moment: any, index: number) => {
          // Map AI moment types to our KeyMoment types
          let type: KeyMoment['type'] = 'action';
          let label = moment.tooltip || moment.label || 'AI Moment';
          let severity: KeyMoment['severity'] = 'medium';
          
          switch (moment.type) {
            case 'objection':
              type = 'objection';
              label = 'Concern Raised';
              severity = 'high';
              break;
            case 'sentiment_neg':
              type = 'emotional';
              label = 'Negative Sentiment';
              severity = 'high';
              break;
            case 'bookmark':
              type = 'action';
              label = 'Important Discussion';
              severity = 'medium';
              break;
            case 'action':
              type = 'action';
              label = 'Action Item';
              severity = 'high';
              break;
            case 'chapter':
              // Skip chapter moments, they're handled separately
              return null;
            default:
              type = 'action';
              label = moment.tooltip || moment.label || 'Key Moment';
              severity = 'medium';
          }
          
          return {
            id: moment.id || `ai-moment-${index}`,
            label,
            timestamp: moment.start_time || 0,
            type,
            severity,
            content: moment.tooltip || moment.label || 'AI-identified key moment',
            speaker: 'AI Analysis'
          };
        })
        .filter(Boolean) as KeyMoment[];
        
      console.log('✅ Processed transformed AI moments:', aiMoments.length);
      return aiMoments.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // PRIORITY 2: Fallback to pattern matching if no AI moments
    console.log('📋 Falling back to pattern matching for moments');
    const moments: KeyMoment[] = [];
    
    // Add safety check for transcript quality
    const hasGoodTimestamps = transcriptLines.some(line => line.timestamp > 0);
    console.log('Transcript analysis:', {
      lineCount: transcriptLines.length,
      hasGoodTimestamps,
      maxTimestamp: Math.max(...transcriptLines.map(l => l.timestamp))
    });
    
    // Enhanced pattern matching with more sophisticated rules for better fallback
    const patterns = [
      // ECI-Specific Patterns for Support Recordings
      ...(isSupport ? [
        // ECI Care for Customer behaviors
        {
          regex: /\b(appreciate|thank you|understand|empathy|sorry|apologize|feel|frustration|concern)\b/i,
          type: 'emotional' as const,
          label: 'Care for Customer',
          severity: 'high' as const
        },
        // ECI Call Resolution behaviors
        {
          regex: /\b(solution|resolve|fix|repair|troubleshoot|investigate|root cause|follow up)\b/i,
          type: 'action' as const,
          label: 'Problem Resolution',
          severity: 'high' as const
        },
        // ECI Call Flow behaviors
        {
          regex: /\b(opening|greeting|closing|wrap up|next steps|summary|recap|anything else)\b/i,
          type: 'action' as const,
          label: 'Call Structure',
          severity: 'medium' as const
        },
        // Quality assurance moments
        {
          regex: /\b(quality|satisfaction|rating|feedback|experience|service|manager|escalate)\b/i,
          type: 'decision' as const,
          label: 'Service Quality',
          severity: 'high' as const
        }
      ] : []),

      // Questions and clarifications (expanded patterns)
      {
        regex: /\b(question|clarification|understand|help me|explain|how does|what if|can you|would you|could you|do you|are you|will you|might you)\b/i,
        type: 'question' as const,
        label: 'Important Question',
        severity: 'medium' as const
      },
      // Decisions and commitments (expanded)
      {
        regex: /\b(decide|decision|commit|agree|yes|approved|go ahead|move forward|sign|accept|confirm|choose|select)\b/i,
        type: 'decision' as const,
        label: 'Decision Point',
        severity: 'high' as const
      },
      // Objections and concerns (expanded)
      {
        regex: /\b(concern|worried|problem|issue|but|however|unfortunately|can't|won't|difficult|challenge|risk|drawback)\b/i,
        type: 'objection' as const,
        label: 'Concern Raised',
        severity: 'high' as const
      },
      // Competitive mentions (expanded)
      {
        regex: /\b(competitor|competition|alternative|versus|compared to|other option|other vendor|another solution)\b/i,
        type: 'competitive' as const,
        label: 'Competitive Discussion',
        severity: 'medium' as const
      },
      // Pricing discussions (expanded)
      {
        regex: /\b(price|pricing|cost|budget|expensive|cheap|affordable|investment|worth|dollar|fee|rate|quote|proposal)\b/i,
        type: 'pricing' as const,
        label: 'Pricing Discussion',
        severity: 'high' as const
      },
      // Action items (expanded)
      {
        regex: /\b(action|next step|follow up|send|schedule|meeting|call|email|task|demo|proposal|contract|implementation)\b/i,
        type: 'action' as const,
        label: 'Action Item',
        severity: 'high' as const
      },
      // Emotional indicators (expanded)
      {
        regex: /\b(excited|frustrated|amazing|perfect|love|hate|disappointed|thrilled|impressed|satisfied|confident)\b/i,
        type: 'emotional' as const,
        label: 'Emotional Moment',
        severity: 'medium' as const
      },
      // Timeline discussions
      {
        regex: /\b(timeline|deadline|when|time|schedule|month|week|quarter|year|urgent|asap)\b/i,
        type: 'action' as const,
        label: 'Timeline Discussion',
        severity: 'medium' as const
      },
      // Technical discussions
      {
        regex: /\b(technical|integration|system|platform|feature|functionality|requirement|specification)\b/i,
        type: 'action' as const,
        label: 'Technical Discussion',
        severity: 'medium' as const
      }
    ];
    
    transcriptLines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.regex.test(line.text)) {
          // Enhanced deduplication logic
          const isDuplicate = moments.some(m => 
            // Same type within 30 seconds
            (m.type === pattern.type && Math.abs(m.timestamp - line.timestamp) < 30) ||
            // Same content text (prevents duplicate content across different types)
            m.content === line.text.slice(0, 100) + (line.text.length > 100 ? '...' : '') ||
            // Same timestamp (prevents multiple patterns matching same line)
            m.timestamp === line.timestamp
          );
          
          if (!isDuplicate && line.text.length > 20) { // Ignore very short lines
            // Extract more meaningful content by finding the matching keyword context
            let relevantContent = line.text;
            const match = line.text.match(pattern.regex);
            if (match) {
              const matchIndex = line.text.toLowerCase().indexOf(match[0].toLowerCase());
              const start = Math.max(0, matchIndex - 30);
              const end = Math.min(line.text.length, matchIndex + match[0].length + 70);
              relevantContent = (start > 0 ? '...' : '') + 
                               line.text.slice(start, end) + 
                               (end < line.text.length ? '...' : '');
            }
            
            moments.push({
              id: `${pattern.type}-${line.timestamp}-${index}`,
              label: pattern.label,
              timestamp: line.timestamp,
              type: pattern.type,
              severity: pattern.severity,
              content: relevantContent.slice(0, 150) + (relevantContent.length > 150 ? '...' : ''),
              speaker: line.speaker
            });
          }
        }
      });
    });
    
    // Sort by timestamp and limit to most important moments
    return moments
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 15); // Limit to 15 key moments
  }, [transcriptLines, recording, recordingDetail]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMomentIcon = (type: KeyMoment['type']) => {
    switch (type) {
      case 'question': return MessageCircle;
      case 'decision': return CheckCircle;
      case 'objection': return AlertCircle;
      case 'competitive': return TrendingUp;
      case 'pricing': return Star;
      case 'action': return Clock;
      case 'emotional': return isSupport ? Heart : Users; // Use heart icon for ECI emotional moments
      default: return Star;
    }
  };

  const getMomentColor = (type: KeyMoment['type'], severity: KeyMoment['severity']) => {
    const colors = {
      question: severity === 'high' ? 'text-blue-600 bg-blue-50' : 'text-blue-500 bg-blue-50',
      decision: severity === 'high' ? 'text-green-600 bg-green-50' : 'text-green-500 bg-green-50',
      objection: severity === 'high' ? 'text-red-600 bg-red-50' : 'text-red-500 bg-red-50',
      competitive: 'text-purple-600 bg-purple-50',
      pricing: 'text-yellow-600 bg-yellow-50',
      action: 'text-eci-red bg-eci-red/10',
      emotional: 'text-pink-600 bg-pink-50',
      commitment: 'text-green-600 bg-green-50'
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  if (!recording) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No recording loaded</p>
        <p className="text-xs text-gray-400 mt-1">Key moments will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Smart Chapters */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-eci-red" />
          Smart Chapters
        </h3>
        {chapters.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              {transcriptLines.length === 0 
                ? "No transcript available for chapters"
                : recording?.duration && recording.duration < 60 
                  ? "Recording too short for chapters (minimum 1 minute)"
                  : "Processing chapters..."
              }
            </p>
            {transcriptLines.length > 0 && recording?.duration && recording.duration >= 60 && (
              <p className="text-xs text-gray-400 mt-1">
                Generating smart chapters based on content analysis
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-eci-red hover:bg-eci-red/5 transition-all"
                onClick={() => seek && seek(chapter.timestamp)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{chapter.title}</span>
                    <span className="text-xs text-eci-red font-mono bg-eci-red/10 px-2 py-0.5 rounded">
                      {formatTime(chapter.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{chapter.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI-Enhanced Key Moments */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-eci-blue" />
          Key Moments
          {keyMoments.length > 0 && (
            <span className="text-xs bg-eci-blue/10 text-eci-blue px-2 py-0.5 rounded-full">
              {keyMoments.length}
            </span>
          )}
        </h3>
        {keyMoments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
            {transcriptLines.length === 0 
                ? "No transcript available for analysis"
                : !recordingDetail?.ai_moments ? "No AI moments generated yet"
                : "Analyzing conversation for key moments..."
              }
            </p>
            {/* Manual AI Moments Generation */}
            {recording && recording.transcript && !recordingDetail?.ai_moments && !isGenerating && (
              <div className="mt-3 text-center">
                <button
                  onClick={async () => {
                    try {
                      await generateAIMoments(recording.id, recording.transcript);
                      // The UI will update automatically when the recording is refetched
                      window.location.reload(); // Simple refresh to show new moments
                    } catch (err) {
                      console.error('Failed to generate AI moments:', err);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-eci-blue text-white rounded-md hover:bg-eci-blue/90 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate AI Moments
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Generate 5-15 comprehensive moments with AI analysis
                </p>
              </div>
            )}
            {isGenerating && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-eci-blue">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Generating AI moments...
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-2">
                Failed to generate AI moments: {error}
              </p>
            )}
            {transcriptLines.length > 0 && recording?.ai_moments && (
              <p className="text-xs text-gray-400 mt-1">
                {transcriptLines.some(l => l.timestamp > 0) 
                  ? "Processing AI analysis..." 
                  : "Timestamps may be estimated - consider re-processing for better accuracy"
                }
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {keyMoments.map((moment) => {
              const IconComponent = getMomentIcon(moment.type);
              const colorClass = getMomentColor(moment.type, moment.severity);
              
              return (
                <div
                  key={moment.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  onClick={() => seek && seek(moment.timestamp)}
                >
                  <div className={`p-1.5 rounded-md ${colorClass}`}>
                    <IconComponent className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{moment.label}</span>
                      <span className="text-xs text-eci-blue font-mono bg-eci-blue/10 px-2 py-0.5 rounded">
                        {formatTime(moment.timestamp)}
                      </span>
                    </div>
                    {moment.speaker && (
                      <div className="text-xs text-gray-500 mb-1">{moment.speaker}</div>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-2">{moment.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User Bookmarks */}
      {bookmarks.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Your Bookmarks
          </h3>
          <div className="space-y-2">
            {bookmarks.map(bookmark => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                onClick={() => seek && seek(bookmark.timestamp)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: bookmark.color }}
                  />
                  <span className="text-sm font-medium text-gray-900">{bookmark.label}</span>
                </div>
                <span className="text-xs text-eci-blue font-mono bg-eci-blue/10 px-2 py-0.5 rounded">
                  {formatTime(bookmark.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}