import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MetricStatus = 'excellent' | 'good' | 'warning' | 'alert' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'neutral';

interface HeroMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  score?: number;
  trend?: string;
  trendDirection?: TrendDirection;
  status?: MetricStatus;
  className?: string;
  onClick?: () => void;
}

const STATUS_STYLES: Record<MetricStatus, {
  gradient: string;
  border: string;
  iconBg: string;
  iconRing: string;
  text: string;
  badge: string;
}> = {
  excellent: {
    gradient: 'from-green-50 via-emerald-50 to-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-600',
    iconRing: 'ring-green-100',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  good: {
    gradient: 'from-blue-50 via-cyan-50 to-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-600',
    iconRing: 'ring-blue-100',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  warning: {
    gradient: 'from-yellow-50 via-amber-50 to-yellow-50',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-600',
    iconRing: 'ring-yellow-100',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  alert: {
    gradient: 'from-red-50 via-rose-50 to-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-600',
    iconRing: 'ring-red-100',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  neutral: {
    gradient: 'from-gray-50 via-slate-50 to-gray-50',
    border: 'border-gray-200',
    iconBg: 'bg-gray-600',
    iconRing: 'ring-gray-100',
    text: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

const getTrendIcon = (direction: TrendDirection) => {
  switch (direction) {
    case 'up': return TrendingUp;
    case 'down': return TrendingDown;
    default: return Minus;
  }
};

const getTrendColor = (direction: TrendDirection) => {
  switch (direction) {
    case 'up': return 'text-green-600';
    case 'down': return 'text-red-600';
    default: return 'text-gray-500';
  }
};

export default function HeroMetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  score,
  trend,
  trendDirection = 'neutral',
  status = 'neutral',
  className,
  onClick
}: HeroMetricCardProps) {
  const styles = STATUS_STYLES[status];
  const TrendIcon = getTrendIcon(trendDirection);
  const trendColor = getTrendColor(trendDirection);

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        'bg-gradient-to-br',
        styles.gradient,
        styles.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div
            className={cn(
              'p-3 rounded-xl ring-4 shadow-sm',
              styles.iconBg,
              styles.iconRing
            )}
          >
            <Icon className="w-6 h-6 text-white" strokeWidth={2} />
          </div>

          {/* Trend indicator */}
          {trend && (
            <div className={cn('flex items-center gap-1 text-sm font-semibold', trendColor)}>
              <TrendIcon className="w-4 h-4" strokeWidth={2} />
              <span>{trend}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-4 space-y-1">
          <div className={cn('text-4xl font-bold tracking-tight animate-count-up', styles.text)}>
            {value}
          </div>

          {/* Label */}
          <div className="text-sm font-medium text-gray-600">
            {label}
          </div>

          {/* Subtitle or Score bar */}
          {subtitle && (
            <Badge variant="outline" className={cn('mt-2 text-xs', styles.badge)}>
              {subtitle}
            </Badge>
          )}

          {score !== undefined && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    status === 'excellent' && 'bg-green-600',
                    status === 'good' && 'bg-blue-600',
                    status === 'warning' && 'bg-yellow-600',
                    status === 'alert' && 'bg-red-600',
                    status === 'neutral' && 'bg-gray-600'
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
