import type { Recording } from '@/types/recording';

export type RecordingMap = Map<string, Recording>;

export type CoachPracticePreview = {
  id: string;
  title: string;
  highlight?: string;
  priority?: 'low' | 'medium' | 'high';
  focusAreas?: string[];
  actionItems?: string[];
  strengths?: string[];
  mode?: 'sales' | 'support';
  supportingMetrics?: Array<{ label: string; value: number | string }>;
  recordingId: string;
};

export type CoachUiModel = {
  mode: 'sales' | 'support';
  hero: {
    title: string;
    subtitle?: string;
    metrics: Array<{ label: string; value: number | string; trend?: 'up' | 'down' | 'flat' }>;
  };
  focus: Array<{ title: string; description?: string }>;
  practice: CoachPracticePreview[];
  momentum: Array<{ date: string; metric: string; value: number }>;
  wins: Array<{ title: string; description?: string; date: string }>; 
};

export function buildSalesCoachingSummary(recordings: Recording[]) {
  return {
    metrics: [
      { label: 'Calls', value: recordings.length },
      { label: 'Avg Score', value: calcAverageScore(recordings).toFixed(1) },
    ],
  };
}

export function buildSupportCoachingSummary(recordings: Recording[]) {
  return {
    metrics: [
      { label: 'Cases', value: recordings.length },
      { label: 'Satisfaction', value: '—' },
    ],
  };
}

export function buildSalesUiModel(summary: any, recordingMap: RecordingMap): CoachUiModel {
  const now = new Date();
  return {
    mode: 'sales',
    hero: {
      title: 'Sales coaching overview',
      metrics: summary.metrics,
    },
    focus: [
      { title: 'Discovery questions' },
      { title: 'Objection handling' },
    ],
    practice: buildPracticeFromRecordings(recordingMap),
    momentum: [{ date: now.toISOString(), metric: 'Calls', value: summary.metrics?.[0]?.value || 0 }],
    wins: [],
  };
}

export function buildSupportUiModel(summary: any, recordingMap: RecordingMap): CoachUiModel {
  const now = new Date();
  return {
    mode: 'support',
    hero: {
      title: 'Support coaching overview',
      metrics: summary.metrics,
    },
    focus: [
      { title: 'Empathy & tone' },
      { title: 'Knowledge depth' },
    ],
    practice: buildPracticeFromRecordings(recordingMap),
    momentum: [{ date: now.toISOString(), metric: 'Cases', value: summary.metrics?.[0]?.value || 0 }],
    wins: [],
  };
}

function buildPracticeFromRecordings(recordingMap: RecordingMap): CoachPracticePreview[] {
  const items: CoachPracticePreview[] = [];
  for (const [id, rec] of recordingMap.entries()) {
    items.push({
      id: `practice-${id}`,
      title: rec.title || 'Practice scenario',
      highlight: rec.description || 'Review key moments and practice improvements.',
      priority: 'medium',
      focusAreas: ['Active listening'],
      actionItems: ['Rehearse opening questions'],
      strengths: [],
      mode: 'sales',
      supportingMetrics: [{ label: 'Duration', value: (rec.duration || 0) + 's' }],
      recordingId: rec.id,
    });
  }
  return items.slice(0, 6);
}

function calcAverageScore(recordings: Recording[]): number {
  const getScore = (r: Recording) => {
    try {
      const { getCoachingScore } = require('@/types/recording');
      return typeof getCoachingScore === 'function' ? getCoachingScore(r) : 0;
    } catch {
      return 0;
    }
  };
  const total = recordings.reduce((s, r) => s + getScore(r), 0);
  return recordings.length > 0 ? total / recordings.length : 0;
}

