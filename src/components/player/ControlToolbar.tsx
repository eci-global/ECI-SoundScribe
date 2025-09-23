import React from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  Maximize,
  Subtitles,
  ChevronDown
} from 'lucide-react';
import { usePlayback } from './hooks/usePlayback';

export default function ControlToolbar() {
  const {
    isPlaying,
    isMuted,
    playbackSpeed,
    showCaptions,
    isFullscreen,
    togglePlay,
    toggleMute,
    skipForward,
    skipBackward,
    nextSpeed,
    setShowCaptions,
    setIsFullscreen
  } = usePlayback();

  const formatSpeed = (speed: number) => {
    return speed === 1 ? '1×' : `${speed}×`;
  };

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      {/* Skip to previous topic */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        title="Skip to previous topic"
      >
        <SkipBack className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Replay 15 seconds */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        onClick={() => skipBackward(15)}
        title="Replay 15 seconds"
      >
        <RotateCcw className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Play/Pause */}
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" strokeWidth={1.5} />
        ) : (
          <Play className="w-5 h-5 ml-0.5" strokeWidth={1.5} />
        )}
      </button>

      {/* Forward 15 seconds */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        onClick={() => skipForward(15)}
        title="Forward 15 seconds"
      >
        <RotateCw className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Skip to next topic */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        title="Skip to next topic"
      >
        <SkipForward className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Volume */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" strokeWidth={1.5} />
        ) : (
          <Volume2 className="w-5 h-5" strokeWidth={1.5} />
        )}
      </button>

      {/* Playback Speed */}
      <button
        className="flex items-center justify-center gap-1 px-2 h-8 text-white/80 hover:text-white transition-colors rounded"
        onClick={nextSpeed}
        title="Playback speed"
      >
        <span className="text-sm font-medium">{formatSpeed(playbackSpeed)}</span>
        <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
      </button>

      {/* Closed Captions */}
      <button
        className={`flex items-center justify-center w-8 h-8 transition-colors ${
          showCaptions 
            ? 'text-white bg-white/20' 
            : 'text-white/80 hover:text-white'
        }`}
        onClick={() => setShowCaptions(!showCaptions)}
        title="Toggle captions"
      >
        <Subtitles className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Picture in Picture / Fullscreen */}
      <button
        className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white transition-colors"
        onClick={() => setIsFullscreen(!isFullscreen)}
        title="Picture in picture"
      >
        <Maximize className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}