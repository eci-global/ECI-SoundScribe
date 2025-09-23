import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 30, 
  color = '#3b82f6',
  strokeWidth = 2,
  className = ''
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-xs text-gray-400">No data</div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Handle case where all values are the same
  const normalizedData = range === 0 
    ? data.map(() => height / 2)
    : data.map(value => height - ((value - min) / range) * height);

  const pathData = normalizedData.reduce((path, point, index) => {
    const x = (index / (data.length - 1)) * width;
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${x} ${point}`;
  }, '');

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Add dots for data points */}
      {normalizedData.map((point, index) => (
        <circle
          key={index}
          cx={(index / (data.length - 1)) * width}
          cy={point}
          r={strokeWidth / 2}
          fill={color}
          opacity={0.7}
        />
      ))}
    </svg>
  );
}