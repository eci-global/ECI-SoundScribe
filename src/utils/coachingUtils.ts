
import type { Recording } from '@/types/recording';
import { CoachingEvaluation, isCoachingEvaluation } from '@/types/coaching';

// Safe access to coaching evaluation properties
export const getCoachingEvaluation = (recording: Recording): CoachingEvaluation | null => {
  if (!recording.coaching_evaluation) return null;
  if (isCoachingEvaluation(recording.coaching_evaluation)) {
    return recording.coaching_evaluation;
  }
  return null;
};

export const getOverallScore = (recording: Recording): number => {
  const evaluation = getCoachingEvaluation(recording);
  return evaluation?.overallScore || 0;
};

export const getTalkTimeRatio = (recording: Recording): number => {
  const evaluation = getCoachingEvaluation(recording);
  return Array.isArray(evaluation?.criteria) ? 0 : evaluation?.criteria?.talkTimeRatio || 0;
};

export const getQuestionCount = (recording: Recording): number => {
  const evaluation = getCoachingEvaluation(recording);
  return Array.isArray(evaluation?.criteria) ? 0 : evaluation?.criteria?.questionCount || 0;
};

export const hasNextSteps = (recording: Recording): boolean => {
  const evaluation = getCoachingEvaluation(recording);
  return Array.isArray(evaluation?.criteria) ? false : evaluation?.criteria?.nextSteps || false;
};

export const getActionItems = (recording: Recording): string[] => {
  const evaluation = getCoachingEvaluation(recording);
  return evaluation?.actionItems || [];
};

export const getStrengths = (recording: Recording): string[] => {
  const evaluation = getCoachingEvaluation(recording);
  return evaluation?.strengths || [];
};

export const getImprovements = (recording: Recording): string[] => {
  const evaluation = getCoachingEvaluation(recording);
  return evaluation?.improvements || [];
};

// Check if recording has coaching data
export const hasCoachingData = (recording: Recording): boolean => {
  return !!getCoachingEvaluation(recording);
};

// Get coaching score color for UI
export const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

// Get coaching score badge variant
export const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'destructive';
};
