import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recording {
  id: string;
  title: string;
  file_type: 'audio' | 'video';
  file_url?: string;
  duration?: number;
}

interface FloatingPlayerProps {
  recording: Recording | null;
  onClose: () => void;
}

export default function FloatingPlayer({ recording, onClose }: FloatingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (recording) {
      setIsPlaying(true);
      setIsMinimized(false);
    }
  }, [recording]);

  const handlePlayPause = () => {
    const media = recording?.file_type === 'video' ? videoRef.current : audioRef.current;
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    const media = recording?.file_type === 'video' ? videoRef.current : audioRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
      setDuration(media.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = recording?.file_type === 'video' ? videoRef.current : audioRef.current;
    if (media) {
      const time = parseFloat(e.target.value);
      media.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!recording) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 z-50',
        isMinimized ? 'w-64' : recording.file_type === 'video' ? 'w-96' : 'w-80'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Volume2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <h3 className="text-sm font-medium text-gray-900 truncate">{recording.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4">
          {recording.file_type === 'video' ? (
            <video
              ref={videoRef}
              src={recording.file_url}
              className="w-full rounded mb-3"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              autoPlay
            />
          ) : (
            <audio
              ref={audioRef}
              src={recording.file_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              autoPlay
            />
          )}

          {/* Progress bar */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / duration) * 100}%, #E5E7EB ${(currentTime / duration) * 100}%, #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="p-3 bg-eci-blue text-white rounded-full hover:bg-eci-blue-dark transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Minimized state */}
      {isMinimized && (
        <div className="p-2 flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="p-2 bg-eci-blue text-white rounded-full hover:bg-eci-blue-dark transition-colors"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <div className="flex-1 text-xs text-gray-600">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  );
} 