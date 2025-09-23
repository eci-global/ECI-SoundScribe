/**
 * Performance tracking for processing optimization
 */

export interface ProcessingMetrics {
  recordingId: string;
  fileSize: number;
  duration: number;
  stages: {
    upload: number;
    transcription: number;
    aiAnalysis: number;
    total: number;
  };
  bottlenecks: string[];
}

export class PerformanceTracker {
  private metrics = new Map<string, ProcessingMetrics>();

  startTracking(recordingId: string, fileSize: number, duration: number) {
    this.metrics.set(recordingId, {
      recordingId,
      fileSize,
      duration,
      stages: { upload: 0, transcription: 0, aiAnalysis: 0, total: 0 },
      bottlenecks: []
    });
  }

  recordStage(recordingId: string, stage: keyof ProcessingMetrics['stages'], time: number) {
    const metric = this.metrics.get(recordingId);
    if (metric) {
      metric.stages[stage] = time;
      
      // Identify bottlenecks
      if (time > 60000) { // > 1 minute
        metric.bottlenecks.push(`${stage}: ${time}ms`);
      }
    }
  }

  getOptimizationSuggestions(recordingId: string): string[] {
    const metric = this.metrics.get(recordingId);
    if (!metric) return [];

    const suggestions: string[] = [];
    const { stages, fileSize, duration } = metric;

    // File size optimization
    if (fileSize > 50 * 1024 * 1024 && stages.upload > 30000) {
      suggestions.push('Consider pre-compression for files > 50MB');
    }

    // Transcription optimization
    if (stages.transcription > duration * 1000 * 2) {
      suggestions.push('Transcription taking longer than 2x audio duration - check audio quality');
    }

    // AI analysis optimization
    if (stages.aiAnalysis > 60000) {
      suggestions.push('AI analysis > 1min - consider parallel processing');
    }

    return suggestions;
  }

  exportMetrics(): ProcessingMetrics[] {
    return Array.from(this.metrics.values());
  }
}

export const performanceTracker = new PerformanceTracker();