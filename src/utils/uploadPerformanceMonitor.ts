/**
 * Upload Performance Monitor
 * 
 * Tracks and analyzes upload performance metrics to measure the impact
 * of our optimizations and identify further improvement opportunities.
 */

export interface PerformanceMetrics {
  fileSize: number;
  totalUploadTime: number;
  validationTime: number;
  compressionTime: number;
  uploadTime: number;
  processingTime: number;
  usedWebWorker: boolean;
  usedParallelValidation: boolean;
  compressionRatio?: number;
  routingStrategy: string;
  timestamp: number;
  format?: string;
  durationExtractionTime?: number;
  durationMethod?: string;
}

export interface PerformanceAnalysis {
  averageUploadTime: number;
  averageValidationTime: number;
  averageCompressionTime: number;
  webWorkerUsageRate: number;
  parallelValidationUsageRate: number;
  fileSizeGroups: {
    small: { count: number; avgTime: number }; // < 50MB
    medium: { count: number; avgTime: number }; // 50-200MB
    large: { count: number; avgTime: number }; // > 200MB
  };
  compressionEffectiveness: {
    averageRatio: number;
    timeSavings: number;
  };
}

class UploadPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 100; // Keep last 100 uploads

  /**
   * Record a new upload performance metric
   */
  recordUpload(metrics: PerformanceMetrics): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    });

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    console.log('📊 Upload performance recorded:', {
      fileSize: `${(metrics.fileSize / (1024 * 1024)).toFixed(1)}MB`,
      totalTime: `${metrics.totalUploadTime.toFixed(0)}ms`,
      routing: metrics.routingStrategy,
      webWorker: metrics.usedWebWorker,
      parallel: metrics.usedParallelValidation
    });
  }

  /**
   * Get performance analysis
   */
  getAnalysis(): PerformanceAnalysis {
    if (this.metrics.length === 0) {
      return this.getEmptyAnalysis();
    }

    const small = this.metrics.filter(m => m.fileSize < 50 * 1024 * 1024);
    const medium = this.metrics.filter(m => m.fileSize >= 50 * 1024 * 1024 && m.fileSize < 200 * 1024 * 1024);
    const large = this.metrics.filter(m => m.fileSize >= 200 * 1024 * 1024);

    const avgTime = (metrics: PerformanceMetrics[]) => 
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.totalUploadTime, 0) / metrics.length : 0;

    const compressionMetrics = this.metrics.filter(m => m.compressionRatio);
    
    return {
      averageUploadTime: avgTime(this.metrics),
      averageValidationTime: this.metrics.reduce((sum, m) => sum + m.validationTime, 0) / this.metrics.length,
      averageCompressionTime: this.metrics.reduce((sum, m) => sum + m.compressionTime, 0) / this.metrics.length,
      webWorkerUsageRate: this.metrics.filter(m => m.usedWebWorker).length / this.metrics.length,
      parallelValidationUsageRate: this.metrics.filter(m => m.usedParallelValidation).length / this.metrics.length,
      fileSizeGroups: {
        small: { count: small.length, avgTime: avgTime(small) },
        medium: { count: medium.length, avgTime: avgTime(medium) },
        large: { count: large.length, avgTime: avgTime(large) }
      },
      compressionEffectiveness: {
        averageRatio: compressionMetrics.length > 0 
          ? compressionMetrics.reduce((sum, m) => sum + (m.compressionRatio || 0), 0) / compressionMetrics.length 
          : 0,
        timeSavings: this.calculateCompressionTimeSavings()
      }
    };
  }

  /**
   * Calculate estimated time savings from compression
   */
  private calculateCompressionTimeSavings(): number {
    const compressedUploads = this.metrics.filter(m => m.compressionRatio && m.compressionRatio > 1);
    
    if (compressedUploads.length === 0) return 0;

    // Estimate time savings based on reduced upload size
    return compressedUploads.reduce((total, metric) => {
      const originalUploadTime = metric.uploadTime * (metric.compressionRatio || 1);
      const timeSaved = originalUploadTime - metric.uploadTime;
      return total + timeSaved;
    }, 0) / compressedUploads.length;
  }

  /**
   * Get empty analysis structure
   */
  private getEmptyAnalysis(): PerformanceAnalysis {
    return {
      averageUploadTime: 0,
      averageValidationTime: 0,
      averageCompressionTime: 0,
      webWorkerUsageRate: 0,
      parallelValidationUsageRate: 0,
      fileSizeGroups: {
        small: { count: 0, avgTime: 0 },
        medium: { count: 0, avgTime: 0 },
        large: { count: 0, avgTime: 0 }
      },
      compressionEffectiveness: {
        averageRatio: 0,
        timeSavings: 0
      }
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('📊 Performance metrics cleared');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): string {
    const analysis = this.getAnalysis();
    
    return `
📊 Upload Performance Report (Last ${this.metrics.length} uploads)

🏃‍♂️ Speed Metrics:
  • Average Total Time: ${analysis.averageUploadTime.toFixed(0)}ms
  • Average Validation Time: ${analysis.averageValidationTime.toFixed(0)}ms
  • Average Compression Time: ${analysis.averageCompressionTime.toFixed(0)}ms

⚡ Optimization Usage:
  • Web Worker Usage: ${(analysis.webWorkerUsageRate * 100).toFixed(1)}%
  • Parallel Validation: ${(analysis.parallelValidationUsageRate * 100).toFixed(1)}%

📁 File Size Performance:
  • Small Files (< 50MB): ${analysis.fileSizeGroups.small.count} uploads, ${analysis.fileSizeGroups.small.avgTime.toFixed(0)}ms avg
  • Medium Files (50-200MB): ${analysis.fileSizeGroups.medium.count} uploads, ${analysis.fileSizeGroups.medium.avgTime.toFixed(0)}ms avg
  • Large Files (> 200MB): ${analysis.fileSizeGroups.large.count} uploads, ${analysis.fileSizeGroups.large.avgTime.toFixed(0)}ms avg

🗜️ Compression Effectiveness:
  • Average Compression Ratio: ${analysis.compressionEffectiveness.averageRatio.toFixed(1)}x
  • Estimated Time Savings: ${analysis.compressionEffectiveness.timeSavings.toFixed(0)}ms per upload
    `;
  }
}

// Global performance monitor instance
export const uploadPerformanceMonitor = new UploadPerformanceMonitor();

/**
 * Performance tracking wrapper for upload operations
 */
export class UploadPerformanceTracker {
  private startTime: number;
  private metrics: Partial<PerformanceMetrics> = {};

  constructor(fileSize: number, routingStrategy: string) {
    this.startTime = performance.now();
    this.metrics = {
      fileSize,
      routingStrategy,
      usedWebWorker: false,
      usedParallelValidation: false
    };
  }

  trackValidation(time: number, usedParallel: boolean = false): void {
    this.metrics.validationTime = time;
    this.metrics.usedParallelValidation = usedParallel;
  }

  trackCompression(time: number, ratio: number, usedWebWorker: boolean = false): void {
    this.metrics.compressionTime = time;
    this.metrics.compressionRatio = ratio;
    this.metrics.usedWebWorker = usedWebWorker;
  }

  trackUpload(time: number): void {
    this.metrics.uploadTime = time;
  }

  trackProcessing(time: number): void {
    this.metrics.processingTime = time;
  }

  finish(): void {
    this.metrics.totalUploadTime = performance.now() - this.startTime;
    
    // Record the complete metrics
    uploadPerformanceMonitor.recordUpload(this.metrics as PerformanceMetrics);
  }
}