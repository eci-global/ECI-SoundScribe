import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type InsightType = 'strength' | 'improvement' | 'risk' | 'opportunity' | 'neutral';
export type InsightPriority = 'high' | 'medium' | 'low';

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  type?: InsightType;
  priority?: InsightPriority;
  actionable?: boolean;
  timestamp?: number;
  onSeek?: (timestamp: number) => void;
  className?: string;
}

const TYPE_STYLES: Record<InsightType, {
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeText: string;
}> = {
  strength: {
    gradient: 'from-emerald-50/80 to-green-50/80',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'Strength'
  },
  improvement: {
    gradient: 'from-amber-50/80 to-yellow-50/80',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'Growth Area'
  },
  risk: {
    gradient: 'from-red-50/80 to-rose-50/80',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    badge: 'bg-red-100 text-red-800 border-red-200',
    badgeText: 'Risk'
  },
  opportunity: {
    gradient: 'from-blue-50/80 to-cyan-50/80',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Opportunity'
  },
  neutral: {
    gradient: 'from-gray-50/80 to-slate-50/80',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeText: 'Insight'
  }
};

const PRIORITY_STYLES: Record<InsightPriority, {
  dot: string;
  text: string;
}> = {
  high: {
    dot: 'bg-red-500 ring-red-200',
    text: 'High Priority'
  },
  medium: {
    dot: 'bg-amber-500 ring-amber-200',
    text: 'Medium Priority'
  },
  low: {
    dot: 'bg-blue-500 ring-blue-200',
    text: 'Low Priority'
  }
};

export default function InsightCard({
  icon: Icon,
  title,
  description,
  type = 'neutral',
  priority,
  actionable = false,
  timestamp,
  onSeek,
  className
}: InsightCardProps) {
  const styles = TYPE_STYLES[type];
  const priorityStyles = priority ? PRIORITY_STYLES[priority] : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-md',
        'bg-gradient-to-br',
        styles.gradient,
        styles.border,
        'group relative overflow-hidden',
        className
      )}
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

      <CardContent className="p-4 relative">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'p-2.5 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110',
            styles.iconBg
          )}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} strokeWidth={2} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                {title}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {priority && priorityStyles && (
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'w-2 h-2 rounded-full ring-2',
                      priorityStyles.dot
                    )} />
                    <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                      {priorityStyles.text}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-700 leading-relaxed mb-3">
              {description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={cn('text-xs', styles.badge)}>
                {styles.badgeText}
              </Badge>

              <div className="flex items-center gap-2">
                {actionable && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    Actionable
                  </Badge>
                )}

                {timestamp !== undefined && onSeek && (
                  <button
                    onClick={() => onSeek(timestamp)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {formatTime(timestamp)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
