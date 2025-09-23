import { useMemo } from 'react';
import { RecordingListItem } from '@/hooks/useRecordings';

export interface RecordingMetrics {
  totalRecordings: number;
  totalDuration: string;
  aiInsights: number;
  successRate: number;
  completedRecordings: number;
  processingRecordings: number;
  failedRecordings: number;
  averageDuration: string;
  timeSaved: string;
}

export function useRecordingMetrics(recordings: RecordingListItem[]): RecordingMetrics {
  return useMemo(() => {
    const total = recordings.length;
    const completed = recordings.filter(r => r.status === 'completed').length;
    const processing = recordings.filter(r => r.status === 'processing').length;
    const failed = recordings.filter(r => r.status === 'failed').length;
    
    // Calculate total duration in seconds
    const totalSeconds = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    
    // Calculate average duration
    const avgSeconds = total > 0 ? totalSeconds / total : 0;
    const avgMinutes = Math.floor(avgSeconds / 60);
    
    // Estimate AI insights (roughly 3-5 insights per completed recording)
    const aiInsights = completed * 4;
    
    // Calculate success rate
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Estimate time saved (assume 3x faster than manual analysis)
    const timeSavedSeconds = totalSeconds * 2; // 2x the recording time saved
    const timeSavedHours = Math.floor(timeSavedSeconds / 3600);
    
    return {
      totalRecordings: total,
      totalDuration: totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`,
      aiInsights,
      successRate,
      completedRecordings: completed,
      processingRecordings: processing,
      failedRecordings: failed,
      averageDuration: `${avgMinutes}m`,
      timeSaved: timeSavedHours > 0 ? `${timeSavedHours}h` : `${Math.floor(timeSavedSeconds / 60)}m`
    };
  }, [recordings]);
}