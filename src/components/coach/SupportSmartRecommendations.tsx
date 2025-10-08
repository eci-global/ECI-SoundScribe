import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Heart, ShieldCheck, Target } from 'lucide-react';
import type { Recording } from '@/types/recording';
import {
  buildSupportCoachingSummary,
  type SupportPracticeOpportunity,
} from '@/utils/coachingInsights';
import type { PracticeSessionPayload } from './PracticeSessionModal';
import { BADGE_TONES, PRACTICE_PRIORITY_TONES, SECTION_HEADLINE, SECTION_SUBTEXT } from './coachingTheme';

interface SupportSmartRecommendationsProps {
  recordings: Recording[];
  onStartPractice?: (payload: PracticeSessionPayload) => void;
}

export function SupportSmartRecommendations({ recordings, onStartPractice }: SupportSmartRecommendationsProps) {
  const summary = useMemo(() => buildSupportCoachingSummary(recordings), [recordings]);
  const recordingMap = useMemo(() => new Map(recordings.map(recording => [recording.id, recording])), [recordings]);

  const practiceOpportunities = summary.practiceOpportunities.slice(0, 3);
  const spotlight = practiceOpportunities[0];
  const additionalPractice = practiceOpportunities.slice(1);
  const servqualFocus = summary.servqualFocus.slice(0, 3);

  const createPracticePayload = (opportunity: SupportPracticeOpportunity): PracticeSessionPayload | null => {
    const recording = recordingMap.get(opportunity.recordingId);
    if (!recording) {
      return null;
    }

    const priority: 'high' | 'medium' | 'low' = opportunity.escalationRisk === 'high'
      ? 'high'
      : opportunity.escalationRisk === 'medium' || opportunity.satisfaction < summary.averageSatisfaction
        ? 'medium'
        : 'low';

    return {
      id: `support-practice-${opportunity.recordingId}`,
      title: opportunity.title || recording.title,
      description: opportunity.focusAreas[0]
        ? `Rehearse how you will reinforce ${opportunity.focusAreas[0].toLowerCase()} in your next interaction.`
        : 'Run a support drill to reinforce the coach guidance.',
      priority,
      focusAreas: opportunity.focusAreas,
      estimatedImpact: Math.max(6, Math.round((90 - opportunity.satisfaction) / 2)),
      timeToComplete: '15 minutes',
      recommendationType: 'practice_challenge',
      recording,
      actionItems: opportunity.recommendedActions,
      strengths: [],
      mode: 'support',
      supportingMetrics: [
        { label: 'Satisfaction', value: opportunity.satisfaction, unit: '%' },
        { label: 'Escalation', value: opportunity.escalationRisk },
      ],
    };
  };

  const handlePractice = (opportunity: SupportPracticeOpportunity) => {
    if (!onStartPractice) {
      return;
    }

    const payload = createPracticePayload(opportunity);
    if (!payload) {
      return;
    }

    onStartPractice(payload);
  };

  const completion = summary.totalRecordings
    ? Math.min(100, Math.round((summary.supportEligibleCount / summary.totalRecordings) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {spotlight ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Service spotlight</CardTitle>
            <p className={SECTION_SUBTEXT}>Coach-prioritized scenario to protect customer experience.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                <Sparkles className="h-4 w-4" />
                <span>Customer impact</span>
                <Badge className={PRACTICE_PRIORITY_TONES[spotlight.escalationRisk === 'high' ? 'high' : 'medium']}>
                  Escalation: {spotlight.escalationRisk}
                </Badge>
                <span>{formatRelative(spotlight.createdAt)}</span>
              </div>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-semibold text-gray-900">{spotlight.title}</p>
                <p className="text-xs text-gray-600">
                  {spotlight.focusAreas[0]
                    ? `Strengthen ${spotlight.focusAreas[0].toLowerCase()} to raise satisfaction to ${Math.min(100, Math.round(spotlight.satisfaction + 5))}%.`
                    : 'Run this guided drill to stabilize the next customer conversation.'}
                </p>
                <Badge className={BADGE_TONES.momentum}>CSAT {spotlight.satisfaction}%</Badge>
              </div>
              {onStartPractice ? (
                <Button size="sm" className="mt-3" onClick={() => handlePractice(spotlight)}>
                  Launch support drill
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Voice of the customer</CardTitle>
            <p className={SECTION_SUBTEXT}>Focus areas influencing sentiment trends.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {servqualFocus.length ? (
              servqualFocus.map(focus => (
                <div key={focus.label} className="rounded-lg border border-gray-100 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      {focus.count} calls
                    </Badge>
                    <span>{focus.label}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-900">Improve {focus.label.toLowerCase()}</p>
                  <p className="text-xs text-gray-600">
                    Use empathy statements and clear next steps to boost this SERVQUAL dimension.
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Run additional support coaching sessions to surface SERVQUAL focus areas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className={SECTION_HEADLINE}>Guided practice queue</CardTitle>
            <p className={SECTION_SUBTEXT}>Prepare the team for the next customer conversation.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {additionalPractice.length ? (
              additionalPractice.map(opportunity => (
                <div key={opportunity.recordingId} className="rounded-lg border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge className={PRACTICE_PRIORITY_TONES[opportunity.escalationRisk === 'high' ? 'high' : 'medium']}>
                          Escalation: {opportunity.escalationRisk}
                        </Badge>
                        <span>{formatRelative(opportunity.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{opportunity.title}</p>
                      <p className="text-xs text-gray-600">
                        {opportunity.focusAreas[0]
                          ? `Rehearse ${opportunity.focusAreas[0].toLowerCase()} to protect satisfaction.`
                          : 'The coach queued this scenario for a guided drill.'}
                      </p>
                    </div>
                    {onStartPractice ? (
                      <Button size="icon" variant="ghost" onClick={() => handlePractice(opportunity)}>
                        <Target className="h-5 w-5 text-gray-600" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No additional drills queued. Launch the spotlight scenario to begin.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className={SECTION_HEADLINE}>Support readiness</CardTitle>
          <p className={SECTION_SUBTEXT}>Track customer sentiment and coaching coverage.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Heart className="h-4 w-4 text-rose-500" />
              <span>{summary.averageSatisfaction}% average satisfaction</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>{summary.aggregatedMetrics.avgFCR}% first contact resolution</span>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={completion} />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{completion}% of support calls analyzed</span>
              <span>{summary.trend.direction === 'improving' ? 'Momentum rising' : 'Stabilize next sprint'}</span>
            </div>
          </div>
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

export default SupportSmartRecommendations;



