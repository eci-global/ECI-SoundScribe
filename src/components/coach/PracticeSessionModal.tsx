import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Recording } from '@/types/recording';
import { Target, Clock, Compass, ExternalLink, CheckCircle2, ListChecks } from 'lucide-react';
import { BADGE_TONES, PRACTICE_PRIORITY_TONES, SECTION_HEADLINE, SECTION_SUBTEXT } from './coachingTheme';

export type PracticeMode = 'sales' | 'support';

export interface PracticeSessionPayload {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  focusAreas: string[];
  estimatedImpact?: number;
  timeToComplete?: string;
  recommendationType?: string;
  recording: Recording;
  actionItems: string[];
  strengths: string[];
  mode: PracticeMode;
  supportingMetrics?: Array<{ label: string; value: number | string; unit?: string }>;
}

interface PracticeSessionModalProps {
  open: boolean;
  data?: PracticeSessionPayload;
  onOpenChange: (open: boolean) => void;
  onCompletePractice?: (payload: PracticeSessionPayload) => Promise<void> | void;
}

export function PracticeSessionModal({ open, data, onOpenChange, onCompletePractice }: PracticeSessionModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleClose = (nextOpen: boolean) => {
    if (!submitting) {
      onOpenChange(nextOpen);
    }
  };

  const handleComplete = async () => {
    if (!data) {
      onOpenChange(false);
      return;
    }

    if (!onCompletePractice) {
      onOpenChange(false);
      return;
    }

    try {
      setSubmitting(true);
      await onCompletePractice(data);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFocusAreas = () => {
    if (!data?.focusAreas?.length) {
      return <p className="text-sm text-gray-600">Focus areas will populate after the next coaching pass.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {data.focusAreas.map(area => (
          <Badge key={area} variant="outline" className="text-xs capitalize">
            {area}
          </Badge>
        ))}
      </div>
    );
  };

  const renderActionItems = () => {
    if (!data?.actionItems?.length) {
      return <p className="text-sm text-gray-600">No guided steps were attached to this recommendation.</p>;
    }

    return (
      <ol className="space-y-2 text-sm text-gray-700">
        {data.actionItems.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 text-red-500" />
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  };

  const renderStrengths = () => {
    if (!data?.strengths?.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Leverage your strengths</p>
        <ul className="list-disc space-y-1 text-sm text-gray-700 pl-4">
          {data.strengths.map(strength => (
            <li key={strength}>{strength}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSupportingMetrics = () => {
    if (!data?.supportingMetrics?.length) {
      return null;
    }

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase text-gray-500">Coach context</p>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {data.supportingMetrics.map(metric => (
            <Badge key={`${metric.label}-${metric.value}`} variant="outline" className="border-gray-200">
              {metric.label}: {metric.value}
              {metric.unit ?? ''}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900">Guided practice</DialogTitle>
            {data ? (
              <Badge className={data.mode === 'support' ? BADGE_TONES.personaSupport : BADGE_TONES.persona}>
                {data.mode === 'support' ? 'Support coaching' : 'Sales coaching'}
              </Badge>
            ) : null}
          </div>
          <DialogDescription className="space-y-1 text-sm text-gray-600">
            <span className="block text-base font-semibold text-gray-900">{data?.title ?? 'Practice session'}</span>
            <span>{data?.description ?? 'Queue a guided practice session to reinforce the next conversation.'}</span>
          </DialogDescription>
        </DialogHeader>

        {data ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge className={PRACTICE_PRIORITY_TONES[data.priority]}>Priority: {data.priority}</Badge>
              {data.estimatedImpact !== undefined ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  +{data.estimatedImpact}% projected impact
                </Badge>
              ) : null}
              {data.timeToComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  <Clock className="h-3 w-3" />
                  {data.timeToComplete}
                </span>
              ) : null}
              {data.recommendationType ? (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs capitalize text-gray-600">
                  {data.recommendationType.replace('_', ' ')}
                </span>
              ) : null}
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" />
                <span className={SECTION_HEADLINE}>Focus areas</span>
              </div>
              <p className={SECTION_SUBTEXT}>
                Anchor your rehearsal around the themes the coach surfaced for the next call.
              </p>
              {renderFocusAreas()}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-red-500" />
                <span className={SECTION_HEADLINE}>Action plan</span>
              </div>
              <p className={SECTION_SUBTEXT}>
                Walk through these guided steps to make the improvement stick.
              </p>
              {renderActionItems()}
            </section>

            {renderStrengths()}
            {renderSupportingMetrics()}

            <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Recording reference</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="font-medium text-gray-800">{data.recording.title ?? 'Call recording'}</span>
                <Link to={`/outreach/recordings/${data.recording.id}`} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700">
                  <ExternalLink className="h-4 w-4" />
                  Open recording
                </Link>
              </div>
            </section>
          </div>
        ) : null}

        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Log practice to update your next coaching review.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={submitting}>
              Mark practice complete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PracticeSessionModal;


