import React from 'react';
import { usePlayback } from './hooks/usePlayback';
import { useDrag } from './hooks/useDrag';
import { formatTime, getProgressPercentage } from './utils/timeFmt';

export default function Scrubber() {
  const { currentTime, duration, seek } = usePlayback();

  const {
    containerRef,
    isDragging,
    handleMouseDown,
    handleClick
  } = useDrag({
    onDrag: (progress) => {
      const seekTime = progress * duration;
      seek(seekTime);
    },
    onDragEnd: (progress) => {
      const seekTime = progress * duration;
      seek(seekTime);
    }
  });

  const progressPercentage = getProgressPercentage(currentTime, duration);

  // Generate chapter tick marks every 2 minutes
  const generateTicks = () => {
    if (duration === 0) return [];
    
    const ticks = [];
    const tickInterval = 120; // 2 minutes
    const tickCount = Math.floor(duration / tickInterval);
    
    for (let i = 1; i <= tickCount; i++) {
      const tickTime = i * tickInterval;
      const tickPercent = (tickTime / duration) * 100;
      ticks.push({
        time: tickTime,
        percent: tickPercent
      });
    }
    
    return ticks;
  };

  const ticks = generateTicks();

  return (
    <div className="w-full">
      {/* Time display */}
      <div className="flex justify-center text-sm text-gray-600 mb-2">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Scrubber track */}
      <div className="relative">
        <div
          ref={containerRef}
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer group"
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-player-lavender rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Chapter ticks */}
          {ticks.map((tick, index) => (
            <div
              key={index}
              className="absolute top-1/2 w-1 h-1 bg-gray-800 rounded-full transform -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${tick.percent}%` }}
              title={`Chapter at ${formatTime(tick.time)}`}
            />
          ))}

          {/* Scrubber handle */}
          <div
            className={`absolute top-1/2 w-4 h-4 bg-white rounded-full border-2 border-player-lavender transform -translate-y-1/2 -translate-x-1/2 transition-all duration-100 ${
              isDragging ? 'scale-125 shadow-lg' : 'group-hover:scale-110 shadow-md'
            }`}
            style={{ left: `${progressPercentage}%` }}
          />

          {/* Hover preview (optional) */}
          <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            {/* Preview tooltip could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}