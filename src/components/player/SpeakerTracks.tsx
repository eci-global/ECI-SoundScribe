import React, { useMemo } from 'react';
import { usePlayback } from './hooks/usePlayback';
import { SpeakerResolver } from '@/utils/speakerResolution';
import type { Recording } from '@/types/recording';
interface SpeakerTracksProps {
  recording?: Recording | null;
  recordingId?: string;
}
export default function SpeakerTracks({
  recording,
  recordingId
}: SpeakerTracksProps) {
  const {
    seek
  } = usePlayback();
  console.log('🎭 SpeakerTracks: Component state:', {
    recordingId: recordingId || recording?.id,
    hasRecording: !!recording,
    hasTranscript: !!recording?.transcript
  });

  // Use simple CallBrief approach - proven to work!
  const speakers = useMemo(() => {
    if (!recording) {
      console.log('❌ SpeakerTracks: No recording available');
      return [];
    }

    // Use same method as CallBrief that works reliably
    let speakerNames: string[] = [];
    try {
      speakerNames = SpeakerResolver.getSpeakerNames(recording) || [];
    } catch (error) {
      console.error('❌ SpeakerTracks: Error getting speaker names:', error);
      speakerNames = [];
    }
    console.log('🎭 SpeakerTracks: Speaker names from SpeakerResolver:', {
      speakerCount: speakerNames.length,
      speakers: speakerNames
    });
    if (speakerNames.length === 0) {
      console.log('⚠️ SpeakerTracks: No speakers found');
      return [];
    }

    // Create simple speaker display data
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    const speakerTracks = speakerNames.map((name, index) => {
      // Find first occurrence in transcript for timeline navigation
      let firstTime = 0;
      if (recording.transcript) {
        const lines = recording.transcript.split('\n');
        for (const line of lines) {
          if (line.includes(`${name}:`)) {
            // Try to extract timestamp
            const timeMatch = line.match(/\[(\d{1,2}):(\d{2})\]|\((\d{1,2}):(\d{2})\)|(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const mins = parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]) || 0;
              const secs = parseInt(timeMatch[2] || timeMatch[4] || timeMatch[6]) || 0;
              firstTime = mins * 60 + secs;
            }
            break;
          }
        }
      }
      return {
        name,
        firstTime,
        color: colors[index % colors.length]
      };
    });
    console.log('✅ SpeakerTracks: Simple speaker tracks created:', speakerTracks);
    return speakerTracks;
  }, [recording]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  if (!recording) {
    return <div className="text-center py-6">
        <p className="text-sm text-gray-500">No recording available</p>
      </div>;
  }
  if (speakers.length === 0) {
    return <div className="text-center py-6">
        <p className="text-sm text-gray-500">No speakers identified</p>
        <p className="text-xs text-gray-400 mt-1">
          {recording.transcript ? 'AI is analyzing the transcript for speaker identification...' : 'Speaker tracks will appear here once transcript is processed'}
        </p>
      </div>;
  }
  return;
}