import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export default function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className,
  color = 'blue'
}: MetricCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80',
      icon: 'text-blue-600',
      border: 'border-blue-200/50',
      hover: 'hover:shadow-blue-500/20'
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80',
      icon: 'text-emerald-600',
      border: 'border-emerald-200/50',
      hover: 'hover:shadow-emerald-500/20'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/80',
      icon: 'text-purple-600',
      border: 'border-purple-200/50',
      hover: 'hover:shadow-purple-500/20'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/80',
      icon: 'text-orange-600',
      border: 'border-orange-200/50',
      hover: 'hover:shadow-orange-500/20'
    }
  };

  const colors = colorClasses[color];

  return (
    <Card 
      className={cn(
        'relative overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group',
        colors.bg,
        colors.border,
        colors.hover,
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline space-x-3">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                {value}
              </p>
              {trend && (
                <div className={cn(
                  'flex items-center text-sm font-medium',
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                )}>
                  <span className="text-xs mr-1">
                    {trend.isPositive ? '↗' : '↘'}
                  </span>
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          <div className={cn(
            'p-3 rounded-xl transition-all duration-300 group-hover:scale-110',
            colors.bg,
            'border',
            colors.border
          )}>
            <Icon className={cn('w-6 h-6', colors.icon)} strokeWidth={2} />
          </div>
        </div>
        
        {/* Subtle background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 -rotate-12 translate-x-8 -translate-y-8">
          <Icon className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}