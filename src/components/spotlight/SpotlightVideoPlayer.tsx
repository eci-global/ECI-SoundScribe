
import React from 'react';
import { Recording } from '@/types/recording';

export interface SpotlightVideoPlayerProps {
  recording: Recording;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onDurationChange: (duration: number) => void;
  onVolumeChange: (volume: number) => void;
}

export default function SpotlightVideoPlayer({
  recording,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onDurationChange,
  onVolumeChange
}: SpotlightVideoPlayerProps) {
  return (
    <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
      <div className="text-white text-center">
        <h3 className="text-xl mb-2">{recording.title}</h3>
        <p className="text-gray-400">Video Player Component</p>
        <div className="mt-4 space-x-2">
          <button
            onClick={onPlayPause}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / 
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
