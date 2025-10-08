import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/Sparkline';
import type { Recording } from '@/types/recording';
import { EmployeeSummary } from '@/utils/managerAnalytics';
import { subDays, format } from 'date-fns';

interface EmployeeMetricTrendsProps {
  recordings: Recording[];
  employees: EmployeeSummary[];
}

export function EmployeeMetricTrends({ recordings, employees }: EmployeeMetricTrendsProps) {
  const { callVolumeSeries, scoreSeries, riskSeries, labels } = useMemo(() => computeSeries(recordings), [recordings]);

  const topPerformer = useMemo(() => {
    return [...employees]
      .filter(employee => (employee.averageScore ?? 0) > 0)
      .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];
  }, [employees]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <TrendCard
        title="Call volume"
        subtitle="Last 14 days"
        series={callVolumeSeries}
        labels={labels}
        footer={`${callVolumeSeries.reduce((sum, value) => sum + value, 0)} calls total`}
      />
      <TrendCard
        title="Coaching score trend"
        subtitle="Daily average"
        series={scoreSeries}
        labels={labels}
        highlight={topPerformer ? `${topPerformer.employeeName} leads at ${topPerformer.averageScore}` : undefined}
      />
      <TrendCard
        title="High-risk flag"
        subtitle="Calls scoring under 5"
        series={riskSeries}
        labels={labels}
        footer={`${riskSeries[riskSeries.length - 1] ?? 0} yesterday`}
        color="#ef4444"
      />
    </div>
  );
}

interface TrendCardProps {
  title: string;
  subtitle: string;
  series: number[];
  labels: string[];
  footer?: string;
  highlight?: string;
  color?: string;
}

function TrendCard({ title, subtitle, series, labels, footer, highlight, color = '#dc2626' }: TrendCardProps) {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Sparkline data={series.length ? series : [0]} height={60} color={color} />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
        {highlight ? <p className="text-sm font-medium text-gray-700">{highlight}</p> : null}
        {footer ? <p className="text-xs text-gray-500">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}

function computeSeries(recordings: Recording[]) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => subDays(today, 13 - index));

  const callVolumeSeries = days.map(day => {
    const label = format(day, 'yyyy-MM-dd');
    return recordings.filter(recording => recording.created_at.startsWith(label)).length;
  });

  const scoreSeries = days.map(day => {
    const label = format(day, 'yyyy-MM-dd');
    const scores = recordings
      .filter(recording => recording.created_at.startsWith(label))
      .map(recording => {
        const evaluation = recording.coaching_evaluation as any;
        return typeof evaluation?.overallScore === 'number' ? evaluation.overallScore : 0;
      })
      .filter(score => score > 0);
    if (!scores.length) {
      return 0;
    }
    return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
  });

  const riskSeries = days.map(day => {
    const label = format(day, 'yyyy-MM-dd');
    return recordings.filter(recording => recording.created_at.startsWith(label) && (recording.coaching_evaluation as any)?.overallScore < 5).length;
  });

  const labels = days.map(day => format(day, 'MMM d'));

  return { callVolumeSeries, scoreSeries, riskSeries, labels };
}
