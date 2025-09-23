
import React from 'react';

export interface SpeakerTrack {
  name: string;
  color: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

interface SpeakerTrackProps {
  track: SpeakerTrack;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function SpeakerTrack({ track, duration, currentTime, onSeek }: SpeakerTrackProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center mb-1">
        <div 
          className="w-3 h-3 rounded-full mr-2" 
          style={{ backgroundColor: track.color }}
        />
        <span className="text-sm font-medium text-gray-700">{track.name}</span>
      </div>
      <div className="relative h-6 bg-gray-200 rounded">
        {track.segments.map((segment, index) => {
          const left = (segment.start / duration) * 100;
          const width = ((segment.end - segment.start) / duration) * 100;
          
          return (
            <div
              key={index}
              className="absolute h-full rounded cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: track.color
              }}
              onClick={() => onSeek(segment.start)}
              title={segment.text}
            />
          );
        })}
      </div>
    </div>
  );
}
