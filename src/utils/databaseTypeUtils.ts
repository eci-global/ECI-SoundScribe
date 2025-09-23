
import type { Json } from '@/integrations/supabase/types';
import type { Recording } from '@/types/recording';
import type { CoachingEvaluation } from '@/types/coaching';

// Type guard for checking if a value is a valid Recording
export const isValidRecording = (data: any): data is Recording => {
  return data && 
    typeof data === 'object' && 
    typeof data.id === 'string' &&
    (data.file_type === 'audio' || data.file_type === 'video' || !data.file_type);
};

// Convert database record to Recording type with proper type casting
export const convertDatabaseToRecording = (dbRecord: any): Recording => {
  // Ensure file_type is properly typed
  let fileType: 'audio' | 'video' = 'audio';
  if (dbRecord.file_type === 'video') {
    fileType = 'video';
  }

  return {
    ...dbRecord,
    file_type: fileType,
    status: dbRecord.status || 'uploading'
  } as Recording;
};

// Safe JSON parsing utility
export const safeJsonParse = <T>(jsonString: Json | string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString) as T;
    }
    return jsonString as T;
  } catch {
    return fallback;
  }
};

// Helper function to safely convert Json to CoachingEvaluation
export const convertJsonToCoachingEvaluation = (json: Json | null): CoachingEvaluation | null => {
  if (!json) return null;
  
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    if (!data || typeof data !== 'object') return null;
    
    // Basic validation
    if (typeof data.overallScore !== 'number') return null;
    
    return {
      overallScore: data.overallScore,
      criteria: data.criteria || [],
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      priority: data.priority || 'medium',
      timestamp: data.timestamp || new Date().toISOString(),
      summary: data.summary,
      actionItems: data.actionItems || [],
      suggestedResponses: data.suggestedResponses || [],
      componentScores: data.componentScores || {},
      talkTimeRatio: data.talkTimeRatio,
      objectionHandling: data.objectionHandling,
      discoveryQuestions: data.discoveryQuestions,
      valueArticulation: data.valueArticulation,
      activeListening: data.activeListening,
      rapportBuilding: data.rapportBuilding,
      nextSteps: data.nextSteps || []
    } as CoachingEvaluation;
  } catch (error) {
    console.warn('Failed to convert JSON to CoachingEvaluation:', error);
    return null;
  }
};

// Type conversion utilities for common database operations
export const convertToRecordingArray = (dbRecords: any[]): Recording[] => {
  return dbRecords.map(record => {
    const converted = convertDatabaseToRecording(record);
    // Convert coaching_evaluation from Json to CoachingEvaluation
    if (record.coaching_evaluation) {
      converted.coaching_evaluation = convertJsonToCoachingEvaluation(record.coaching_evaluation);
    }
    return converted;
  }).filter(isValidRecording);
};
