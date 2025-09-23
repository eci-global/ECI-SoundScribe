import { updateRecordingStatus, logProcessingActivity } from '../supabase.js';

/**
 * Progress tracker for file processing with real-time updates
 */
export class ProgressTracker {
  constructor(recordingId) {
    this.recordingId = recordingId;
    this.currentProgress = 0;
    this.currentStage = 'initializing';
    this.stages = {
      initializing: { min: 0, max: 5, label: 'Initializing...' },
      downloading: { min: 5, max: 15, label: 'Downloading file...' },
      preprocessing: { min: 15, max: 25, label: 'Preprocessing audio...' },
      transcribing: { min: 25, max: 70, label: 'Transcribing with AI...' },
      analyzing: { min: 70, max: 90, label: 'Generating insights...' },
      finalizing: { min: 90, max: 100, label: 'Finalizing results...' }
    };
  }

  /**
   * Update progress for current stage
   */
  async updateProgress(stage, stageProgress = 0, customMessage = null) {
    if (!this.stages[stage]) {
      console.warn(`Unknown stage: ${stage}`);
      return;
    }

    this.currentStage = stage;
    const stageConfig = this.stages[stage];
    
    // Calculate overall progress based on stage progress
    const stageRange = stageConfig.max - stageConfig.min;
    const progressInStage = Math.max(0, Math.min(100, stageProgress));
    this.currentProgress = Math.round(stageConfig.min + (stageRange * progressInStage / 100));

    const message = customMessage || stageConfig.label;
    const statusMessage = `${message} (${this.currentProgress}%)`;

    console.log(`📊 Progress Update [${this.recordingId}]: ${statusMessage}`);

    // Update database with progress
    await updateRecordingStatus(
      this.recordingId, 
      'processing', 
      this.currentProgress,
      null
    );

    // Log activity for debugging
    await logProcessingActivity(this.recordingId, `progress_update`, {
      stage,
      progress: this.currentProgress,
      stageProgress,
      message
    });
  }

  /**
   * Mark processing as complete
   */
  async complete(results = {}) {
    this.currentProgress = 100;
    this.currentStage = 'completed';

    console.log(`✅ Processing Complete [${this.recordingId}]: 100%`);

    await updateRecordingStatus(
      this.recordingId, 
      'completed', 
      100,
      null
    );

    await logProcessingActivity(this.recordingId, 'processing_completed', {
      finalResults: results
    });
  }

  /**
   * Mark processing as failed
   */
  async fail(error) {
    this.currentStage = 'failed';
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Processing Failed [${this.recordingId}]: ${errorMessage}`);

    await updateRecordingStatus(
      this.recordingId, 
      'failed', 
      this.currentProgress,
      errorMessage
    );

    await logProcessingActivity(this.recordingId, 'processing_failed', {
      error: errorMessage,
      stage: this.currentStage,
      progress: this.currentProgress
    });
  }

  /**
   * Set custom stage for specialized processing
   */
  async setCustomStage(stageName, progress, message) {
    this.currentStage = stageName;
    this.currentProgress = Math.max(0, Math.min(100, progress));

    console.log(`🔄 Custom Stage [${this.recordingId}]: ${message} (${this.currentProgress}%)`);

    await updateRecordingStatus(
      this.recordingId, 
      'processing', 
      this.currentProgress,
      null
    );

    await logProcessingActivity(this.recordingId, 'custom_stage', {
      stage: stageName,
      progress: this.currentProgress,
      message
    });
  }

  /**
   * Get current status for API responses
   */
  getStatus() {
    return {
      recordingId: this.recordingId,
      progress: this.currentProgress,
      stage: this.currentStage,
      stageLabel: this.stages[this.currentStage]?.label || this.currentStage,
      isComplete: this.currentProgress >= 100,
      isFailed: this.currentStage === 'failed'
    };
  }
}