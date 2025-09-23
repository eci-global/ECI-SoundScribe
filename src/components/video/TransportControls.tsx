
import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export default function TransportControls() {
  const { state, dispatch } = useVideoPlayer();

  const handlePlayPause = () => {
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' });
    console.log('Transport: Play/Pause toggled');
  };

  const handleReplay10s = () => {
    const newTime = Math.max(0, state.currentTime - 10);
    dispatch({ type: 'SET_TIME', payload: newTime });
    console.log('Transport: Replay 10 seconds');
  };

  const handleSkipTopic = () => {
    // Skip to next topic (approximately 90 seconds ahead for demo)
    const newTime = Math.min(state.duration, state.currentTime + 90);
    dispatch({ type: 'SET_TIME', payload: newTime });
    console.log('Transport: Skip to next topic');
  };

  const handleVolumeToggle = () => {
    dispatch({ type: 'TOGGLE_MUTE' });
    console.log('Transport: Volume toggled');
  };

  const handleVolumeChange = (value: number[]) => {
    dispatch({ type: 'SET_VOLUME', payload: value[0] });
  };

  const handleSpeedChange = (speed: number) => {
    dispatch({ type: 'SET_SPEED', payload: speed });
    console.log('Transport: Speed changed to', speed);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Main Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleReplay10s}
            className="p-3 rounded-full hover:bg-eci-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red"
            title="Replay 10 seconds"
          >
            <RotateCcw className="w-5 h-5 text-eci-gray-600" strokeWidth={1.5} />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-4 rounded-full bg-brand-red hover:bg-eci-red-dark text-white transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            {state.isPlaying ? (
              <Pause className="w-6 h-6" strokeWidth={1.5} />
            ) : (
              <Play className="w-6 h-6 ml-0.5" strokeWidth={1.5} />
            )}
          </button>

          <button
            onClick={handleSkipTopic}
            className="p-3 rounded-full hover:bg-eci-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red"
            title="Skip to next topic"
          >
            <SkipForward className="w-5 h-5 text-eci-gray-600" strokeWidth={1.5} />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleVolumeToggle}
            className="p-2 rounded-lg hover:bg-eci-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            {state.isMuted || state.volume === 0 ? (
              <VolumeX className="w-5 h-5 text-eci-gray-600" strokeWidth={1.5} />
            ) : (
              <Volume2 className="w-5 h-5 text-eci-gray-600" strokeWidth={1.5} />
            )}
          </button>
          
          <div className="w-20">
            <Slider
              value={[state.isMuted ? 0 : state.volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-2">
          <span className="text-body-small text-eci-gray-600 font-medium">Speed:</span>
          <div className="flex items-center space-x-1">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={cn(
                  "px-3 py-1 rounded-lg text-body-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red",
                  state.playbackSpeed === speed
                    ? "bg-brand-red text-white"
                    : "bg-eci-gray-100 text-eci-gray-700 hover:bg-eci-gray-200"
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
