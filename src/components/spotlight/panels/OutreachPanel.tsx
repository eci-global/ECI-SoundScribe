import React, { useMemo } from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { SpeakerResolver } from '@/utils/speakerResolution';
import { Users, Clock, MessageCircle, Star } from 'lucide-react';
import type { Recording } from '@/types/recording';

interface OutreachPanelProps {
  recording?: Recording | null;
}

export default function OutreachPanel({ recording }: OutreachPanelProps) {
  const { transcriptLines, seek } = useSpotlight();

  const speakers = useMemo(() => {
    if (!recording || !transcriptLines) {
      console.log('🚫 OutreachPanel: Missing data - recording:', !!recording, 'transcriptLines:', !!transcriptLines);
      return [];
    }
    
    console.log('🎭 OutreachPanel: Resolving speakers for recording:', recording.id);
    
    // Enhanced debugging: Log all speaker-related data
    console.log('📊 OutreachPanel: Raw recording data:', {
      hasAiSpeakerAnalysis: !!recording.ai_speaker_analysis,
      hasAiSummary: !!recording.ai_summary,
      hasTranscript: !!recording.transcript,
      transcriptLinesCount: transcriptLines.length,
      transcriptLineSpeakers: [...new Set(transcriptLines.map(l => l.speaker))],
      aiSummary: recording.ai_summary?.substring(0, 200) + '...' // First 200 chars
    });
    
    // NEW APPROACH: Try AI summary extraction first (same as CallBriefCard success pattern)
    console.log('🎯 OutreachPanel: Trying AI summary extraction first...');
    const aiSummaryResult = SpeakerResolver.extractFromAISummary(recording);
    
    let speakerResult;
    let resolvedSpeakers;
    
    if (aiSummaryResult.speakers.length > 0) {
      console.log('✅ OutreachPanel: AI summary extraction successful!');
      speakerResult = aiSummaryResult;
      resolvedSpeakers = aiSummaryResult.speakers;
    } else {
      console.log('⚠️ OutreachPanel: AI summary extraction failed, falling back to full resolution...');
      // Fallback to full SpeakerResolver only if AI summary fails
      speakerResult = SpeakerResolver.resolveActualSpeakers(recording);
      resolvedSpeakers = speakerResult.speakers;
    }
    
    console.log('🎭 OutreachPanel: Final speaker result:', {
      method: speakerResult.method,
      confidence: speakerResult.confidence,
      speakerCount: resolvedSpeakers.length,
      speakers: resolvedSpeakers.map(s => ({ 
        name: s.displayName, 
        confidence: s.confidence, 
        isAiIdentified: s.isAiIdentified,
        organization: s.organization 
      })),
      usedAiSummaryFirst: aiSummaryResult.speakers.length > 0
    });
    
    // Check if we should use fallback transcript counting
    const transcriptSpeakers = [...new Set(transcriptLines.map(l => l.speaker))];
    const shouldUseFallback = resolvedSpeakers.length === 0 || 
                             (transcriptSpeakers.length > resolvedSpeakers.length && transcriptSpeakers.length > 1);
    
    if (shouldUseFallback) {
      console.log('🔄 OutreachPanel: Using fallback transcript counting');
      console.log('🔄 Reason:', resolvedSpeakers.length === 0 ? 'No resolved speakers' : 'More transcript speakers than resolved');
      
      // Fallback to basic transcript counting when AI analysis is incomplete
      const totals = new Map<string, number>();
      const firstAppearance = new Map<string, number>();
      
      transcriptLines.forEach(line => {
        const speaker = line.speaker;
        totals.set(speaker, (totals.get(speaker) || 0) + 1);
        if (!firstAppearance.has(speaker)) {
          firstAppearance.set(speaker, line.timestamp);
        }
      });
      
      const totalLines = transcriptLines.length;
      return Array.from(totals.entries()).map(([name, count]) => ({
        name,
        percent: Math.round((count / totalLines) * 100),
        firstTime: firstAppearance.get(name) || 0,
        talkTime: `${Math.round((count / totalLines) * 100)}%`
      }));
    }
    
    // Map resolved speakers to transcript lines for accurate talk time calculation
    console.log('🔄 OutreachPanel: Mapping transcript lines to resolved speakers...');
    console.log('🔄 Before mapping - transcript speakers:', [...new Set(transcriptLines.map(l => l.speaker))]);
    
    const mappedLines = SpeakerResolver.mapTranscriptToSpeakers(transcriptLines, resolvedSpeakers);
    
    console.log('🔄 After mapping - transcript speakers:', [...new Set(mappedLines.map(l => l.speaker))]);
    console.log('🔄 Mapped lines sample:', mappedLines.slice(0, 5));
    
    const speakerStats = new Map<string, { count: number; firstTime: number }>();
    
    mappedLines.forEach(line => {
      const speaker = line.speaker;
      if (!speakerStats.has(speaker)) {
        speakerStats.set(speaker, { count: 0, firstTime: line.timestamp });
      }
      const stats = speakerStats.get(speaker)!;
      stats.count++;
      stats.firstTime = Math.min(stats.firstTime, line.timestamp);
    });
    
    const totalLines = mappedLines.length;
    
    return resolvedSpeakers.map(resolvedSpeaker => {
      const stats = speakerStats.get(resolvedSpeaker.displayName) || { count: 0, firstTime: 0 };
      const percent = totalLines > 0 ? Math.round((stats.count / totalLines) * 100) : 0;
      
      return {
        name: resolvedSpeaker.displayName,
        percent,
        firstTime: stats.firstTime,
        talkTime: `${percent}%`,
        // Additional info from SpeakerResolver
        confidence: resolvedSpeaker.confidence,
        isAiIdentified: resolvedSpeaker.isAiIdentified,
        organization: resolvedSpeaker.organization
      };
    }).filter(speaker => speaker.percent > 0); // Only show speakers with actual talk time
    
  }, [recording, transcriptLines]);
  
  console.log('👥 OutreachPanel: Final speakers:', speakers);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-eci-blue" />
        <h3 className="font-semibold text-eci-gray-800">Outreach Participants</h3>
      </div>

      {/* Speaker List */}
      <div className="space-y-3">
        {speakers.map((speaker, index) => (
          <div
            key={speaker.name}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
            onClick={() => seek && seek(speaker.firstTime)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                index === 0 ? 'bg-eci-blue' : 
                index === 1 ? 'bg-green-500' : 
                index === 2 ? 'bg-purple-500' : 'bg-gray-500'
              }`}>
                {speaker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-eci-gray-800">{speaker.name}</p>
                <div className="flex items-center gap-2 text-xs text-eci-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>First spoke at {formatTime(speaker.firstTime)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-eci-gray-800">{speaker.talkTime}</div>
              <div className="text-xs text-eci-gray-600">talk time</div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {speakers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-eci-gray-300 mx-auto mb-3" />
          <p className="text-sm text-eci-gray-600">No speaker data available</p>
          <p className="text-xs text-eci-gray-500 mt-1">Speaker analysis will appear here once processed</p>
        </div>
      )}

      {/* Quick Actions */}
      {speakers.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-eci-gray-700 mb-3">Quick Actions</h4>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-2 text-xs bg-eci-blue text-white rounded-md hover:bg-eci-blue/90 transition-colors">
              <MessageCircle className="w-3 h-3" />
              Add Comment
            </button>
            <button className="flex items-center gap-1 px-3 py-2 text-xs bg-gray-100 text-eci-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              <Star className="w-3 h-3" />
              Bookmark
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-eci-gray-500 border-t border-gray-200 pt-4">
        💡 Click on any participant to jump to their first speaking moment in the recording.
      </div>
    </div>
  );
}