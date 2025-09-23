
import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlayback } from './hooks/usePlayback';

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
}

export default function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const {
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    togglePlay
  } = usePlayback();

  // Check if the source is audio-only
  useEffect(() => {
    if (src) {
      const isAudio = src.includes('.mp3') || src.includes('.wav') || src.includes('.m4a') || src.includes('audio');
      setIsAudioOnly(isAudio);
      console.log('Media source detected:', { src, isAudio });
    }
  }, [src]);

  // Sync video element with store state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      console.log('📊 Video metadata loaded, duration:', video.duration);
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        console.log(`✅ Setting accurate video duration: ${video.duration}s`);
        setDuration(video.duration);
        
        // Validate against any existing recording duration for debugging
        const currentStoreDuration = duration;
        if (currentStoreDuration && Math.abs(currentStoreDuration - video.duration) > 5) {
          console.warn(`⚠️ Duration mismatch detected:`, {
            videoDuration: video.duration,
            storeDuration: currentStoreDuration,
            difference: Math.abs(currentStoreDuration - video.duration)
          });
        }
      } else {
        console.warn('⚠️ Invalid or missing video duration:', video.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error('Video/Audio error:', e);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [setCurrentTime, setDuration, setIsPlaying]);

  // Sync playback state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync current time when seeking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || Math.abs(video.currentTime - currentTime) < 0.5) return;

    video.currentTime = currentTime;
  }, [currentTime]);

  // Sync playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Sync volume and mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <div className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group ${className}`}>
      {/* Video/Audio Element */}
      <video
        ref={videoRef}
        className={`w-full h-full cursor-pointer ${isAudioOnly ? 'hidden' : 'object-cover'}`}
        onClick={handleVideoClick}
        poster={poster}
        playsInline
        controls={false}
      >
        {src && <source src={src} type={isAudioOnly ? "audio/mp4" : "video/mp4"} />}
      </video>

      {/* Audio-only or No video placeholder */}
      {(isAudioOnly || !src) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-lg font-medium mb-2">
              {isAudioOnly ? 'Audio Recording' : 'No video available'}
            </div>
            <div className="text-sm text-white/70">
              {isAudioOnly ? 'Audio playback' : 'Audio playback only'}
            </div>
          </div>
        </div>
      )}

      {/* Dark Overlay (shows until first play or when paused) */}
      <div
        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={handleVideoClick}
      >
        <button
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" strokeWidth={1.5} />
          ) : (
            <Play className="w-6 h-6 ml-0.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
