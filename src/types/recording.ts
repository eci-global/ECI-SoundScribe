
import { Json } from '../integrations/supabase/types';
import { 
  CoachingEvaluation, 
  AIInsights, 
  AINextSteps, 
  AIMoments, 
  AISpeakerAnalysis,
  isAISpeakerAnalysis 
} from './coaching';

export interface Recording {
  id: string;
  title: string;
  description?: string;
  file_type: 'audio' | 'video';
  duration?: number;
  status: 'uploading' | 'processing' | 'processing_large_file' | 'transcribing' | 'transcribed' | 'transcription_failed' | 'completed' | 'failed';
  created_at: string;
  summary?: string;
  file_url?: string;
  transcript?: string;
  content_type?: ContentType;
  enable_coaching?: boolean;
  coaching_evaluation?: CoachingEvaluation;
  thumbnail_url?: string;
  file_size?: number;
  updated_at?: string;
  user_id?: string;
  // AI-generated content fields - using specific types instead of Json
  ai_summary?: string;
  ai_next_steps?: Json | AINextSteps | string[]; // Can be either format
  ai_insights?: Json | AIInsights;
  ai_generated_at?: string;
  ai_moments?: Json | AIMoments;
  ai_speaker_analysis?: Json | AISpeakerAnalysis;
  ai_speakers_updated_at?: string;
  transcription_metadata?: Json;
  support_analysis?: Json;
  // Employee linkage flags (optional)
  employee_participation_count?: number;
  employee_linking_pending?: boolean;
}

export interface FileOperationsProps {
  onRecordingProcessed: () => void;
}

export type ContentType = 'sales_call' | 'customer_support' | 'team_meeting' | 'training_session' | 'user_experience' | 'other';

// Utility functions for safe access to coaching evaluation properties
export const getCoachingScore = (recording: Recording): number => {
  if (!recording.coaching_evaluation) return 0;
  if (typeof recording.coaching_evaluation === 'object' && 'overallScore' in recording.coaching_evaluation) {
    return recording.coaching_evaluation.overallScore;
  }
  return 0;
};

export const getCoachingCriteria = (recording: Recording) => {
  if (!recording.coaching_evaluation) return null;
  if (typeof recording.coaching_evaluation === 'object' && 'criteria' in recording.coaching_evaluation) {
    return recording.coaching_evaluation.criteria;
  }
  return null;
};

export const getCoachingStrengths = (recording: Recording): string[] => {
  if (!recording.coaching_evaluation) return [];
  if (typeof recording.coaching_evaluation === 'object' && 'strengths' in recording.coaching_evaluation) {
    return recording.coaching_evaluation.strengths || [];
  }
  return [];
};

export const getCoachingImprovements = (recording: Recording): string[] => {
  if (!recording.coaching_evaluation) return [];
  if (typeof recording.coaching_evaluation === 'object' && 'improvements' in recording.coaching_evaluation) {
    return recording.coaching_evaluation.improvements || [];
  }
  return [];
};

export const getCoachingActionItems = (recording: Recording): string[] => {
  if (!recording.coaching_evaluation) return [];
  if (typeof recording.coaching_evaluation === 'object' && 'actionItems' in recording.coaching_evaluation) {
    return recording.coaching_evaluation.actionItems || [];
  }
  return [];
};

// Utility function for AI next steps
export const getAINextSteps = (recording: Recording): string[] => {
  if (!recording.ai_next_steps) return [];
  
  // Handle both array format and object format
  if (Array.isArray(recording.ai_next_steps)) {
    return recording.ai_next_steps
      .map(step => typeof step === 'string' ? step : String(step))
      .filter(Boolean)
      .slice(0, 100);
  }
  
  if (typeof recording.ai_next_steps === 'object' && recording.ai_next_steps !== null && 'steps' in recording.ai_next_steps) {
    const steps = (recording.ai_next_steps as any).steps;
    if (Array.isArray(steps)) {
      return steps.map((step: any) => step?.action || String(step)).filter(Boolean);
    }
  }
  
  return [];
};

// Re-export type guards from coaching types
export { isAISpeakerAnalysis };
