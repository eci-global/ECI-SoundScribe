
import React from 'react';
import { Clock, User } from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { parseSpeakers } from '@/utils/speakerParser';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

interface TranscriptLine {
  timestamp: number;
  speaker: string;
  text: string;
}

interface TranscriptViewProps {
  currentRecording?: Recording | null;
}

export default function TranscriptView({ currentRecording }: TranscriptViewProps) {
  const { state, dispatch } = useVideoPlayer();

  const parseTranscriptToLines = (transcript: string): TranscriptLine[] => {
    if (!transcript) return [];

    const lines = transcript.split('\n').filter(line => line.trim());
    const transcriptLines: TranscriptLine[] = [];

    lines.forEach((line, index) => {
      // Try to extract timestamp and speaker from various formats
      const timeMatch = line.match(/\[(\d{1,2}):(\d{2})\]|\((\d{1,2}):(\d{2})\)|(\d{1,2}):(\d{2})/);
      const speakerMatch = line.match(/^([A-Za-z\s]+):|this is (\w+)|(\w+) here|(\w+) from/i);
      
      const timestamp = timeMatch ? 
        (parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]) * 60 + 
         parseInt(timeMatch[2] || timeMatch[4] || timeMatch[6])) : 
        index * 30; // Default 30 seconds per line

      let speaker = 'Speaker';
      let text = line;

      if (speakerMatch) {
        speaker = speakerMatch[1] || speakerMatch[2] || speakerMatch[3] || speakerMatch[4] || 'Speaker';
        speaker = speaker.trim();
        // Remove timestamp and speaker prefix from text
        text = line
          .replace(/\[[\d:]+\]|\([\d:]+\)|[\d:]+/, '') // Remove timestamps
          .replace(/^[A-Za-z\s]+:/, '') // Remove speaker prefix
          .replace(/this is \w+|(\w+) here|(\w+) from/i, '') // Remove intro phrases
          .trim();
      }

      if (text) {
        transcriptLines.push({
          timestamp,
          speaker: speaker || `Speaker ${Math.floor(index / 3) + 1}`,
          text
        });
      }
    });

    return transcriptLines;
  };

  const getTranscriptLines = (): TranscriptLine[] => {
    if (!currentRecording?.transcript) {
      return [{
        timestamp: 0,
        speaker: 'System',
        text: 'No transcript available. Complete AI processing to see the full transcript.'
      }];
    }

    return parseTranscriptToLines(currentRecording.transcript);
  };

  const handleTimestampClick = (timestamp: number) => {
    dispatch({ type: 'SET_TIME', payload: timestamp });
    console.log('Jumped to transcript timestamp:', timestamp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcriptLines = getTranscriptLines();
  
  const filteredTranscript = transcriptLines.filter(line => {
    if (!state.searchQuery) return true;
    return line.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
           line.speaker.toLowerCase().includes(state.searchQuery.toLowerCase());
  });

  const getSpeakerColor = (speaker: string) => {
    // Create consistent colors for speakers based on name hash
    const hash = speaker.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-eci-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-small font-semibold text-eci-gray-800">
          Transcript
        </h3>
        {currentRecording && (
          <div className="text-caption text-eci-gray-500">
            {transcriptLines.length} segments
          </div>
        )}
      </div>

      {currentRecording?.status === 'processing' && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Transcript processing...</span>
          </div>
        </div>
      )}

      {state.searchQuery && (
        <div className="mb-4 p-3 bg-eci-gray-50 rounded-xl">
          <p className="text-body-small text-eci-gray-600">
            {filteredTranscript.length} result{filteredTranscript.length !== 1 ? 's' : ''} for "{state.searchQuery}"
          </p>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredTranscript.map((line, index) => {
          const isCurrentTime = Math.abs(line.timestamp - state.currentTime) < 15;
          const isSelected = state.selectedSpeaker === line.speaker;
          
          return (
            <div
              key={`${line.timestamp}-${index}`}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200",
                isCurrentTime 
                  ? "border-brand-red bg-brand-red/5 shadow-sm" 
                  : "border-eci-gray-200 hover:border-eci-gray-300",
                isSelected && "ring-2 ring-brand-red/20"
              )}
            >
              <div className="flex items-start space-x-3">
                {line.speaker !== 'System' && (
                  <button
                    onClick={() => handleTimestampClick(line.timestamp)}
                    className="flex-shrink-0 flex items-center space-x-1 text-body-small text-eci-gray-500 hover:text-brand-red transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red rounded-lg px-2 py-1"
                  >
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    <span className="font-mono">{formatTime(line.timestamp)}</span>
                  </button>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-eci-gray-500" strokeWidth={1.5} />
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-caption font-medium",
                      getSpeakerColor(line.speaker)
                    )}>
                      {line.speaker}
                    </span>
                  </div>
                  
                  <p className="text-body text-eci-gray-800 leading-relaxed">
                    {state.searchQuery && line.speaker !== 'System' ? (
                      line.text.split(new RegExp(`(${state.searchQuery})`, 'gi')).map((part, i) => 
                        part.toLowerCase() === state.searchQuery.toLowerCase() ? (
                          <mark key={i} className="bg-yellow-200 text-eci-gray-900 px-1 rounded">
                            {part}
                          </mark>
                        ) : part
                      )
                    ) : (
                      line.text
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTranscript.length === 0 && state.searchQuery && (
        <div className="text-center py-8">
          <p className="text-body text-eci-gray-500">
            No transcript results found for "{state.searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}
