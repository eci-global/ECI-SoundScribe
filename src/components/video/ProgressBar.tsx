
import React from 'react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { parseTopics } from '@/utils/speakerParser';
import { cn } from '@/lib/utils';

export default function ProgressBar() {
  const { state, dispatch } = useVideoPlayer();
  
  const topics = parseTopics(''); // Mock topics for demo
  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * state.duration;
    dispatch({ type: 'SET_TIME', payload: newTime });
    console.log('Seeked to:', newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg">
      {/* Time Display */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-body-small font-medium text-eci-gray-700">
          {formatTime(state.currentTime)}
        </span>
        <span className="text-body-small text-eci-gray-500">
          {formatTime(state.duration)}
        </span>
      </div>

      {/* Progress Bar with Topics */}
      <div className="relative">
        {/* Main Progress Bar */}
        <div 
          className="relative h-3 bg-eci-gray-200 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          {/* Background Track */}
          <div className="absolute inset-0 bg-eci-gray-200 rounded-full" />
          
          {/* Topic Segments Background */}
          {topics.map((topic, index) => (
            <div
              key={index}
              className="absolute top-0 h-full bg-eci-gray-300 opacity-50"
              style={{
                left: `${(topic.startTime / state.duration) * 100}%`,
                width: `${(topic.duration / state.duration) * 100}%`
              }}
              title={topic.name}
            />
          ))}
          
          {/* Progress Fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-brand-red rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
          
          {/* Current Position Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-brand-red rounded-full border-2 border-white shadow-md transition-all duration-150"
            style={{ left: `calc(${progressPercent}% - 10px)` }}
          />
        </div>

        {/* Topic Dots */}
        <div className="absolute -bottom-2 left-0 right-0">
          {topics.map((topic, index) => (
            <button
              key={index}
              className="absolute w-3 h-3 bg-brand-red rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-1"
              style={{ left: `calc(${(topic.startTime / state.duration) * 100}% - 6px)` }}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SET_TIME', payload: topic.startTime });
                dispatch({ type: 'SELECT_TOPIC', payload: topic.name });
                console.log('Jumped to topic:', topic.name);
              }}
              title={topic.name}
            />
          ))}
        </div>
      </div>

      {/* Duration Ticks */}
      <div className="flex justify-between mt-3 px-1">
        {Array.from({ length: 5 }, (_, i) => {
          const time = (state.duration / 4) * i;
          return (
            <span 
              key={i} 
              className="text-caption text-eci-gray-400 font-medium"
            >
              {formatTime(time)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
