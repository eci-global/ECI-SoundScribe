import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Lightbulb, Target, TrendingUp, BarChart3 } from 'lucide-react';
import type { Recording } from '@/types/recording';
import {
  buildSalesCoachingSummary,
  buildSalesPracticeDeck,
  extractPracticeActions,
  type SalesPracticeOpportunity,
} from '@/utils/coachingInsights';
import { getCoachingStrengths } from '@/types/recording';
import type { PracticeSessionPayload } from './PracticeSessionModal';
import { BADGE_TONES, PRACTICE_PRIORITY_TONES, SECTION_HEADLINE, SECTION_SUBTEXT } from './coachingTheme';

interface SmartRecommendationsProps {
  recordings: Recording[];
  onStartPractice?: (payload: PracticeSessionPayload) => void;
}

export function SmartRecommendations({ recordings, onStartPractice }: SmartRecommendationsProps) {
  const summary = useMemo(() => buildSalesCoachingSummary(recordings), [recordings]);
  const practiceDeck = useMemo(() => buildSalesPracticeDeck(summary, 3), [summary]);
  const recordingMap = useMemo(() => new Map(recordings.map(recording => [recording.id, recording])), [recordings]);

  const spotlight = practiceDeck[0];
  const deepPractice = practiceDeck.slice(1);
  const quickWins = summary.recentWins.slice(0, 3);

  const createPracticePayload = (opportunity: SalesPracticeOpportunity): PracticeSessionPayload | null => {
    const recording = recordingMap.get(opportunity.recordingId);
    if (!recording) {
      return null;
    }

    const actionItems = opportunity.actionItems?.length ? opportunity.actionItems : extractPracticeActions(recording);
    const strengths = opportunity.strengths?.length ? opportunity.strengths : getCoachingStrengths(recording);

    return {
      id: `practice-${opportunity.recordingId}`,
      title: opportunity.title || recording.title,
      description: opportunity.focusAreas[0]
        ? `Focus your next rehearsal on ${opportunity.focusAreas[0].toLowerCase()}.`
        : 'Run a guided rehearsal to reinforce this win.',
      priority: (opportunity.score ?? 0) < summary.averageScore - 0.5 ? 'high' : 'medium',
      focusAreas: opportunity.focusAreas,
      estimatedImpact: Math.max(5, Math.round((summary.averageScore || 0) * 1.2)),
      timeToComplete: '15 minutes',
      recommendationType: 'practice_challenge',
      recording,
      actionItems,
      strengths,
      mode: 'sales',
      supportingMetrics: opportunity.framework
        ? [{ label: 'Framework', value: opportunity.framework }]
        : undefined,
    };
  };

  const handlePractice = (opportunity: SalesPracticeOpportunity) => {
    if (!onStartPractice) {
      return;
    }

    const payload = createPracticePayload(opportunity);
    if (!payload) {
      return;
    }

    onStartPractice(payload);
  };

  const learningProgress = summary.totalRecordings
    ? Math.min(100, Math.round((summary.analyzedCount / summary.totalRecordings) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {spotlight ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Coach spotlight</CardTitle>
            <p className={SECTION_SUBTEXT}>High-impact focus selected from your latest coaching session.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                <Sparkles className="h-4 w-4" />
                <span>Guided practice</span>
                <Badge className={PRACTICE_PRIORITY_TONES[(spotlight.score ?? 0) < summary.averageScore - 0.5 ? 'high' : 'medium']}>
                  Priority
                </Badge>
                <span>{formatRelative(spotlight.createdAt)}</span>
              </div>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-semibold text-gray-900">{spotlight.title}</p>
                <p className="text-xs text-gray-600">
                  {spotlight.focusAreas[0]
                    ? `Sharpen ${spotlight.focusAreas[0].toLowerCase()} to lift your next call.`
                    : 'Run a quick rehearsal to reinforce what the coach surfaced.'}
                </p>
                {spotlight.framework ? (
                  <Badge className={BADGE_TONES.momentum}>Framework: {spotlight.framework}</Badge>
                ) : null}
              </div>
              {onStartPractice ? (
                <Button size="sm" className="mt-3" onClick={() => handlePractice(spotlight)}>
                  Launch guided practice
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Quick wins</CardTitle>
            <p className={SECTION_SUBTEXT}>Celebrate momentum and share what is working.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickWins.length ? (
              quickWins.map(win => (
                <div key={win.recordingId} className="rounded-lg border border-gray-100 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Win
                    </Badge>
                    <span>{formatRelative(win.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{win.title}</p>
                  <p className="text-xs text-gray-600">
                    {win.focusAreas[0]
                      ? `Keep leaning into ${win.focusAreas[0].toLowerCase()} on upcoming calls.`
                      : 'Capture the playbook from this call and share it with the team.'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Wins will appear here after the coach processes more calls.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Deep practice</CardTitle>
            <p className={SECTION_SUBTEXT}>Queue rehearsals to reinforce upcoming calls.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {deepPractice.length ? (
              deepPractice.map(opportunity => (
                <div key={opportunity.recordingId} className="rounded-lg border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge className={PRACTICE_PRIORITY_TONES[(opportunity.score ?? 0) < summary.averageScore - 0.5 ? 'high' : 'medium']}>
                          Priority
                        </Badge>
                        <span>{formatRelative(opportunity.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{opportunity.title}</p>
                      <p className="text-xs text-gray-600">
                        {opportunity.focusAreas[0]
                          ? `Rehearse ${opportunity.focusAreas[0].toLowerCase()} to boost your next call.`
                          : 'Run this practice block before your next conversation.'}
                      </p>
                    </div>
                    {onStartPractice ? (
                      <Button size="icon" variant="ghost" onClick={() => handlePractice(opportunity)}>
                        <Target className="h-5 w-5 text-red-500" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Queue a new practice session from the coach spotlight to begin.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className={SECTION_HEADLINE}>Learning path</CardTitle>
          <p className={SECTION_SUBTEXT}>Track progress and upcoming focus areas.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <BarChart3 className="h-4 w-4 text-red-500" />
              <span>{getLearningLevel(summary.averageScore)}</span>
            </div>
            <p className="text-xs text-gray-500">Next milestone: {getNextMilestone(summary.averageScore)}</p>
          </div>
          <div className="space-y-2">
            <Progress value={learningProgress} />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{learningProgress}% of recent calls coached</span>
              <span>{summary.trend.direction === 'improving' ? 'Momentum rising' : 'Add a new call to boost momentum'}</span>
            </div>
          </div>
          {summary.topImprovements.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">Focus skills</p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {summary.topImprovements.slice(0, 3).map(item => (
                  <Badge key={item.label} variant="outline" className="border-gray-200">
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatRelative(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    return 'Recently';
  }
}

function getLearningLevel(score: number): string {
  if (score >= 8.5) {
    return 'Top performer momentum';
  }
  if (score >= 7.5) {
    return 'Strong performer building consistency';
  }
  if (score >= 6.5) {
    return 'Emerging performer tightening fundamentals';
  }
  return 'Momentum builder establishing rhythm';
}

function getNextMilestone(score: number): string {
  if (score >= 8.5) {
    return 'Document a repeatable playbook for the team';
  }
  if (score >= 7.5) {
    return 'Hold 8+ scores across the next 3 calls';
  }
  if (score >= 6.5) {
    return 'Lift discovery consistency to 7.5+';
  }
  return 'Close the loop on fundamentals to cross 6.5+';
}

export default SmartRecommendations;


