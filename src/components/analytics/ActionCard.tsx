import React from 'react';
import { LucideIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ActionCategory = 'immediate' | 'short-term' | 'long-term';
export type ActionImpact = 'high' | 'medium' | 'low';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: ActionCategory;
  impact?: ActionImpact;
  estimatedTime?: string;
  completed?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const CATEGORY_STYLES: Record<ActionCategory, {
  gradient: string;
  border: string;
  badge: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
}> = {
  immediate: {
    gradient: 'from-red-50/80 via-orange-50/80 to-red-50/80',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800 border-red-200',
    badgeText: 'Immediate',
    iconBg: 'bg-red-600',
    iconColor: 'text-white'
  },
  'short-term': {
    gradient: 'from-amber-50/80 via-yellow-50/80 to-amber-50/80',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'This Week',
    iconBg: 'bg-amber-600',
    iconColor: 'text-white'
  },
  'long-term': {
    gradient: 'from-blue-50/80 via-cyan-50/80 to-blue-50/80',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'Long-term',
    iconBg: 'bg-blue-600',
    iconColor: 'text-white'
  }
};

const IMPACT_STYLES: Record<ActionImpact, {
  text: string;
  color: string;
}> = {
  high: {
    text: 'High Impact',
    color: 'text-green-700'
  },
  medium: {
    text: 'Medium Impact',
    color: 'text-blue-700'
  },
  low: {
    text: 'Low Impact',
    color: 'text-gray-700'
  }
};

export default function ActionCard({
  icon: Icon,
  title,
  description,
  category,
  impact = 'medium',
  estimatedTime,
  completed = false,
  onAction,
  actionLabel = 'Take Action',
  className
}: ActionCardProps) {
  const styles = CATEGORY_STYLES[category];
  const impactStyle = IMPACT_STYLES[impact];

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        'bg-gradient-to-br relative overflow-hidden',
        styles.gradient,
        styles.border,
        completed && 'opacity-60',
        'group',
        className
      )}
    >
      {/* Completion overlay */}
      {completed && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Completed</span>
          </div>
        </div>
      )}

      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

      <CardContent className="p-5 relative">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'p-3 rounded-xl shadow-sm flex-shrink-0 transition-transform group-hover:scale-110',
            styles.iconBg
          )}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} strokeWidth={2.5} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="text-sm font-bold text-gray-900 leading-tight">
                {title}
              </h4>
              <Badge variant="outline" className={cn('text-xs flex-shrink-0', styles.badge)}>
                {styles.badgeText}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-700 leading-relaxed mb-4">
              {description}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 text-xs">
                {impact && (
                  <span className={cn('font-medium', impactStyle.color)}>
                    {impactStyle.text}
                  </span>
                )}
                {estimatedTime && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{estimatedTime}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Button */}
            {onAction && !completed && (
              <Button
                onClick={onAction}
                size="sm"
                className="w-full group/btn bg-gray-900 hover:bg-gray-800 text-white"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
