import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface BarChartItem {
  label: string;
  score: number;
  maxScore?: number;
  icon?: LucideIcon;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';
  subtitle?: string;
}

interface HorizontalBarChartProps {
  data: BarChartItem[];
  showScores?: boolean;
  className?: string;
  onBarClick?: (item: BarChartItem) => void;
}

const COLOR_STYLES = {
  green: {
    bg: 'bg-green-500',
    light: 'bg-green-100',
    text: 'text-green-700',
    darkText: 'text-green-900'
  },
  blue: {
    bg: 'bg-blue-500',
    light: 'bg-blue-100',
    text: 'text-blue-700',
    darkText: 'text-blue-900'
  },
  yellow: {
    bg: 'bg-yellow-500',
    light: 'bg-yellow-100',
    text: 'text-yellow-700',
    darkText: 'text-yellow-900'
  },
  red: {
    bg: 'bg-red-500',
    light: 'bg-red-100',
    text: 'text-red-700',
    darkText: 'text-red-900'
  },
  purple: {
    bg: 'bg-purple-500',
    light: 'bg-purple-100',
    text: 'text-purple-700',
    darkText: 'text-purple-900'
  },
  gray: {
    bg: 'bg-gray-500',
    light: 'bg-gray-100',
    text: 'text-gray-700',
    darkText: 'text-gray-900'
  }
};

const getColorFromScore = (score: number): keyof typeof COLOR_STYLES => {
  if (score >= 85) return 'green';
  if (score >= 70) return 'blue';
  if (score >= 50) return 'yellow';
  return 'red';
};

const getQualitativeLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
};

export default function HorizontalBarChart({
  data,
  showScores = true,
  className,
  onBarClick
}: HorizontalBarChartProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {data.map((item, index) => {
        const color = item.color || getColorFromScore(item.score);
        const styles = COLOR_STYLES[color];
        const percentage = ((item.score / (item.maxScore || 100)) * 100);
        const Icon = item.icon;
        const qualitativeLabel = getQualitativeLabel(item.score);

        return (
          <div
            key={index}
            className={cn(
              'group transition-all duration-200',
              onBarClick && 'cursor-pointer hover:scale-[1.02]'
            )}
            onClick={() => onBarClick?.(item)}
          >
            {/* Label Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {Icon && <Icon className={cn('w-4 h-4', styles.text)} />}
                <span className="text-sm font-medium text-gray-900">
                  {item.label}
                </span>
                {item.subtitle && (
                  <span className="text-xs text-gray-500">
                    {item.subtitle}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showScores ? (
                  <>
                    <span className={cn('text-sm font-bold', styles.darkText)}>
                      {item.score}
                      {item.maxScore && `/${item.maxScore}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </>
                ) : (
                  <span className={cn('text-sm font-semibold', styles.text)}>
                    {qualitativeLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Bar */}
            <div className={cn('h-3 rounded-full overflow-hidden', styles.light)}>
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  styles.bg,
                  'group-hover:opacity-90'
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, percentage))}%`
                }}
              >
                {/* Animated shine effect */}
                <div className="h-full w-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
