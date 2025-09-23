import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BDRTrainingProgram, 
  BDRTrainingProgress, 
  BDRScorecardEvaluation,
  BDREvaluationRequest,
  BDRApiResponse
} from '@/types/bdr-training';

interface UseBDRTrainingReturn {
  // Data
  programs: BDRTrainingProgram[];
  userProgress: Record<string, BDRTrainingProgress>;
  evaluations: BDRScorecardEvaluation[];
  
  // Loading states
  loading: boolean;
  evaluating: boolean;
  
  // Actions
  loadPrograms: () => Promise<void>;
  loadUserProgress: () => Promise<void>;
  loadEvaluations: (recordingId?: string) => Promise<void>;
  requestBDREvaluation: (request: BDREvaluationRequest) => Promise<BDRScorecardEvaluation | null>;
  enrollInProgram: (programId: string) => Promise<boolean>;
  
  // Utilities
  getProgramProgress: (programId: string) => BDRTrainingProgress | null;
  getRecordingEvaluations: (recordingId: string) => BDRScorecardEvaluation[];
  isEnrolledInProgram: (programId: string) => boolean;
}

export const useBDRTraining = (): UseBDRTrainingReturn => {
  const [programs, setPrograms] = useState<BDRTrainingProgram[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, BDRTrainingProgress>>({});
  const [evaluations, setEvaluations] = useState<BDRScorecardEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Load available training programs
  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bdr_training_programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedPrograms: BDRTrainingProgram[] = data?.map(program => ({
        id: program.id,
        name: program.name,
        description: program.description,
        organizationId: program.organization_id,
        createdBy: program.created_by,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
        isActive: program.is_active,
        scorecardCriteria: program.scorecard_criteria || [],
        targetScoreThreshold: program.target_score_threshold,
        minimumCallsRequired: program.minimum_calls_required,
        version: program.version,
        tags: program.tags || []
      })) || [];

      setPrograms(typedPrograms);

    } catch (error) {
      console.error('Failed to load BDR programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load training programs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Load user's training progress
  const loadUserProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bdr_training_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const progressMap: Record<string, BDRTrainingProgress> = {};
      data?.forEach(progress => {
        progressMap[progress.training_program_id] = {
          id: progress.id,
          userId: progress.user_id,
          trainingProgramId: progress.training_program_id,
          callsCompleted: progress.calls_completed,
          averageScore: progress.average_score,
          latestScore: progress.latest_score,
          bestScore: progress.best_score,
          status: progress.status,
          completionPercentage: progress.completion_percentage,
          targetMet: progress.target_met,
          startedAt: progress.started_at,
          lastActivityAt: progress.last_activity_at,
          completedAt: progress.completed_at,
          createdAt: progress.created_at,
          updatedAt: progress.updated_at
        };
      });

      setUserProgress(progressMap);

    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  }, [user, supabase]);

  // Load BDR evaluations
  const loadEvaluations = useCallback(async (recordingId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          *,
          recordings(title, created_at),
          bdr_training_programs(name)
        `)
        .eq('user_id', user.id)
        .order('evaluated_at', { ascending: false });

      if (recordingId) {
        query = query.eq('recording_id', recordingId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedEvaluations: BDRScorecardEvaluation[] = data?.map(evaluation => ({
        id: evaluation.id,
        callClassificationId: evaluation.call_classification_id,
        recordingId: evaluation.recording_id,
        trainingProgramId: evaluation.training_program_id,
        userId: evaluation.user_id,
        overallScore: evaluation.overall_score,
        criteriaScores: evaluation.criteria_scores || {},
        bdrInsights: evaluation.bdr_insights || {},
        improvementAreas: evaluation.improvement_areas || [],
        strengths: evaluation.strengths || [],
        coachingNotes: evaluation.coaching_notes,
        aiModelVersion: evaluation.ai_model_version,
        processingDurationMs: evaluation.processing_duration_ms,
        confidenceScore: evaluation.confidence_score,
        evaluatedAt: evaluation.evaluated_at,
        createdAt: evaluation.created_at,
        updatedAt: evaluation.updated_at,
        // Additional fields for compatibility
        criteria: [],
        improvements: evaluation.improvement_areas || [],
        priority: 'medium' as const,
        timestamp: evaluation.evaluated_at,
        actionItems: []
      })) || [];

      setEvaluations(typedEvaluations);

    } catch (error) {
      console.error('Failed to load evaluations:', error);
    }
  }, [user, supabase]);

  // Request BDR evaluation for a recording
  const requestBDREvaluation = useCallback(async (
    request: BDREvaluationRequest
  ): Promise<BDRScorecardEvaluation | null> => {
    try {
      setEvaluating(true);

      const response = await supabase.functions.invoke('evaluate-bdr-scorecard', {
        body: request
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result: BDRApiResponse<{ evaluation: BDRScorecardEvaluation }> = response.data;

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to evaluate recording');
      }

      // Reload evaluations and progress
      await Promise.all([
        loadEvaluations(),
        loadUserProgress()
      ]);

      toast({
        title: 'Success',
        description: 'BDR evaluation completed successfully',
      });

      return result.data.evaluation;

    } catch (error) {
      console.error('Failed to request BDR evaluation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to evaluate recording',
        variant: 'destructive'
      });
      return null;
    } finally {
      setEvaluating(false);
    }
  }, [supabase, toast, loadEvaluations, loadUserProgress]);

  // Enroll user in a training program
  const enrollInProgram = useCallback(async (programId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('bdr_training_progress')
        .upsert({
          user_id: user.id,
          training_program_id: programId,
          status: 'in_progress',
          started_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,training_program_id'
        });

      if (error) throw error;

      await loadUserProgress();

      toast({
        title: 'Success',
        description: 'Successfully enrolled in training program',
      });

      return true;

    } catch (error) {
      console.error('Failed to enroll in program:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll in training program',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, supabase, toast, loadUserProgress]);

  // Utility functions
  const getProgramProgress = useCallback((programId: string): BDRTrainingProgress | null => {
    return userProgress[programId] || null;
  }, [userProgress]);

  const getRecordingEvaluations = useCallback((recordingId: string): BDRScorecardEvaluation[] => {
    return evaluations.filter(evaluation => evaluation.recordingId === recordingId);
  }, [evaluations]);

  const isEnrolledInProgram = useCallback((programId: string): boolean => {
    return programId in userProgress;
  }, [userProgress]);

  // Load initial data
  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    if (user) {
      loadUserProgress();
      loadEvaluations();
    }
  }, [user, loadUserProgress, loadEvaluations]);

  return {
    // Data
    programs,
    userProgress,
    evaluations,
    
    // Loading states
    loading,
    evaluating,
    
    // Actions
    loadPrograms,
    loadUserProgress,
    loadEvaluations,
    requestBDREvaluation,
    enrollInProgram,
    
    // Utilities
    getProgramProgress,
    getRecordingEvaluations,
    isEnrolledInProgram
  };
};