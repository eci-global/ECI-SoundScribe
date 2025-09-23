
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  RotateCcw,
  Settings,
  Bookmark,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

interface EnhancedMediaPlayerProps {
  recording: Recording;
  onPlay?: () => void;
}

export default function EnhancedMediaPlayer({ recording, onPlay }: EnhancedMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (onPlay) onPlay();
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Speaker timeline data (mock data for demo)
  const speakers = [
    { name: 'John Smith', color: 'bg-blue-500', segments: [{ start: 0, end: 45 }, { start: 120, end: 180 }] },
    { name: 'Mary Peterson', color: 'bg-green-500', segments: [{ start: 45, end: 120 }, { start: 180, end: 240 }] }
  ];

  return (
    <div className="bg-white rounded-lg border border-gong-border overflow-hidden">
      {/* Player Header */}
      <div className="p-4 border-b border-gong-border bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 bg-gong-purple hover:bg-gong-purple-dark text-white rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <SkipBack className="w-4 h-4 text-gong-gray-lighter" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <SkipForward className="w-4 h-4 text-gong-gray-lighter" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <RotateCcw className="w-4 h-4 text-gong-gray-lighter" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gong-gray-lighter">Speed:</span>
              <select 
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="text-sm border border-gong-border rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Bookmark className="w-4 h-4 text-gong-gray-lighter" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-gong-gray-lighter" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-gong-gray-lighter" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Waveform and Timeline */}
      <div className="p-4 space-y-4">
        {/* Time Display */}
        <div className="flex justify-between text-sm text-gong-gray-lighter">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        {/* Progress Bar with Speaker Timeline */}
        <div className="space-y-2">
          {/* Main progress bar */}
          <div 
            className="relative h-2 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-gong-purple rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gong-purple rounded-full border-2 border-white shadow-sm"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>
          
          {/* Speaker Timeline */}
          <div className="space-y-1">
            {speakers.map((speaker, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-20 text-xs text-gong-gray-lighter truncate">
                  {speaker.name}
                </div>
                <div className="flex-1 relative h-1 bg-gray-100 rounded">
                  {speaker.segments.map((segment, segIndex) => (
                    <div
                      key={segIndex}
                      className={cn("absolute top-0 h-full rounded", speaker.color)}
                      style={{
                        left: `${(segment.start / duration) * 100}%`,
                        width: `${((segment.end - segment.start) / duration) * 100}%`
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gong-gray-lighter" />
            ) : (
              <Volume2 className="w-4 h-4 text-gong-gray-lighter" />
            )}
          </button>
          <div className="w-20 h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-gong-purple rounded-full"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Hidden audio element for actual playback */}
      <audio
        ref={audioRef}
        src={recording.file_url}
        onTimeUpdate={(e) => handleTimeUpdate((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
      />
    </div>
  );
}
