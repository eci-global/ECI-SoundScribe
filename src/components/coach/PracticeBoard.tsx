import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRACTICE_PRIORITY_TONES, SECTION_HEADLINE } from './coachingTheme';
import type { CoachMode, CoachPracticePreview } from '@/utils/coachingInsights';
import { PlayCircle, TrendingUp } from 'lucide-react';

interface PracticeBoardProps {
  items: CoachPracticePreview[];
  mode: CoachMode;
  onSelect: (preview: CoachPracticePreview) => void;
}

export function PracticeBoard({ items, mode, onSelect }: PracticeBoardProps) {
  return (
    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className={`${SECTION_HEADLINE} flex items-center gap-2 text-gray-900`}>
          <PlayCircle className="h-5 w-5 text-red-500" />
          Practice queue
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length ? (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-red-200 hover:bg-white"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge className={PRACTICE_PRIORITY_TONES[item.priority]}>Priority: {item.priority}</Badge>
                      <span>{item.meta}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600">{item.highlight}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {item.statLabel && item.statValue ? (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          {item.statLabel}: {item.statValue}
                        </span>
                      ) : null}
                      {item.secondary ? <span>{item.secondary}</span> : null}
                      {item.supportingMetrics?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                          {item.supportingMetrics
                            .map(metric => `${metric.label}: ${metric.value}${metric.unit ?? ''}`)
                            .join(' | ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button size="sm" className="self-start md:self-auto" onClick={() => onSelect(item)}>
                    Start practice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            {mode === 'sales'
              ? 'No open practice sessions. Select a recommendation to generate a guided rehearsal.'
              : 'Queue is clear. Choose a support recommendation to build a new practice block.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
