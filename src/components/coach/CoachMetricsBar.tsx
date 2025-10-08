import React from 'react';
import { Card } from '@/components/ui/card';
import type { HeroMetric, CoachMode } from '@/utils/coachingInsights';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachMetricsBarProps {
  metrics: HeroMetric[];
  mode: CoachMode;
}

export function CoachMetricsBar({ metrics, mode }: CoachMetricsBarProps) {
  if (!metrics?.length) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => (
        <Card
          key={metric.label}
          className={cn(
            'border bg-white shadow-sm transition-shadow hover:shadow-md',
            metric.positive === false ? 'border-rose-200' : 'border-gray-200',
            mode === 'sales' && metric.positive !== false ? 'border-red-200' : null,
          )}
        >
          <div className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{metric.label}</p>
            <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
            {metric.hint ? <p className="text-xs text-gray-500">{metric.hint}</p> : null}
            {metric.trend !== undefined ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  metric.positive === false ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                <TrendingUp className="h-3 w-3" />
                {metric.trend > 0 ? '+' : ''}
                {metric.trend.toFixed(1)}
              </span>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
