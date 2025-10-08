import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SECTION_HEADLINE, SECTION_SUBTEXT, ICON_MAP } from './coachingTheme';
import type { MomentumEntry } from '@/utils/coachingInsights';

interface CoachMomentumTimelineProps {
  items: MomentumEntry[];
}

export function CoachMomentumTimeline({ items }: CoachMomentumTimelineProps) {
  const PositiveIcon = ICON_MAP.heroTrend;
  const NegativeIcon = ICON_MAP.heroFlame;

  return (
    <Card className="h-full rounded-xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className={SECTION_HEADLINE}>Momentum timeline</CardTitle>
        <p className={SECTION_SUBTEXT}>Track recent wins and focus moments surfaced by the coach.</p>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length ? (
          <ul className="space-y-4">
            {items.map(item => {
              const Icon = item.positive ? PositiveIcon : NegativeIcon;
              return (
                <li key={item.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                      item.positive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{item.headline}</p>
                      <span className="text-xs text-gray-500">{item.relativeTime}</span>
                    </div>
                    <p className="text-xs text-gray-600">{item.detail}</p>
                    {item.impact ? <p className="text-xs text-gray-500">{item.impact}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            Momentum data will appear after the coach reviews additional calls.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
