/**
 * Data Transformation Utilities for BDR Training Integration
 * 
 * Transforms validated scorecard data and matched recordings into 
 * database-ready training datasets and batch records
 */

import { NormalizedScorecardData, ValidatedScorecardRecord } from './scorecardValidator';
import { CallMatchResult, RecordingData } from './callMatcher';
import { BDRTrainingProgram, BDRCriteria } from '../types/bdr-training';

// Database insert structures
export interface TrainingDatasetInsert {
  recording_id: string;
  scorecard_data: Record<string, any>;
  transcript_content: string | null;
  manager_id: string;
  batch_id: string;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  training_weight: number;
}

export interface ScorecardEvaluationInsert {
  call_identifier: string;
  opening_score: number;
  clear_confident_score: number;
  pattern_interrupt_score: number;
  tone_energy_score: number;
  closing_score: number;
  manager_notes?: string;
  call_date?: string;
  duration_minutes?: number;
  matching_confidence: number;
  matched_recording_id?: string;
  upload_batch_id: string;
}

export interface TrainingBatchInsert {
  batch_name: string;
  week_start_date: string;
  total_calls: number;
  processed_calls: number;
  failed_calls: number;
  batch_status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  accuracy_metrics?: Record<string, any>;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_by: string;
}

export interface CallClassificationInsert {
  recording_id: string;
  training_program_id: string;
  user_id: string;
  classified_by?: string;
  classification_method: 'manual' | 'automatic' | 'batch';
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

// Transformation result
export interface TransformationResult {
  success: boolean;
  trainingDatasets: TrainingDatasetInsert[];
  scorecardEvaluations: ScorecardEvaluationInsert[];
  callClassifications: CallClassificationInsert[];
  trainingBatch: TrainingBatchInsert;
  errors: TransformationError[];
  warnings: TransformationWarning[];
  summary: TransformationSummary;
}

export interface TransformationError {
  type: 'missing_data' | 'invalid_format' | 'transformation_failed';
  message: string;
  recordId?: string;
  field?: string;
}

export interface TransformationWarning {
  type: 'data_assumption' | 'missing_optional' | 'quality_concern';
  message: string;
  recordId?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface TransformationSummary {
  totalInputRecords: number;
  successfulTransformations: number;
  matchedRecordings: number;
  unmatchedRecordings: number;
  dataQualityScore: number; // 0-100
  processingTimeMs: number;
}

// Transformation configuration
export interface TransformationConfig {
  batchNameTemplate: string;
  defaultTrainingWeight: number;
  confidenceThresholds: {
    autoApprove: number;
    requiresReview: number;
    autoReject: number;
  };
  includeUnmatched: boolean;
  generateBatchMetrics: boolean;
  validateDataIntegrity: boolean;
}

export const DEFAULT_TRANSFORMATION_CONFIG: TransformationConfig = {
  batchNameTemplate: 'Week of {startDate}',
  defaultTrainingWeight: 0.8,
  confidenceThresholds: {
    autoApprove: 0.9,
    requiresReview: 0.6,
    autoReject: 0.3
  },
  includeUnmatched: true,
  generateBatchMetrics: true,
  validateDataIntegrity: true
};

/**
 * Main transformation function
 * Converts validated scorecard data and matches into database-ready format
 */
export async function transformToTrainingDataset(
  validatedRecords: ValidatedScorecardRecord[],
  matchResults: CallMatchResult[],
  trainingProgram: BDRTrainingProgram,
  managerId: string,
  config: Partial<TransformationConfig> = {}
): Promise<TransformationResult> {
  const startTime = Date.now();
  const transformConfig = { ...DEFAULT_TRANSFORMATION_CONFIG, ...config };
  
  const errors: TransformationError[] = [];
  const warnings: TransformationWarning[] = [];
  
  try {
    // Create batch record
    const trainingBatch = createTrainingBatch(validatedRecords, managerId, transformConfig);
    const batchId = generateBatchId();
    
    // Transform individual records
    const trainingDatasets: TrainingDatasetInsert[] = [];
    const scorecardEvaluations: ScorecardEvaluationInsert[] = [];
    const callClassifications: CallClassificationInsert[] = [];
    
    // Process matched records
    const matchedRecordsMap = new Map<string, CallMatchResult>();
    for (const match of matchResults) {
      matchedRecordsMap.set(match.scorecardEntry.callIdentifier, match);
    }
    
    for (const validatedRecord of validatedRecords) {
      const normalizedData = validatedRecord.normalizedData;
      const matchResult = matchedRecordsMap.get(normalizedData.callIdentifier);
      
      try {
        // Transform scorecard evaluation
        const scorecardEval = transformScorecardEvaluation(
          normalizedData,
          matchResult,
          batchId
        );
        scorecardEvaluations.push(scorecardEval);
        
        // Transform training dataset (only for matched records)
        if (matchResult?.matchedRecording) {
          const trainingDataset = transformTrainingDataset(
            normalizedData,
            matchResult,
            trainingProgram,
            managerId,
            batchId,
            transformConfig
          );
          trainingDatasets.push(trainingDataset);
          
          // Create call classification
          const classification = transformCallClassification(
            matchResult,
            trainingProgram.id,
            managerId
          );
          callClassifications.push(classification);
        } else if (transformConfig.includeUnmatched) {
          warnings.push({
            type: 'missing_optional',
            message: `No matching recording found for call ${normalizedData.callIdentifier}`,
            recordId: normalizedData.callIdentifier,
            impact: 'medium'
          });
        }
        
      } catch (error) {
        errors.push({
          type: 'transformation_failed',
          message: `Failed to transform record ${normalizedData.callIdentifier}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recordId: normalizedData.callIdentifier
        });
      }
    }
    
    // Generate batch metrics
    if (transformConfig.generateBatchMetrics) {
      trainingBatch.accuracy_metrics = generateBatchMetrics(
        scorecardEvaluations,
        matchResults
      );
    }
    
    // Validate data integrity
    if (transformConfig.validateDataIntegrity) {
      const integrityErrors = validateTransformedData(
        trainingDatasets,
        scorecardEvaluations,
        callClassifications
      );
      errors.push(...integrityErrors);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Calculate data quality score
    const dataQualityScore = calculateDataQualityScore(
      validatedRecords,
      matchResults,
      errors,
      warnings
    );
    
    const summary: TransformationSummary = {
      totalInputRecords: validatedRecords.length,
      successfulTransformations: trainingDatasets.length + scorecardEvaluations.length,
      matchedRecordings: matchResults.filter(m => m.matchedRecording).length,
      unmatchedRecordings: matchResults.filter(m => !m.matchedRecording).length,
      dataQualityScore,
      processingTimeMs: processingTime
    };
    
    return {
      success: errors.length === 0,
      trainingDatasets,
      scorecardEvaluations,
      callClassifications,
      trainingBatch,
      errors,
      warnings,
      summary
    };
    
  } catch (error) {
    errors.push({
      type: 'transformation_failed',
      message: `Critical transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    
    return {
      success: false,
      trainingDatasets: [],
      scorecardEvaluations: [],
      callClassifications: [],
      trainingBatch: createEmptyBatch(managerId),
      errors,
      warnings,
      summary: {
        totalInputRecords: validatedRecords.length,
        successfulTransformations: 0,
        matchedRecordings: 0,
        unmatchedRecordings: 0,
        dataQualityScore: 0,
        processingTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Transform individual scorecard evaluation
 */
function transformScorecardEvaluation(
  normalizedData: NormalizedScorecardData,
  matchResult: CallMatchResult | undefined,
  batchId: string
): ScorecardEvaluationInsert {
  return {
    call_identifier: normalizedData.callIdentifier,
    opening_score: normalizedData.scores.opening,
    clear_confident_score: normalizedData.scores.clearConfident,
    pattern_interrupt_score: normalizedData.scores.patternInterrupt,
    tone_energy_score: normalizedData.scores.toneEnergy,
    closing_score: normalizedData.scores.closing,
    manager_notes: normalizedData.managerNotes || undefined,
    call_date: normalizedData.callDate?.toISOString().split('T')[0],
    duration_minutes: normalizedData.durationMinutes || undefined,
    matching_confidence: matchResult?.confidence || 0,
    matched_recording_id: matchResult?.matchedRecording?.id,
    upload_batch_id: batchId
  };
}

/**
 * Transform training dataset record
 */
function transformTrainingDataset(
  normalizedData: NormalizedScorecardData,
  matchResult: CallMatchResult,
  trainingProgram: BDRTrainingProgram,
  managerId: string,
  batchId: string,
  config: TransformationConfig
): TrainingDatasetInsert {
  // Create structured scorecard data
  const scorecardData = {
    call_identifier: normalizedData.callIdentifier,
    criteria_scores: {
      opening_and_introduction: {
        score: normalizedData.scores.opening,
        max_score: 10,
        weight: getcriteriaWeight(trainingProgram, 'opening_and_introduction')
      },
      qualifying_questions: {
        score: normalizedData.scores.clearConfident,
        max_score: 10,
        weight: getcriteriaWeight(trainingProgram, 'qualifying_questions')
      },
      pain_point_identification: {
        score: normalizedData.scores.patternInterrupt,
        max_score: 10,
        weight: getcriteriaWeight(trainingProgram, 'pain_point_identification')
      },
      value_articulation: {
        score: normalizedData.scores.toneEnergy,
        max_score: 10,
        weight: getcriteriaWeight(trainingProgram, 'value_articulation')
      },
      objection_handling: {
        score: normalizedData.scores.closing,
        max_score: 10,
        weight: getcriteriaWeight(trainingProgram, 'objection_handling')
      }
    },
    overall_score: normalizedData.calculatedOverallScore,
    manager_notes: normalizedData.managerNotes,
    call_metadata: {
      call_date: normalizedData.callDate?.toISOString(),
      duration_minutes: normalizedData.durationMinutes,
      match_confidence: matchResult.confidence,
      match_criteria: matchResult.matchCriteria.map(c => c.type)
    }
  };
  
  // Determine validation status based on confidence
  let validationStatus: 'pending' | 'validated' | 'rejected' | 'needs_review';
  if (matchResult.confidence >= config.confidenceThresholds.autoApprove) {
    validationStatus = 'validated';
  } else if (matchResult.confidence >= config.confidenceThresholds.requiresReview) {
    validationStatus = 'needs_review';
  } else if (matchResult.confidence <= config.confidenceThresholds.autoReject) {
    validationStatus = 'rejected';
  } else {
    validationStatus = 'pending';
  }
  
  // Calculate training weight based on data quality
  const trainingWeight = calculateTrainingWeight(normalizedData, matchResult, config);
  
  return {
    recording_id: matchResult.matchedRecording!.id,
    scorecard_data: scorecardData,
    transcript_content: matchResult.matchedRecording!.transcript,
    manager_id: managerId,
    batch_id: batchId,
    validation_status: validationStatus,
    training_weight: trainingWeight
  };
}

/**
 * Transform call classification
 */
function transformCallClassification(
  matchResult: CallMatchResult,
  trainingProgramId: string,
  managerId: string
): CallClassificationInsert {
  return {
    recording_id: matchResult.matchedRecording!.id,
    training_program_id: trainingProgramId,
    user_id: matchResult.matchedRecording!.user_id,
    classified_by: managerId,
    classification_method: 'batch',
    status: 'pending'
  };
}

/**
 * Create training batch record
 */
function createTrainingBatch(
  validatedRecords: ValidatedScorecardRecord[],
  managerId: string,
  config: TransformationConfig
): TrainingBatchInsert {
  const weekStart = getWeekStartDate(new Date());
  const batchName = config.batchNameTemplate.replace('{startDate}', weekStart);
  
  return {
    batch_name: batchName,
    week_start_date: weekStart,
    total_calls: validatedRecords.length,
    processed_calls: 0,
    failed_calls: 0,
    batch_status: 'pending',
    created_by: managerId
  };
}

/**
 * Generate batch metrics
 */
function generateBatchMetrics(
  scorecardEvaluations: ScorecardEvaluationInsert[],
  matchResults: CallMatchResult[]
): Record<string, any> {
  const totalEvaluations = scorecardEvaluations.length;
  const matchedEvaluations = scorecardEvaluations.filter(e => e.matched_recording_id).length;
  
  // Calculate average scores
  const avgScores = {
    opening: average(scorecardEvaluations.map(e => e.opening_score)),
    clear_confident: average(scorecardEvaluations.map(e => e.clear_confident_score)),
    pattern_interrupt: average(scorecardEvaluations.map(e => e.pattern_interrupt_score)),
    tone_energy: average(scorecardEvaluations.map(e => e.tone_energy_score)),
    closing: average(scorecardEvaluations.map(e => e.closing_score))
  };
  
  // Calculate match confidence statistics
  const matchConfidences = matchResults
    .filter(m => m.matchedRecording)
    .map(m => m.confidence);
  
  const matchStats = {
    average_confidence: average(matchConfidences),
    min_confidence: Math.min(...matchConfidences),
    max_confidence: Math.max(...matchConfidences),
    matched_percentage: (matchedEvaluations / totalEvaluations) * 100
  };
  
  return {
    total_evaluations: totalEvaluations,
    matched_evaluations: matchedEvaluations,
    average_scores: avgScores,
    match_statistics: matchStats,
    processing_metadata: {
      generated_at: new Date().toISOString(),
      version: '1.0'
    }
  };
}

/**
 * Utility functions
 */

function getWeekStartDate(date: Date): string {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  monday.setDate(monday.getDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getWeekStartDateFromDate(date: Date): string {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(monday.getDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}

function getcriteriaWeight(program: BDRTrainingProgram, criteriaId: string): number {
  const criteria = program.scorecardCriteria.find(c => c.id === criteriaId);
  return criteria?.weight || 20; // Default weight
}

function calculateTrainingWeight(
  normalizedData: NormalizedScorecardData,
  matchResult: CallMatchResult,
  config: TransformationConfig
): number {
  let weight = config.defaultTrainingWeight;
  
  // Adjust based on match confidence
  weight *= matchResult.confidence;
  
  // Adjust based on data completeness
  const completeness = calculateDataCompleteness(normalizedData);
  weight *= completeness;
  
  // Ensure weight is between 0 and 1
  return Math.max(0, Math.min(1, weight));
}

function calculateDataCompleteness(data: NormalizedScorecardData): number {
  let score = 0.6; // Base score for required fields
  
  if (data.callDate) score += 0.2;
  if (data.durationMinutes) score += 0.1;
  if (data.managerNotes && data.managerNotes.length > 10) score += 0.1;
  
  return Math.min(1, score);
}

function validateTransformedData(
  trainingDatasets: TrainingDatasetInsert[],
  scorecardEvaluations: ScorecardEvaluationInsert[],
  callClassifications: CallClassificationInsert[]
): TransformationError[] {
  const errors: TransformationError[] = [];
  
  // Check for required fields
  for (const dataset of trainingDatasets) {
    if (!dataset.recording_id) {
      errors.push({
        type: 'missing_data',
        message: 'Training dataset missing recording_id',
        recordId: dataset.recording_id
      });
    }
    
    if (!dataset.scorecard_data) {
      errors.push({
        type: 'missing_data',
        message: 'Training dataset missing scorecard_data',
        recordId: dataset.recording_id
      });
    }
  }
  
  // Check for data consistency
  const recordingIds = new Set(trainingDatasets.map(d => d.recording_id));
  const classificationIds = new Set(callClassifications.map(c => c.recording_id));
  
  for (const recordingId of recordingIds) {
    if (!classificationIds.has(recordingId)) {
      errors.push({
        type: 'missing_data',
        message: `Missing call classification for recording ${recordingId}`,
        recordId: recordingId
      });
    }
  }
  
  return errors;
}

function calculateDataQualityScore(
  validatedRecords: ValidatedScorecardRecord[],
  matchResults: CallMatchResult[],
  errors: TransformationError[],
  warnings: TransformationWarning[]
): number {
  let score = 100;
  
  // Penalty for errors
  score -= errors.length * 10;
  
  // Penalty for warnings based on impact
  for (const warning of warnings) {
    const penalty = warning.impact === 'high' ? 5 : warning.impact === 'medium' ? 3 : 1;
    score -= penalty;
  }
  
  // Bonus for match quality
  const avgMatchConfidence = average(matchResults.map(m => m.confidence));
  score += (avgMatchConfidence - 0.5) * 20; // Bonus/penalty based on match quality
  
  // Bonus for data completeness
  const completenessScore = average(validatedRecords.map(r => 
    calculateDataCompleteness(r.normalizedData)
  ));
  score += (completenessScore - 0.7) * 30;
  
  return Math.max(0, Math.min(100, score));
}

function average(numbers: number[]): number {
  return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
}

function createEmptyBatch(managerId: string): TrainingBatchInsert {
  return {
    batch_name: 'Empty Batch',
    week_start_date: getWeekStartDate(new Date()),
    total_calls: 0,
    processed_calls: 0,
    failed_calls: 0,
    batch_status: 'failed',
    created_by: managerId
  };
}

/**
 * Export utility for generating training data summary
 */
export function generateTransformationSummary(result: TransformationResult): string {
  const lines = [];
  
  lines.push('=== BDR Training Data Transformation Summary ===\n');
  
  // Overall status
  lines.push(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  lines.push(`Processing Time: ${result.summary.processingTimeMs}ms`);
  lines.push(`Data Quality Score: ${result.summary.dataQualityScore}/100\n`);
  
  // Transformation results
  lines.push('=== TRANSFORMATION RESULTS ===');
  lines.push(`Input Records: ${result.summary.totalInputRecords}`);
  lines.push(`Training Datasets Created: ${result.trainingDatasets.length}`);
  lines.push(`Scorecard Evaluations: ${result.scorecardEvaluations.length}`);
  lines.push(`Call Classifications: ${result.callClassifications.length}`);
  lines.push(`Matched Recordings: ${result.summary.matchedRecordings}`);
  lines.push(`Unmatched Records: ${result.summary.unmatchedRecordings}\n`);
  
  // Batch information
  lines.push('=== BATCH INFORMATION ===');
  lines.push(`Batch Name: ${result.trainingBatch.batch_name}`);
  lines.push(`Week Start: ${result.trainingBatch.week_start_date}`);
  lines.push(`Total Calls: ${result.trainingBatch.total_calls}`);
  lines.push(`Status: ${result.trainingBatch.batch_status}\n`);
  
  // Errors and warnings
  if (result.errors.length > 0) {
    lines.push('=== ERRORS ===');
    for (const error of result.errors) {
      lines.push(`${error.type}: ${error.message}`);
    }
    lines.push('');
  }
  
  if (result.warnings.length > 0) {
    lines.push('=== WARNINGS ===');
    for (const warning of result.warnings) {
      lines.push(`${warning.type} (${warning.impact}): ${warning.message}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}