import type { CoachingEvaluation } from '@/types/coaching';
import { formatDistanceToNow } from 'date-fns';
import type { Recording } from '@/types/recording';
import {
  getAINextSteps,
  getCoachingActionItems,
  getCoachingImprovements,
  getCoachingScore,
  getCoachingStrengths,
} from '@/types/recording';
import {
  analyzeAllSupportSignals,
  aggregateSupportMetrics,
  type SupportSignalAnalysis,
} from '@/utils/supportSignals';

export type TrendDirection = 'improving' | 'declining' | 'stable';

export interface TrendInsight {
  direction: TrendDirection;
  delta: number;
}

export interface StrengthInsight {
  label: string;
  count: number;
  recordingIds: string[];
}

export interface SalesPracticeOpportunity {
  recordingId: string;
  title: string;
  createdAt: string;
  score?: number;
  focusAreas: string[];
  actionItems: string[];
  strengths: string[];
  framework?: string;
}

export interface FrameworkPerformance {
  framework: string;
  averageScore: number;
  callCount: number;
  recordingIds: string[];
}

export interface SalesCoachingSummary {
  totalRecordings: number;
  analyzedCount: number;
  averageScore: number;
  trend: TrendInsight;
  topStrengths: StrengthInsight[];
  topImprovements: StrengthInsight[];
  frameworkPerformance: FrameworkPerformance[];
  recentWins: SalesPracticeOpportunity[];
  practiceOpportunities: SalesPracticeOpportunity[];
}

export interface SupportPracticeOpportunity {
  recordingId: string;
  title: string;
  createdAt: string;
  satisfaction: number;
  escalationRisk: 'low' | 'medium' | 'high';
  focusAreas: string[];
  recommendedActions: string[];
}

export interface SupportCoachingSummary {
  totalRecordings: number;
  supportEligibleCount: number;
  averageSatisfaction: number;
  trend: TrendInsight;
  servqualFocus: StrengthInsight[];
  escalationBreakdown: {
    low: number;
    medium: number;
    high: number;
  };
  aggregatedMetrics: ReturnType<typeof aggregateSupportMetrics>;
  analysesByRecording: Record<string, SupportSignalAnalysis>;
  practiceOpportunities: SupportPracticeOpportunity[];
}

interface EvaluationEntry {
  recording: Recording;
  evaluation: CoachingEvaluation;
}

function parseCoachingEvaluation(recording: Recording): CoachingEvaluation | null {
  if (!recording?.coaching_evaluation) {
    return null;
  }

  const raw = recording.coaching_evaluation;

  try {
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      return normalizeEvaluation(parsed as CoachingEvaluation);
    }

    if (typeof raw === 'object') {
      return normalizeEvaluation(raw as CoachingEvaluation);
    }
  } catch (error) {
    console.warn('Failed to parse coaching evaluation for recording', recording.id, error);
  }

  return null;
}

function normalizeEvaluation(evaluation: CoachingEvaluation | null | undefined): CoachingEvaluation | null {
  if (!evaluation || typeof evaluation !== 'object') {
    return null;
  }

  const overallScore = typeof evaluation.overallScore === 'number' ? evaluation.overallScore : Number(evaluation.overallScore);

  if (Number.isNaN(overallScore)) {
    return null;
  }

  return {
    ...evaluation,
    overallScore,
    strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
    improvements: Array.isArray(evaluation.improvements) ? evaluation.improvements : [],
    actionItems: Array.isArray(evaluation.actionItems) ? evaluation.actionItems : [],
  };
}

function buildStrengthMap(entries: EvaluationEntry[], extractor: (evaluation: CoachingEvaluation, recording: Recording) => string[]): Map<string, StrengthInsight> {
  const map = new Map<string, StrengthInsight>();

  entries.forEach(({ evaluation, recording }) => {
    const labels = extractor(evaluation, recording)
      .map(label => label?.trim())
      .filter((label): label is string => Boolean(label));

    labels.forEach(label => {
      const existing = map.get(label);
      if (existing) {
        existing.count += 1;
        if (!existing.recordingIds.includes(recording.id)) {
          existing.recordingIds.push(recording.id);
        }
      } else {
        map.set(label, {
          label,
          count: 1,
          recordingIds: [recording.id],
        });
      }
    });
  });

  return map;
}

function calculateTrend(scalarValues: number[]): TrendInsight {
  if (scalarValues.length < 2) {
    return { direction: 'stable', delta: 0 };
  }

  const midpoint = Math.min(5, Math.floor(scalarValues.length / 2));
  const recent = average(scalarValues.slice(0, midpoint));
  const previous = average(scalarValues.slice(midpoint, midpoint * 2));

  if (!previous) {
    return { direction: 'stable', delta: 0 };
  }

  const delta = Number((recent - previous).toFixed(1));

  if (delta > 0.3) {
    return { direction: 'improving', delta };
  }
  if (delta < -0.3) {
    return { direction: 'declining', delta };
  }
  return { direction: 'stable', delta };
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function selectTopInsights(map: Map<string, StrengthInsight>, limit = 5): StrengthInsight[] {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function selectOpportunities(entries: EvaluationEntry[]): SalesPracticeOpportunity[] {
  return entries
    .map(({ evaluation, recording }): SalesPracticeOpportunity => {
      const score = evaluation.overallScore;
      const improvements = getCoachingImprovements(recording);
      const focusAreas = improvements.length ? improvements : extractLowestCriteria(evaluation);
      const actionItems = getCoachingActionItems(recording);
      const strengths = getCoachingStrengths(recording);
      const framework = (recording as Record<string, unknown>).primary_framework as string | undefined;

      return {
        recordingId: recording.id,
        title: recording.title,
        createdAt: recording.created_at,
        score: Number.isFinite(score) ? Number(score.toFixed(1)) : undefined,
        focusAreas,
        actionItems,
        strengths,
        framework,
      };
    })
    .sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreA === scoreB) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return scoreA - scoreB;
    });
}

function extractLowestCriteria(evaluation: CoachingEvaluation): string[] {
  const { criteria } = evaluation;
  if (!criteria) {
    return [];
  }

  if (Array.isArray(criteria)) {
    const sorted = [...criteria]
      .filter(item => typeof item?.score === 'number')
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

    return sorted.slice(0, 3).map(item => item.name).filter(Boolean);
  }

  const lowScoringEntries = Object.entries(criteria as Record<string, number>)
    .filter(([, score]) => typeof score === 'number')
    .sort(([, a], [, b]) => (a ?? 0) - (b ?? 0))
    .slice(0, 3)
    .map(([name]) => name.replace(/[A-Z]/g, letter => ` ${letter}`).trim());

  return lowScoringEntries;
}

function collectFrameworkPerformance(entries: EvaluationEntry[]): FrameworkPerformance[] {
  const frameworkMap = new Map<string, { totalScore: number; count: number; recordingIds: string[] }>();

  entries.forEach(({ evaluation, recording }) => {
    const framework = (recording as Record<string, unknown>).primary_framework as string | undefined;
    if (!framework) {
      return;
    }

    const existing = frameworkMap.get(framework) ?? { totalScore: 0, count: 0, recordingIds: [] };
    existing.totalScore += evaluation.overallScore ?? 0;
    existing.count += 1;
    if (!existing.recordingIds.includes(recording.id)) {
      existing.recordingIds.push(recording.id);
    }
    frameworkMap.set(framework, existing);
  });

  return Array.from(frameworkMap.entries())
    .map(([framework, { totalScore, count, recordingIds }]) => ({
      framework,
      callCount: count,
      recordingIds,
      averageScore: count ? Number((totalScore / count).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore);
}

export function buildSalesCoachingSummary(recordings: Recording[]): SalesCoachingSummary {
  const evaluationEntries: EvaluationEntry[] = recordings
    .map(recording => ({ recording, evaluation: parseCoachingEvaluation(recording) }))
    .filter((entry): entry is EvaluationEntry => Boolean(entry.evaluation));

  const sortedByCreated = [...evaluationEntries].sort((a, b) => {
    const dateA = new Date(a.recording.created_at).getTime();
    const dateB = new Date(b.recording.created_at).getTime();
    return dateB - dateA;
  });

  const scores = sortedByCreated
    .map(entry => entry.evaluation.overallScore ?? getCoachingScore(entry.recording))
    .filter((score): score is number => typeof score === 'number');

  const averageScore = average(scores);
  const trend = calculateTrend(scores);

  const strengthsMap = buildStrengthMap(sortedByCreated, evaluation => evaluation.strengths || []);
  const improvementsMap = buildStrengthMap(sortedByCreated, evaluation => evaluation.improvements || []);

  const practiceOpportunities = selectOpportunities(sortedByCreated);
  const recentWins = [...practiceOpportunities]
    .filter(item => (item.score ?? 0) >= averageScore)
    .slice(0, 5);

  const frameworkPerformance = collectFrameworkPerformance(sortedByCreated);

  return {
    totalRecordings: recordings.length,
    analyzedCount: evaluationEntries.length,
    averageScore,
    trend,
    topStrengths: selectTopInsights(strengthsMap),
    topImprovements: selectTopInsights(improvementsMap),
    frameworkPerformance,
    recentWins,
    practiceOpportunities,
  };
}

function ensureSupportAnalysis(recording: Recording): SupportSignalAnalysis {
  if (recording.support_analysis) {
    if (typeof recording.support_analysis === 'string') {
      try {
        const parsed = JSON.parse(recording.support_analysis);
        return parsed as SupportSignalAnalysis;
      } catch (error) {
        console.warn('Failed to parse support_analysis for recording', recording.id, error);
      }
    } else if (typeof recording.support_analysis === 'object') {
      return recording.support_analysis as SupportSignalAnalysis;
    }
  }

  return analyzeAllSupportSignals(recording);
}

function buildServqualFocus(analyses: Record<string, SupportSignalAnalysis>): StrengthInsight[] {
  const dimensionTotals = new Map<string, StrengthInsight>();

  Object.entries(analyses).forEach(([recordingId, analysis]) => {
    const servqualMetrics = analysis.servqualMetrics;
    if (!servqualMetrics) {
      return;
    }

    Object.entries(servqualMetrics).forEach(([dimension, score]) => {
      const formattedLabel = dimension.charAt(0).toUpperCase() + dimension.slice(1);
      const insight = dimensionTotals.get(formattedLabel) ?? {
        label: formattedLabel,
        count: 0,
        recordingIds: [],
      };

      if (score < 80) {
        insight.count += 1;
        if (!insight.recordingIds.includes(recordingId)) {
          insight.recordingIds.push(recordingId);
        }
        dimensionTotals.set(formattedLabel, insight);
      }
    });
  });

  return selectTopInsights(dimensionTotals, 5);
}

function buildSupportPracticeOpportunities(eligibleRecordings: Recording[], analysesByRecording: Record<string, SupportSignalAnalysis>): SupportPracticeOpportunity[] {
  return eligibleRecordings
    .map(recording => {
      const analysis = analysesByRecording[recording.id];
      const focusAreas: string[] = [];
      const recommendedActions: string[] = [];

      if (!analysis) {
        return null;
      }

      const { customerSatisfaction, escalationRisk, servqualMetrics, performanceMetrics, qualityMetrics } = analysis;

      if (customerSatisfaction < 75) {
        focusAreas.push('Customer Satisfaction');
        recommendedActions.push('Reinforce empathy and confirm resolution before closing.');
      }

      if (performanceMetrics?.firstContactResolution < 80) {
        focusAreas.push('First Contact Resolution');
        recommendedActions.push('Clarify root cause early and document resolution steps.');
      }

      if (qualityMetrics?.deEscalationTechniques < 75) {
        focusAreas.push('De-escalation Techniques');
        recommendedActions.push('Apply acknowledgement + solution framing to lower escalation risk.');
      }

      Object.entries(servqualMetrics || {}).forEach(([dimension, value]) => {
        if (value < 75 && focusAreas.length < 4) {
          const label = dimension.charAt(0).toUpperCase() + dimension.slice(1);
          if (!focusAreas.includes(label)) {
            focusAreas.push(label);
            recommendedActions.push(`Improve ${label.toLowerCase()} score through targeted coaching.`);
          }
        }
      });

      if (!focusAreas.length) {
        focusAreas.push('Maintain Excellence');
        recommendedActions.push('Share best practices with the team and keep refining call structure.');
      }

      return {
        recordingId: recording.id,
        title: recording.title,
        createdAt: recording.created_at,
        satisfaction: customerSatisfaction,
        escalationRisk,
        focusAreas,
        recommendedActions,
      } as SupportPracticeOpportunity;
    })
    .filter((item): item is SupportPracticeOpportunity => Boolean(item))
    .sort((a, b) => a.satisfaction - b.satisfaction || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function buildSupportCoachingSummary(recordings: Recording[]): SupportCoachingSummary {
  const supportRecordings = recordings.filter(recording => recording.status === 'completed' && (recording.support_analysis || recording.transcript));
  const sortedSupportRecordings = [...supportRecordings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const analysesByRecording: Record<string, SupportSignalAnalysis> = {};
  sortedSupportRecordings.forEach(recording => {
    analysesByRecording[recording.id] = ensureSupportAnalysis(recording);
  });

  const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
  const satisfactionScores = sortedSupportRecordings
    .map(recording => analysesByRecording[recording.id]?.customerSatisfaction)
    .filter((score): score is number => typeof score === 'number');

  const averageSatisfaction = average(satisfactionScores);
  const trend = calculateTrend(satisfactionScores);
  const servqualFocus = buildServqualFocus(analysesByRecording);
  const practiceOpportunities = buildSupportPracticeOpportunities(sortedSupportRecordings, analysesByRecording).slice(0, 10);

  return {
    totalRecordings: recordings.length,
    supportEligibleCount: supportRecordings.length,
    averageSatisfaction,
    trend,
    servqualFocus,
    escalationBreakdown: aggregatedMetrics.escalationDistribution,
    aggregatedMetrics,
    analysesByRecording,
    practiceOpportunities,
  };
}

export function buildSalesPracticeDeck(summary: SalesCoachingSummary, limit = 5): SalesPracticeOpportunity[] {
  const nextSteps = summary.practiceOpportunities.filter(item => (item.score ?? 0) < summary.averageScore - 0.5);
  if (nextSteps.length >= limit) {
    return nextSteps.slice(0, limit);
  }

  const additional = summary.practiceOpportunities.filter(item => !nextSteps.includes(item));
  return [...nextSteps, ...additional].slice(0, limit);
}

export function extractPracticeActions(recording: Recording): string[] {
  const explicitSteps = getCoachingActionItems(recording);
  if (explicitSteps.length) {
    return explicitSteps;
  }

  const nextSteps = getAINextSteps(recording);
  if (nextSteps.length) {
    return nextSteps;
  }

  const improvements = getCoachingImprovements(recording);
  if (improvements.length) {
    return improvements.map(item => `Work on: ${item}`);
  }

  return ['Review this call and document key learnings.'];
}
export type CoachMode = 'sales' | 'support';

export type RecordingMap = Map<string, Recording>;

export interface HeroMetric {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
  positive?: boolean;
}

export interface CoachHeroData {
  modeLabel: string;
  title: string;
  subtitle: string;
  persona: string;
  badgeText: string;
  metrics: HeroMetric[];
  momentumMessage?: string;
  nextAction?: string;
}

export interface FocusChip {
  label: string;
  detail?: string;
}

export interface CoachPracticePreview {
  id: string;
  recordingId: string;
  title: string;
  highlight: string;
  meta: string;
  statLabel?: string;
  statValue?: string;
  secondary?: string;
  priority: 'high' | 'medium' | 'low';
  mode: CoachMode;
  focusAreas: string[];
  actionItems: string[];
  strengths: string[];
  createdAt?: string;
  supportingMetrics?: Array<{ label: string; value: number | string; unit?: string }>;
}

export interface CoachWinInsight {
  title: string;
  detail: string;
  meta?: string;
}

export interface MomentumEntry {
  id: string;
  headline: string;
  detail: string;
  relativeTime: string;
  positive: boolean;
  impact?: string;
}

export interface CoachUiModel {
  hero: CoachHeroData;
  focus: FocusChip[];
  practice: CoachPracticePreview[];
  wins: CoachWinInsight[];
  momentum: MomentumEntry[];
  mode: CoachMode;
}

function safeFormatDistance(input?: string): string {
  if (!input) {
    return 'Just now';
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Failed to format distance for', input, error);
    return 'Just now';
  }
}

function deriveSalesPersona(score: number): { persona: string; title: string; subtitle: string } {
  if (score >= 8.5) {
    return {
      persona: 'Momentum Closer',
      title: 'Pipeline momentum is trending up',
      subtitle: 'You are finishing calls with confident next steps. Keep reinforcing the consistency that is working.',
    };
  }

  if (score >= 6.5) {
    return {
      persona: 'Conversation Architect',
      title: 'Structure is taking shape',
      subtitle: 'Discovery is resonating - refine follow-through to convert momentum into commitments.',
    };
  }

  return {
    persona: 'Momentum Builder',
    title: 'Lock in your talk track rhythm',
    subtitle: 'Targeted practice will boost confidence and help you guide prospects toward clear next steps.',
  };
}

function trendMessage(trend: TrendInsight, focusLabel?: string): { momentum: string; action?: string } {
  if (trend.direction === 'improving') {
    return {
      momentum: 'Momentum is climbing week over week - capture the edge with a quick rehearsal.',
      action: focusLabel ? `Double down on ${focusLabel} to extend the streak.` : undefined,
    };
  }

  if (trend.direction === 'declining') {
    return {
      momentum: 'Scores dipped on recent calls - schedule a practice rep to rebound quickly.',
      action: focusLabel ? `Start with ${focusLabel} to get back on track.` : undefined,
    };
  }

  return {
    momentum: 'Performance is steady. Pick one focus area to nudge momentum upward.',
    action: focusLabel ? `Try a focused drill on ${focusLabel} next.` : undefined,
  };
}

function buildSalesHero(summary: SalesCoachingSummary): CoachHeroData {
  const personaDetails = deriveSalesPersona(summary.averageScore || 0);
  const focusLabel = summary.topImprovements[0]?.label;
  const trend = trendMessage(summary.trend, focusLabel);

  const metrics: HeroMetric[] = [
    {
      label: 'Avg score',
      value: summary.analyzedCount ? `${summary.averageScore.toFixed(1)} / 10` : ' - ',
      trend: summary.trend.delta,
      positive: summary.trend.direction === 'improving',
      hint: `${summary.analyzedCount} coached of ${summary.totalRecordings} total recordings`,
    },
    {
      label: 'Top strength',
      value: summary.topStrengths[0]?.label ?? 'TBD',
      hint: summary.topStrengths[0]?.count ? `Appears in ${summary.topStrengths[0].count} calls` : undefined,
    },
    {
      label: 'Growth lane',
      value: focusLabel ?? 'Select focus',
      hint: summary.practiceOpportunities.length
        ? `${summary.practiceOpportunities.length} practice reps queued`
        : 'Queue a practice session to get started',
    },
  ];

  return {
    modeLabel: 'Sales coaching overview',
    title: personaDetails.title,
    subtitle: summary.analyzedCount
      ? personaDetails.subtitle
      : 'Upload a call and run coaching to unlock guided practice plans tailored to your motion.',
    persona: personaDetails.persona,
    badgeText: summary.analyzedCount
      ? `${summary.analyzedCount} recent calls analyzed`
      : 'Awaiting first coached call',
    metrics,
    momentumMessage: trend.momentum,
    nextAction: trend.action,
  };
}

function buildSupportHero(summary: SupportCoachingSummary): CoachHeroData {
  const score = summary.averageSatisfaction || 0;
  const persona = score >= 90 ? 'Customer Delight Leader' : score >= 80 ? 'Resolution Strategist' : 'Experience Stabilizer';
  const title = score >= 90
    ? 'Customers feel the premium experience'
    : score >= 80
      ? 'Resolution quality is trending solid'
      : 'Let’s stabilize escalations and lift satisfaction';
  const subtitle = summary.supportEligibleCount
    ? 'AI coach analyzed your latest support interactions and surfaced service commitments to protect.'
    : 'Run support coaching on your next call to uncover sentiment and service opportunities.';
  const focusLabel = summary.practiceOpportunities[0]?.focusAreas[0] ?? summary.servqualFocus[0]?.label;
  const trend = trendMessage(summary.trend, focusLabel);

  const metrics: HeroMetric[] = [
    {
      label: 'Avg CSAT',
      value: summary.supportEligibleCount ? `${Math.round(score)}%` : ' - ',
      trend: summary.trend.delta,
      positive: summary.trend.direction === 'improving',
      hint: `${summary.supportEligibleCount} of ${summary.totalRecordings} calls had support signals`,
    },
    {
      label: 'FCR rate',
      value: `${summary.aggregatedMetrics.avgFCR || 0}%`,
      hint: 'First contact resolution across coached calls',
    },
    {
      label: 'Escalation risk',
      value: summary.aggregatedMetrics.escalationDistribution.high
        ? `${summary.aggregatedMetrics.escalationDistribution.high} high-risk`
        : 'Under control',
      hint: 'High-risk calls in the last review window',
    },
  ];

  return {
    modeLabel: 'Support coaching overview',
    title,
    subtitle,
    persona,
    badgeText: summary.supportEligibleCount
      ? `${summary.supportEligibleCount} support calls analyzed`
      : 'Awaiting first coached support call',
    metrics,
    momentumMessage: trend.momentum,
    nextAction: trend.action,
  };
}

function buildSalesFocusChips(summary: SalesCoachingSummary): FocusChip[] {
  const chips: FocusChip[] = [];

  if (summary.topStrengths[0]) {
    chips.push({
      label: `Strength - ${summary.topStrengths[0].label}`,
      detail: `${summary.topStrengths[0].count} calls`,
    });
  }

  if (summary.topImprovements[0]) {
    chips.push({
      label: `Focus - ${summary.topImprovements[0].label}`,
      detail: `${summary.topImprovements[0].count} calls flagged`,
    });
  }

  if (summary.frameworkPerformance[0]) {
    const framework = summary.frameworkPerformance[0];
    chips.push({
      label: `${framework.framework} framework`,
      detail: `${framework.averageScore.toFixed(1)}/10 avg`,
    });
  }

  chips.push({
    label: 'Practice queue',
    detail: summary.practiceOpportunities.length ? `${summary.practiceOpportunities.length} reps queued` : 'Queue your next rep',
  });

  return chips.slice(0, 4);
}

function buildSupportFocusChips(summary: SupportCoachingSummary): FocusChip[] {
  const chips: FocusChip[] = [];

  if (summary.servqualFocus[0]) {
    chips.push({
      label: `Service gap - ${summary.servqualFocus[0].label}`,
      detail: `${summary.servqualFocus[0].count} calls`,
    });
  }

  const metrics = summary.aggregatedMetrics;
  if (metrics.avgFCR) {
    chips.push({
      label: 'FCR',
      detail: `${metrics.avgFCR}% first-contact resolution`,
    });
  }

  if (metrics.avgCES) {
    chips.push({
      label: 'Customer effort',
      detail: `${metrics.avgCES}% low effort score`,
    });
  }

  chips.push({
    label: 'Practice queue',
    detail: summary.practiceOpportunities.length ? `${summary.practiceOpportunities.length} focus reps` : 'Queue your first scenario',
  });

  return chips.slice(0, 4);
}

function deriveSalesPriority(score: number | undefined, average: number): 'high' | 'medium' | 'low' {
  if (typeof score !== 'number') {
    return 'medium';
  }

  if (score < Math.max(average - 1.2, 6)) {
    return 'high';
  }

  if (score < average) {
    return 'medium';
  }

  return 'low';
}

function createSalesPracticePreview(
  opportunity: SalesPracticeOpportunity,
  summary: SalesCoachingSummary,
  recordingMap: RecordingMap,
): CoachPracticePreview | null {
  const recording = recordingMap.get(opportunity.recordingId);
  const focusAreas = opportunity.focusAreas?.length ? opportunity.focusAreas : recording ? getCoachingImprovements(recording) : [];
  const primaryFocus = focusAreas[0] ?? 'Momentum building';
  const strengths = opportunity.strengths?.length
    ? opportunity.strengths
    : recording
      ? getCoachingStrengths(recording)
      : [];
  const actionItems = opportunity.actionItems?.length
    ? opportunity.actionItems
    : recording
      ? extractPracticeActions(recording)
      : [];
  const statValue = typeof opportunity.score === 'number' ? `${opportunity.score.toFixed(1)}/10` : undefined;

  return {
    id: `${opportunity.recordingId}-sales` ,
    recordingId: opportunity.recordingId,
    title: opportunity.title || recording?.title || 'Coaching opportunity',
    highlight: `Sharpen ${primaryFocus.toLowerCase()} on upcoming calls.`,
    meta: safeFormatDistance(opportunity.createdAt),
    statLabel: statValue ? 'Current score' : undefined,
    statValue,
    secondary: opportunity.framework ? `${opportunity.framework} framework` : undefined,
    priority: deriveSalesPriority(opportunity.score, summary.averageScore),
    mode: 'sales',
    focusAreas: focusAreas.length ? focusAreas : ['Call momentum'],
    actionItems,
    strengths,
    createdAt: opportunity.createdAt,
    supportingMetrics: statValue
      ? [{ label: 'Call score', value: opportunity.score ?? 0, unit: '/10' }]
      : undefined,
  };
}

function createSupportPracticePreview(
  opportunity: SupportPracticeOpportunity,
  summary: SupportCoachingSummary,
  recordingMap: RecordingMap,
): CoachPracticePreview | null {
  const recording = recordingMap.get(opportunity.recordingId);
  const focusAreas = opportunity.focusAreas?.length ? opportunity.focusAreas : ['Customer experience'];
  const actionItems = opportunity.recommendedActions?.length
    ? opportunity.recommendedActions
    : recording
      ? extractPracticeActions(recording)
      : [];
  const strengths = recording ? getCoachingStrengths(recording) : [];
  const satisfaction = typeof opportunity.satisfaction === 'number' ? `${Math.round(opportunity.satisfaction)}%` : undefined;
  const priority: 'high' | 'medium' | 'low' = opportunity.escalationRisk === 'high'
    ? 'high'
    : opportunity.escalationRisk === 'medium' || (opportunity.satisfaction && opportunity.satisfaction < summary.averageSatisfaction)
      ? 'medium'
      : 'low';

  return {
    id: `${opportunity.recordingId}-support`,
    recordingId: opportunity.recordingId,
    title: opportunity.title || recording?.title || 'Support scenario',
    highlight: actionItems[0] ?? `Strengthen ${focusAreas[0]} this week.`,
    meta: safeFormatDistance(opportunity.createdAt),
    statLabel: satisfaction ? 'Customer satisfaction' : undefined,
    statValue: satisfaction,
    secondary: `Escalation risk: ${opportunity.escalationRisk}`,
    priority,
    mode: 'support',
    focusAreas,
    actionItems,
    strengths,
    createdAt: opportunity.createdAt,
    supportingMetrics: satisfaction
      ? [{ label: 'Satisfaction', value: opportunity.satisfaction ?? 0, unit: '%' }]
      : undefined,
  };
}

function collectSalesWinInsights(summary: SalesCoachingSummary): CoachWinInsight[] {
  const wins: CoachWinInsight[] = summary.recentWins.map(win => ({
    title: `Win - ${win.title || 'Momentum gain'}`,
    detail: win.focusAreas[0] ? `Strengthened ${win.focusAreas[0].toLowerCase()}` : 'Positive call outcome logged.',
    meta: safeFormatDistance(win.createdAt),
  }));

  if (!wins.length && summary.topStrengths.length) {
    summary.topStrengths.slice(0, 3).forEach(strength => {
      wins.push({
        title: `Strength - ${strength.label}`,
        detail: `Appears in ${strength.count} calls - capture and scale the pattern.`,
      });
    });
  }

  return wins.slice(0, 4);
}

function collectSupportWinInsights(summary: SupportCoachingSummary): CoachWinInsight[] {
  const wins: CoachWinInsight[] = [];
  const metrics = summary.aggregatedMetrics;

  if (metrics.avgSatisfaction) {
    wins.push({
      title: 'Customer sentiment',
      detail: 'CSAT holding strong across recent calls.',
      meta: `${metrics.avgSatisfaction}% average satisfaction`,
    });
  }

  const highServqual = Object.entries(metrics.servqualAverages)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 2);

  highServqual.forEach(([dimension, value]) => {
    if (!value) {
      return;
    }
    wins.push({
      title: `Servqual - ${dimension.charAt(0).toUpperCase()}${dimension.slice(1)}`,
      detail: `Team scoring ${value}% on ${dimension}.`,
    });
  });

  if (metrics.qualityMetrics.communication) {
    wins.push({
      title: 'Communication excellence',
      detail: 'Agent communication quality remains a standout strength.',
      meta: `${metrics.qualityMetrics.communication}% quality score`,
    });
  }

  if (!wins.length && summary.practiceOpportunities.length === 0) {
    wins.push({
      title: 'First support insight pending',
      detail: 'Run support analysis on your next call to populate wins and momentum cues.',
    });
  }

  return wins.slice(0, 4);
}

function buildSalesMomentumTimeline(summary: SalesCoachingSummary): MomentumEntry[] {
  const entries: Array<{ data: MomentumEntry; sortValue: number }> = [];

  summary.recentWins.forEach(win => {
    const timestamp = new Date(win.createdAt).getTime();
    entries.push({
      sortValue: Number.isNaN(timestamp) ? 0 : timestamp,
      data: {
        id: `${win.recordingId}-win`,
        headline: win.title ? `Win: ${win.title}` : 'Win logged',
        detail: win.focusAreas[0]
          ? `Scaled ${win.focusAreas[0].toLowerCase()} across recent calls.`
          : 'Positive customer momentum captured.',
        relativeTime: safeFormatDistance(win.createdAt),
        positive: true,
        impact: win.strengths?.[0] ?? win.framework ?? undefined,
      },
    });
  });

  summary.practiceOpportunities.forEach(opportunity => {
    const timestamp = new Date(opportunity.createdAt).getTime();
    entries.push({
      sortValue: Number.isNaN(timestamp) ? 0 : timestamp,
      data: {
        id: `${opportunity.recordingId}-focus`,
        headline: opportunity.title ? `Focus: ${opportunity.title}` : 'Practice opportunity identified',
        detail: opportunity.focusAreas[0]
          ? `Boost ${opportunity.focusAreas[0].toLowerCase()} before the next call.`
          : 'Schedule a guided rehearsal to address this opportunity.',
        relativeTime: safeFormatDistance(opportunity.createdAt),
        positive: false,
        impact: typeof opportunity.score === 'number' ? `${opportunity.score.toFixed(1)}/10` : undefined,
      },
    });
  });

  return entries
    .sort((a, b) => b.sortValue - a.sortValue)
    .map(item => item.data)
    .slice(0, 6);
}

function buildSupportMomentumTimeline(summary: SupportCoachingSummary): MomentumEntry[] {
  const entries: Array<{ data: MomentumEntry; sortValue: number }> = [];

  summary.practiceOpportunities.forEach(opportunity => {
    const timestamp = new Date(opportunity.createdAt).getTime();
    const positive = opportunity.satisfaction >= summary.averageSatisfaction && opportunity.escalationRisk === 'low';
    entries.push({
      sortValue: Number.isNaN(timestamp) ? 0 : timestamp,
      data: {
        id: `${opportunity.recordingId}-${positive ? 'delight' : 'focus'}`,
        headline: positive ? `Delight: ${opportunity.title}` : `Focus: ${opportunity.title}`,
        detail: opportunity.focusAreas[0]
          ? `${positive ? 'Sustain' : 'Lift'} ${opportunity.focusAreas[0].toLowerCase()} on upcoming interactions.`
          : positive
            ? 'Customer sentiment surged - capture the playbook.'
            : 'Queued for guided support practice.',
        relativeTime: safeFormatDistance(opportunity.createdAt),
        positive,
        impact: `${Math.round(opportunity.satisfaction)}% CSAT - ${opportunity.escalationRisk} risk`,
      },
    });
  });

  return entries
    .sort((a, b) => b.sortValue - a.sortValue)
    .map(item => item.data)
    .slice(0, 6);
}

export function buildSalesUiModel(summary: SalesCoachingSummary, recordingMap: RecordingMap): CoachUiModel {
  return {
    hero: buildSalesHero(summary),
    focus: buildSalesFocusChips(summary),
    practice: summary.practiceOpportunities
      .map(item => createSalesPracticePreview(item, summary, recordingMap))
      .filter((item): item is CoachPracticePreview => Boolean(item))
      .slice(0, 5),
    wins: collectSalesWinInsights(summary),
    momentum: buildSalesMomentumTimeline(summary),
    mode: 'sales',
  };
}

export function buildSupportUiModel(summary: SupportCoachingSummary, recordingMap: RecordingMap): CoachUiModel {
  return {
    hero: buildSupportHero(summary),
    focus: buildSupportFocusChips(summary),
    practice: summary.practiceOpportunities
      .map(item => createSupportPracticePreview(item, summary, recordingMap))
      .filter((item): item is CoachPracticePreview => Boolean(item))
      .slice(0, 5),
    wins: collectSupportWinInsights(summary),
    momentum: buildSupportMomentumTimeline(summary),
    mode: 'support',
  };
}
