import { useCallback } from 'react';
import { updateRecordingSummary } from '@/utils/recordingDatabase';

interface UseRegenerateSummaryProps {
  onSummaryUpdated?: () => void;
}

export const useRegenerateSummary = ({ onSummaryUpdated }: UseRegenerateSummaryProps = {}) => {
  const handleRegenerateSummary = useCallback(async (recordingId: string, newSummary: string) => {
    try {
      await updateRecordingSummary(recordingId, newSummary);
      onSummaryUpdated?.();
    } catch (error) {
      console.error('Failed to update recording summary:', error);
      throw error;
    }
  }, [onSummaryUpdated]);

  return { handleRegenerateSummary };
};