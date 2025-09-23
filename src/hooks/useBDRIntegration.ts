/**
 * BDR Integration Hook
 * 
 * Provides utilities to connect BDR training with existing recording and coaching systems
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  createBDREvaluationFromRecording,
  syncRecordingsToBDRProgram,
  getUserBDRPrograms,
  enrollUserInBDRProgram 
} from '@/utils/bdrIntegration';
import { Recording } from '@/types/recording';
import { BDRTrainingProgram } from '@/types/bdr-training';
import { toast } from 'sonner';

export function useBDRIntegration() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userPrograms, setUserPrograms] = useState<BDRTrainingProgram[]>([]);

  const processSingleRecording = useCallback(async (
    recording: Recording,
    trainingProgramId: string
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setIsProcessing(true);
    try {
      const result = await createBDREvaluationFromRecording(
        recording,
        trainingProgramId,
        user.id
      );

      if (result.success) {
        toast.success('BDR evaluation created successfully');
      } else {
        toast.error(`Failed to create BDR evaluation: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error processing recording: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const processBatchRecordings = useCallback(async (
    recordings: Recording[],
    trainingProgramId: string
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setIsProcessing(true);
    try {
      const result = await syncRecordingsToBDRProgram(recordings, trainingProgramId);

      if (result.created > 0) {
        toast.success(`Created ${result.created} BDR evaluations from ${result.processed} recordings`);
      }

      if (result.errors.length > 0) {
        console.warn('BDR batch processing errors:', result.errors);
        toast.error(`${result.errors.length} recordings failed to process`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error processing recordings: ${errorMsg}`);
      return { 
        success: false, 
        processed: 0, 
        created: 0, 
        errors: [errorMsg] 
      };
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const loadUserPrograms = useCallback(async () => {
    if (!user) return;

    try {
      const programs = await getUserBDRPrograms(user.id);
      setUserPrograms(programs);
      return programs;
    } catch (error) {
      console.error('Error loading user BDR programs:', error);
      toast.error('Failed to load BDR training programs');
      return [];
    }
  }, [user]);

  const enrollInProgram = useCallback(async (trainingProgramId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setIsProcessing(true);
    try {
      const result = await enrollUserInBDRProgram(user.id, trainingProgramId);

      if (result.success) {
        toast.success('Successfully enrolled in BDR training program');
        // Refresh user programs
        await loadUserPrograms();
      } else {
        toast.error(`Failed to enroll in program: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error enrolling in program: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [user, loadUserPrograms]);

  return {
    isProcessing,
    userPrograms,
    processSingleRecording,
    processBatchRecordings,
    loadUserPrograms,
    enrollInProgram
  };
}