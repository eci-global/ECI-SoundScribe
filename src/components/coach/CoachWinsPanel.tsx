import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SECTION_HEADLINE, SECTION_SUBTEXT, ICON_MAP } from './coachingTheme';
import type { CoachMode, CoachWinInsight } from '@/utils/coachingInsights';

interface CoachWinsPanelProps {
  wins: CoachWinInsight[];
  mode: CoachMode;
}

export function CoachWinsPanel({ wins, mode }: CoachWinsPanelProps) {
  const HeartIcon = ICON_MAP.heroHeart;
  const ShieldIcon = ICON_MAP.heroReliability;

  const emptyMessage =
    mode === 'sales'
      ? 'Wins will surface as soon as the coach spots positive call moments.'
      : 'Customer delight highlights appear here after your next support analysis.';

  return (
    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className={SECTION_HEADLINE}>Recent wins</CardTitle>
        <p className={SECTION_SUBTEXT}>Celebrate what is working and share it with the team.</p>
      </CardHeader>
      <CardContent className="pt-0">
        {wins.length ? (
          <ul className="space-y-3">
            {wins.map(win => {
              const Icon = mode === 'sales' ? HeartIcon : ShieldIcon;
              return (
                <li key={win.title} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{win.title}</p>
                    <p className="text-xs text-gray-600">{win.detail}</p>
                    {win.meta ? <p className="text-xs text-gray-500">{win.meta}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
