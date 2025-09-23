
import type { CoachingEvaluation } from '@/types/coaching';

// Safe accessors for coaching evaluation properties
export const getCoachingCriteriaValue = (
  evaluation: CoachingEvaluation | null | undefined,
  property: string,
  defaultValue: any = 0
): any => {
  if (!evaluation?.criteria) return defaultValue;
  
  // Handle array format
  if (Array.isArray(evaluation.criteria)) {
    const criterion = evaluation.criteria.find(c => c.name.toLowerCase().includes(property.toLowerCase()));
    return criterion?.score || defaultValue;
  }
  
  // Handle object format
  if (typeof evaluation.criteria === 'object') {
    return (evaluation.criteria as any)[property] || defaultValue;
  }
  
  return defaultValue;
};

export const getTalkTimeRatio = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'talkTimeRatio', 0);
};

export const getObjectionHandling = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'objectionHandling', 0);
};

export const getDiscoveryQuestions = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'discoveryQuestions', 0);
};

export const getValueArticulation = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'valueArticulation', 0);
};

export const getActiveListening = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'activeListening', 0);
};

export const getRapport = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'rapport', 0);
};

export const getNextSteps = (evaluation: CoachingEvaluation | null | undefined): boolean => {
  return getCoachingCriteriaValue(evaluation, 'nextSteps', false);
};

export const getQuestionCount = (evaluation: CoachingEvaluation | null | undefined): number => {
  return getCoachingCriteriaValue(evaluation, 'questionCount', 0);
};

export const getActionItems = (evaluation: CoachingEvaluation | null | undefined): string[] => {
  return evaluation?.actionItems || [];
};

export const getSuggestedResponses = (evaluation: CoachingEvaluation | null | undefined) => {
  return evaluation?.suggestedResponses || [];
};
