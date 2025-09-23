
import type { Json } from '@/integrations/supabase/types';
import type { CoachingEvaluation, AIInsights } from '@/types/coaching';
import type { Recording } from '@/types/recording';

// Type guard for CoachingEvaluation  
export const isCoachingEvaluation = (data: any): data is CoachingEvaluation => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, any>;
  return typeof obj.overallScore === 'number' && 
         typeof obj.criteria === 'object' &&
         Array.isArray(obj.strengths) &&
         Array.isArray(obj.improvements);
};

// Type guard for AIInsights
export const isAIInsights = (data: any): data is AIInsights => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, any>;
  return obj && (Array.isArray(obj.keyPoints) || Array.isArray(obj.actionItems) || typeof obj.summary === 'string');
};

// Convert database record to Recording type
export const convertToRecording = (dbRecord: any): Recording => {
  return {
    ...dbRecord,
    coaching_evaluation: isCoachingEvaluation(dbRecord.coaching_evaluation) 
      ? dbRecord.coaching_evaluation 
      : undefined,
    ai_insights: isAIInsights(dbRecord.ai_insights) 
      ? dbRecord.ai_insights 
      : undefined,
    file_type: dbRecord.file_type as 'audio' | 'video',
    status: dbRecord.status as Recording['status']
  };
};

// Safe access to coaching evaluation properties
export const getCoachingEvaluation = (recording: Recording): CoachingEvaluation | null => {
  if (!recording.coaching_evaluation) return null;
  return isCoachingEvaluation(recording.coaching_evaluation) 
    ? recording.coaching_evaluation 
    : null;
};
