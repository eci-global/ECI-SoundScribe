import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { COACHING_GRADIENTS, BADGE_TONES, ICON_MAP } from './coachingTheme';
import type { CoachHeroData } from '@/utils/coachingInsights';
import { cn } from '@/lib/utils';

interface CoachHeroProps {
  data: CoachHeroData;
  supportMode: boolean;
  onToggleMode: () => void;
}

export function CoachHero({ data, supportMode, onToggleMode }: CoachHeroProps) {
  const SparkIcon = ICON_MAP.heroSpark;
  const MomentumIcon = ICON_MAP.heroMomentum;
  const TargetIcon = ICON_MAP.heroTarget;
  const WinsIcon = ICON_MAP.heroWins;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border bg-white text-gray-900 shadow-sm',
        supportMode ? 'border-gray-200' : 'border-red-200',
      )}
    >
      <CardContent className="px-6 py-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-600">
              <SparkIcon className="h-4 w-4" />
              <span>{data.modeLabel}</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{data.title}</h1>
              <p className="max-w-xl text-sm text-gray-600">{data.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <Badge className={supportMode ? BADGE_TONES.personaSupport : BADGE_TONES.persona}>{data.persona}</Badge>
              <span>{data.badgeText}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {data.metrics.map(metric => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{metric.label}</p>
                  <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                  {metric.hint ? <p className="text-xs text-gray-500">{metric.hint}</p> : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {data.momentumMessage ? (
                <span className="inline-flex items-center gap-2 text-red-600">
                  <MomentumIcon className="h-3 w-3" />
                  {data.momentumMessage}
                </span>
              ) : null}
              {data.nextAction ? (
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <TargetIcon className="h-3 w-3" />
                  {data.nextAction}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <WinsIcon className="h-4 w-4 text-emerald-500" />
            <span>Insights update every time a new call finishes coaching.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn('border-gray-300 text-gray-700 hover:bg-gray-100', !supportMode && 'border-red-200 text-red-700 hover:bg-red-50')}
            onClick={onToggleMode}
          >
            {supportMode ? 'Switch to sales view' : 'Switch to support view'}
          </Button>
        </div>
      </CardContent>

      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-10 lg:block',
          supportMode ? COACHING_GRADIENTS.supportHero : COACHING_GRADIENTS.hero,
        )}
      />
    </Card>
  );
}
