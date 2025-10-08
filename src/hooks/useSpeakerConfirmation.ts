import { useState, useEffect, useCallback } from 'react';
import { SpeakerIdentificationService, type SpeakerConfirmationData, type ConfirmedSpeaker } from '@/services/speakerIdentificationService';
import type { Recording } from '@/types/recording';

interface UseSpeakerConfirmationReturn {
  showConfirmationDialog: boolean;
  confirmationData: SpeakerConfirmationData | null;
  loading: boolean;
  error: string | null;
  showDialog: (recording: Recording) => void;
  hideDialog: () => void;
  confirmSpeakers: (confirmedSpeakers: ConfirmedSpeaker[]) => Promise<void>;
  shouldShowConfirmation: (recording: Recording) => boolean;
}

export function useSpeakerConfirmation(): UseSpeakerConfirmationReturn {
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState<SpeakerConfirmationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShowConfirmation = useCallback((recording: Recording): boolean => {
    // Show confirmation if:
    // 1. Recording has a title that might contain names
    // 2. Recording is completed and has transcript
    // 3. We haven't already confirmed speakers for this recording
    
    if (!recording || recording.status !== 'completed' || !recording.transcript) {
      return false;
    }

    // Check if title contains potential names
    const titleNames = SpeakerIdentificationService.extractNamesFromTitle(recording.title || '');
    if (titleNames.length === 0) {
      return false;
    }

    // TODO: Check if we've already confirmed speakers for this recording
    // This would involve checking the speaker_confirmations table
    
    return true;
  }, []);

  const showDialog = useCallback(async (recording: Recording) => {
    try {
      setLoading(true);
      setError(null);

      const data = await SpeakerIdentificationService.createSpeakerConfirmationData(recording);
      setConfirmationData(data);
      setShowConfirmationDialog(true);
    } catch (err) {
      console.error('Error creating speaker confirmation data:', err);
      setError('Failed to load speaker confirmation data');
    } finally {
      setLoading(false);
    }
  }, []);

  const hideDialog = useCallback(() => {
    setShowConfirmationDialog(false);
    setConfirmationData(null);
    setError(null);
  }, []);

  const confirmSpeakers = useCallback(async (confirmedSpeakers: ConfirmedSpeaker[]) => {
    if (!confirmationData) return;

    try {
      setLoading(true);
      setError(null);

      await SpeakerIdentificationService.saveConfirmedSpeakers(
        confirmationData.recordingId,
        confirmedSpeakers
      );

      // Update confirmation data
      setConfirmationData(prev => prev ? {
        ...prev,
        userConfirmed: true,
        confirmedSpeakers
      } : null);

      // Hide dialog after successful confirmation
      setShowConfirmationDialog(false);
    } catch (err) {
      console.error('Error confirming speakers:', err);
      setError('Failed to save speaker confirmations');
    } finally {
      setLoading(false);
    }
  }, [confirmationData]);

  return {
    showConfirmationDialog,
    confirmationData,
    loading,
    error,
    showDialog,
    hideDialog,
    confirmSpeakers,
    shouldShowConfirmation
  };
}
