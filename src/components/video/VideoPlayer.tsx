
import React, { useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';
import RecordingBrowserSheet from './RecordingBrowserSheet';
import type { Recording } from '@/types/recording';

interface VideoPlayerProps {
  src?: string;
  thumbnail?: string;
  currentRecording?: Recording | null;
}

export default function VideoPlayer({ src, thumbnail, currentRecording }: VideoPlayerProps) {
  const { state, dispatch } = useVideoPlayer();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', payload: video.currentTime });
    };

    const handleLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: video.duration });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [dispatch]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [state.isPlaying]);

  const handlePlayPause = () => {
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' });
    console.log('Play/Pause toggled:', !state.isPlaying);
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  return (
    <div className="space-y-4">
      {/* Recording Browser Sheet - removed currentRecording prop */}
      <RecordingBrowserSheet />

      {/* Video Player */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover cursor-pointer"
          onClick={handleVideoClick}
          poster={thumbnail}
          muted={state.isMuted}
          style={{ opacity: src ? 1 : 0 }}
        >
          {src && <source src={src} type="video/mp4" />}
        </video>

        {/* Placeholder when no video */}
        {!src && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-eci-gray-800 to-eci-gray-900 flex items-center justify-center cursor-pointer"
            onClick={handlePlayPause}
          >
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                {state.isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </div>
              <p className="text-body text-white/80">No video available</p>
              <p className="text-body-small text-white/60">Audio playback only</p>
            </div>
          </div>
        )}

        {/* Dark Overlay (shows when paused) */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
            state.isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          onClick={handleVideoClick}
        >
          <button
            className="w-20 h-20 rounded-full bg-brand-red hover:bg-eci-red-dark text-white flex items-center justify-center transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-black"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
          >
            {state.isPlaying ? (
              <Pause className="w-8 h-8" strokeWidth={1.5} />
            ) : (
              <Play className="w-8 h-8 ml-1" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Loading State */}
        {state.isPlaying && (
          <div className="absolute top-4 right-4">
            <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}
