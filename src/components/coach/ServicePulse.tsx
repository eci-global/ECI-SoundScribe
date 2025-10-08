import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SECTION_HEADLINE, SECTION_SUBTEXT, ICON_MAP } from './coachingTheme';
import type { SupportCoachingSummary } from '@/utils/coachingInsights';

interface ServicePulseProps {
  summary: SupportCoachingSummary;
}

export function ServicePulse({ summary }: ServicePulseProps) {
  const ShieldIcon = ICON_MAP.heroReliability;
  const ActivityIcon = ICON_MAP.heroActivity;

  const { aggregatedMetrics } = summary;
  const escalation = aggregatedMetrics.escalationDistribution;
  const totalEscalations = escalation.low + escalation.medium + escalation.high || 1;

  const statCards = [
    {
      label: 'Avg CSAT',
      value: summary.averageSatisfaction ? `${Math.round(summary.averageSatisfaction)}%` : '--',
      hint: 'Across recently coached support calls',
    },
    {
      label: 'First contact resolution',
      value: aggregatedMetrics.avgFCR ? `${aggregatedMetrics.avgFCR}%` : '--',
      hint: 'Resolved on first interaction',
    },
    {
      label: 'Customer effort score',
      value: aggregatedMetrics.avgCES ? `${aggregatedMetrics.avgCES}%` : '--',
      hint: 'Low-effort interactions',
    },
  ];

  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className={SECTION_HEADLINE}>Service pulse</CardTitle>
        <p className={SECTION_SUBTEXT}>Live view of satisfaction health and escalation risk.</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 md:grid-cols-3">
          {statCards.map(stat => (
            <div key={stat.label} className="rounded-lg border border-gray-100 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Escalation breakdown</p>
              <p className="text-xs text-gray-500">Monitor risk levels detected by the coach.</p>
            </div>
            <Badge className="border border-red-200 bg-red-50 text-red-700">{totalEscalations} tracked</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Low: {escalation.low}
            </Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Medium: {escalation.medium}
            </Badge>
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
              High: {escalation.high}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <ShieldIcon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Top service opportunity</p>
              <p className="text-xs text-gray-500">
                {summary.servqualFocus[0]
                  ? `Focus on ${summary.servqualFocus[0].label.toLowerCase()} across ${summary.servqualFocus[0].count} calls.`
                  : 'Run another support session to surface focus areas.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <ActivityIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Support readiness</p>
              <p className="text-xs text-gray-500">
                {summary.practiceOpportunities.length
                  ? `${summary.practiceOpportunities.length} guided scenarios ready for practice.`
                  : 'Queue a guided scenario to help agents rehearse the next call.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

