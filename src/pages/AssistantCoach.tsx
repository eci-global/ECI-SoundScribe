import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StandardLayout from '@/components/layout/StandardLayout';
import { AILearningDashboard } from '@/components/coach/AILearningDashboard';
import { SmartRecommendations } from '@/components/coach/SmartRecommendations';
import { SuccessPatterns } from '@/components/coach/SuccessPatterns';
import { SupportAILearningDashboard } from '@/components/coach/SupportAILearningDashboard';
import { SupportSmartRecommendations } from '@/components/coach/SupportSmartRecommendations';
import { SupportSuccessPatterns } from '@/components/coach/SupportSuccessPatterns';
import BDRTrainingDashboard from '@/components/coach/BDRTrainingDashboard';
import PracticeSessionModal, { PracticeSessionPayload } from '@/components/coach/PracticeSessionModal';
import { CoachHero } from '@/components/coach/CoachHero';
import { CoachMetricsBar } from '@/components/coach/CoachMetricsBar';
import { FocusStrip } from '@/components/coach/FocusStrip';
import { PracticeBoard } from '@/components/coach/PracticeBoard';
import { CoachMomentumTimeline } from '@/components/coach/CoachMomentumTimeline';
import { CoachWinsPanel } from '@/components/coach/CoachWinsPanel';
import { ServicePulse } from '@/components/coach/ServicePulse';
import { useDashboard } from '@/hooks/useDashboard';
import { useSupportMode } from '@/contexts/SupportContext';
import {
  buildSalesCoachingSummary,
  buildSupportCoachingSummary,
  buildSalesUiModel,
  buildSupportUiModel,
  type CoachPracticePreview,
  type CoachUiModel,
  type RecordingMap,
} from '@/utils/coachingInsights';
import { useToast } from '@/components/ui/use-toast';

const AssistantCoach = () => {
  const navigate = useNavigate();
  const { recordings, loading, error } = useDashboard();
  const { supportMode, toggleSupportMode } = useSupportMode();
  const { toast } = useToast();

  const recordingMap = useMemo<RecordingMap>(
    () => new Map(recordings.map(recording => [recording.id, recording])),
    [recordings],
  );

  const salesSummary = useMemo(() => buildSalesCoachingSummary(recordings), [recordings]);
  const supportSummary = useMemo(() => buildSupportCoachingSummary(recordings), [recordings]);

  const salesModel = useMemo<CoachUiModel>(
    () => buildSalesUiModel(salesSummary, recordingMap),
    [salesSummary, recordingMap],
  );
  const supportModel = useMemo<CoachUiModel>(
    () => buildSupportUiModel(supportSummary, recordingMap),
    [supportSummary, recordingMap],
  );

  const activeModel = supportMode ? supportModel : salesModel;

  const [practicePayload, setPracticePayload] = useState<PracticeSessionPayload | undefined>();
  const [practiceOpen, setPracticeOpen] = useState(false);

  const createPracticePayload = (preview: CoachPracticePreview): PracticeSessionPayload | null => {
    const recording = recordingMap.get(preview.recordingId);
    if (!recording) {
      return null;
    }

    return {
      id: preview.id,
      title: preview.title,
      description: preview.highlight,
      priority: preview.priority,
      focusAreas: preview.focusAreas,
      actionItems: preview.actionItems,
      strengths: preview.strengths,
      recording,
      mode: preview.mode,
      supportingMetrics: preview.supportingMetrics,
    };
  };

  const openPracticeModal = (payload: PracticeSessionPayload) => {
    setPracticePayload(payload);
    setPracticeOpen(true);
  };

  const launchPracticeFromPreview = (preview: CoachPracticePreview) => {
    const payload = createPracticePayload(preview);
    if (!payload) {
      toast({
        title: 'Unable to start practice',
        description: 'We could not locate the recording for this recommendation.',
        variant: 'destructive',
      });
      return;
    }

    openPracticeModal(payload);
  };

  const handleCompletePractice = async (payload: PracticeSessionPayload) => {
    toast({
      title: 'Practice logged',
      description: 'We saved your focus area. Re-run coaching after your next call to measure progress.',
    });
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="space-y-8">
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr) minmax(0,1.2fr)]">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unable to load coaching data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!recordings.length) {
      return (
        <Card className="border-dashed border-red-200 bg-white">
          <CardHeader>
            <CardTitle>No recordings analyzed yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a call and run coaching analysis to unlock personalized guidance.
            </p>
            <Button variant="outline" onClick={() => navigate('/uploads')}>
              Go to Uploads
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-8">
        <CoachHero data={activeModel.hero} supportMode={supportMode} onToggleMode={toggleSupportMode} />
        <CoachMetricsBar metrics={activeModel.hero.metrics} mode={activeModel.mode} />

        <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr) minmax(0,1.2fr)]">
          <div className="space-y-8">
            <section className="space-y-4">
              <SectionHeader
                title="Focus priorities"
                description="Key themes surfaced by the coach to guide your next conversations."
              />
              <FocusStrip items={activeModel.focus} />
            </section>

            <section className="space-y-4">
              <SectionHeader
                title="Practice & momentum"
                description="Queue intentional rehearsals and review recent performance signals."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <PracticeBoard mode={activeModel.mode} items={activeModel.practice} onSelect={launchPracticeFromPreview} />
                <CoachMomentumTimeline items={activeModel.momentum} />
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader
                title={supportMode ? 'Service health' : 'Role development'}
                description={
                  supportMode
                    ? 'Track satisfaction, escalation risk, and readiness for the next customer interactions.'
                    : 'Follow structured skill development with the latest role-based training insights.'
                }
              />
              {supportMode ? (
                <ServicePulse summary={supportSummary} />
              ) : (
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900">Role development progress</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <BDRTrainingDashboard recordings={recordings} />
                  </CardContent>
                </Card>
              )}
            </section>

            <section className="space-y-4">
              <SectionHeader
                title="Learning & trends"
                description="Monitor capability growth and repeatable success patterns."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {supportMode ? (
                  <SupportAILearningDashboard recordings={recordings} />
                ) : (
                  <AILearningDashboard recordings={recordings} />
                )}
                {supportMode ? (
                  <SupportSuccessPatterns recordings={recordings} />
                ) : (
                  <SuccessPatterns recordings={recordings} />
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:space-y-8">
            <section className="space-y-4">
              <SectionHeader
                title={supportMode ? 'Support recommendations' : 'Sales recommendations'}
                description="Curated actions from the coach to focus your next reps."
              />
              {supportMode ? (
                <SupportSmartRecommendations recordings={recordings} onStartPractice={openPracticeModal} />
              ) : (
                <SmartRecommendations recordings={recordings} onStartPractice={openPracticeModal} />
              )}
            </section>

            <section className="space-y-4">
              <SectionHeader
                title="Recent wins"
                description="Celebrate positive moments and share what is working with the team."
              />
              <CoachWinsPanel wins={activeModel.wins} mode={activeModel.mode} />
            </section>
          </aside>
        </div>
      </div>
    );
  };

  return (
    <StandardLayout activeSection="assistant">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto space-y-8 px-4 py-10">
          {renderBody()}
        </div>
      </div>

      <PracticeSessionModal
        open={practiceOpen}
        data={practicePayload}
        onOpenChange={open => {
          setPracticeOpen(open);
          if (!open) {
            setPracticePayload(undefined);
          }
        }}
        onCompletePractice={payload => {
          handleCompletePractice(payload);
          setPracticeOpen(false);
          setPracticePayload(undefined);
        }}
      />
    </StandardLayout>
  );
};

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description ? <p className="text-sm text-gray-600">{description}</p> : null}
    </div>
  );
}

export default AssistantCoach;
