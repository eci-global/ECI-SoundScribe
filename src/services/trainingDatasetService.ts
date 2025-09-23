/**
 * Training Dataset Service for BDR Training Integration
 * 
 * Manages creation, storage, and retrieval of training datasets from validated scorecard data.
 * Handles database operations, batch management, and training data lifecycle.
 */

import { supabase } from '../integrations/supabase/client';
import { 
  parseExcelScorecardData, 
  type ExcelParseResult,
  type ParsedScorecardData 
} from '../utils/excelParser';
import { 
  validateScorecardData, 
  type ScorecardValidationResult,
  type ValidatedScorecardRecord 
} from '../utils/scorecardValidator';
import { 
  matchCallsToRecordings, 
  type BatchMatchResult,
  type CallMatchResult,
  type RecordingData 
} from '../utils/callMatcher';
import { 
  transformToTrainingDataset,
  type TransformationResult,
  type TrainingDatasetInsert,
  type ScorecardEvaluationInsert,
  type TrainingBatchInsert,
  type CallClassificationInsert
} from '../utils/dataTransformer';
import { BDRTrainingProgram } from '../types/bdr-training';

// Service result types
export interface TrainingDatasetCreationResult {
  success: boolean;
  batchId: string;
  trainingDatasets: TrainingDatasetInsert[];
  scorecardEvaluations: ScorecardEvaluationInsert[];
  callClassifications: CallClassificationInsert[];
  trainingBatch: TrainingBatchInsert;
  summary: {
    totalRecords: number;
    processedRecords: number;
    matchedRecordings: number;
    unmatchedRecords: number;
    validationErrors: number;
    warnings: number;
  };
  errors: TrainingDatasetError[];
  warnings: TrainingDatasetWarning[];
}

export interface TrainingDatasetError {
  type: 'parse_error' | 'validation_error' | 'match_error' | 'database_error' | 'business_rule_error';
  message: string;
  phase: 'parsing' | 'validation' | 'matching' | 'transformation' | 'storage';
  recordId?: string;
  details?: any;
}

export interface TrainingDatasetWarning {
  type: 'data_quality' | 'matching_confidence' | 'business_assumption' | 'performance';
  message: string;
  phase: 'parsing' | 'validation' | 'matching' | 'transformation';
  recordId?: string;
  impact: 'low' | 'medium' | 'high';
}

// Dataset retrieval options
export interface DatasetRetrievalOptions {
  batchId?: string;
  trainingProgramId?: string;
  managerId?: string;
  status?: 'pending' | 'validated' | 'rejected' | 'needs_review';
  dateRange?: { start: Date; end: Date };
  includeMetadata?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'confidence' | 'score';
  orderDirection?: 'asc' | 'desc';
}

export interface TrainingDatasetRecord {
  id: string;
  recording_id: string;
  scorecard_data: Record<string, any>;
  transcript_content: string | null;
  manager_id: string;
  batch_id: string;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  training_weight: number;
  created_at: string;
  updated_at: string;
  // Joined data
  recording?: {
    title: string;
    user_id: string;
    call_date: string | null;
    duration_seconds: number | null;
  };
  scorecard_evaluation?: ScorecardEvaluationInsert;
  call_classification?: CallClassificationInsert;
}

/**
 * Main service class for training dataset management
 */
export class TrainingDatasetService {
  /**
   * Create training dataset from uploaded Excel file
   * Full pipeline: Parse -> Validate -> Match -> Transform -> Store
   */
  async createFromExcelFile(
    file: File,
    trainingProgram: BDRTrainingProgram,
    managerId: string,
    userId?: string
  ): Promise<TrainingDatasetCreationResult> {
    const errors: TrainingDatasetError[] = [];
    const warnings: TrainingDatasetWarning[] = [];
    
    try {
      // Phase 1: Parse Excel file
      const parseResult = await this.parseExcelFile(file);
      if (!parseResult.success) {
        errors.push({
          type: 'parse_error',
          phase: 'parsing',
          message: `Excel parsing failed: ${parseResult.errors.map(e => e.message).join(', ')}`
        });
        
        return this.createFailureResult(errors, warnings);
      }

      // Phase 2: Validate scorecard data
      const validationResult = await this.validateScorecardData(
        parseResult.data,
        trainingProgram
      );
      
      // Collect validation errors and warnings
      for (const error of validationResult.errors) {
        errors.push({
          type: 'validation_error',
          phase: 'validation',
          message: error.message,
          recordId: error.recordIdentifier,
          details: error
        });
      }
      
      for (const warning of validationResult.warnings) {
        warnings.push({
          type: 'data_quality',
          phase: 'validation',
          message: warning.message,
          recordId: warning.recordIdentifier,
          impact: warning.impact || 'medium'
        });
      }

      if (!validationResult.isValid) {
        return this.createFailureResult(errors, warnings);
      }

      // Phase 3: Fetch recordings for matching
      const recordings = await this.fetchMatchingRecordings(userId);
      if (recordings.length === 0) {
        warnings.push({
          type: 'business_assumption',
          phase: 'matching',
          message: 'No recordings available for matching. All entries will be unmatched.',
          impact: 'high'
        });
      }

      // Phase 4: Match calls to recordings
      const matchResult = await this.matchCallsToRecordings(
        validationResult.validRecords,
        recordings,
        userId
      );

      // Phase 5: Transform to database format
      const transformationResult = await this.transformToTrainingData(
        validationResult.validRecords,
        matchResult.matches,
        trainingProgram,
        managerId
      );

      if (!transformationResult.success) {
        for (const error of transformationResult.errors) {
          errors.push({
            type: 'business_rule_error',
            phase: 'transformation',
            message: error.message,
            recordId: error.recordId
          });
        }
        
        if (errors.length > 0) {
          return this.createFailureResult(errors, warnings);
        }
      }

      // Phase 6: Store in database
      const storeResult = await this.storeTrainingData(transformationResult);
      if (!storeResult.success) {
        errors.push({
          type: 'database_error',
          phase: 'storage',
          message: storeResult.error || 'Failed to store training data in database'
        });
        
        return this.createFailureResult(errors, warnings);
      }

      // Success result
      return {
        success: true,
        batchId: transformationResult.trainingBatch.batch_name,
        trainingDatasets: transformationResult.trainingDatasets,
        scorecardEvaluations: transformationResult.scorecardEvaluations,
        callClassifications: transformationResult.callClassifications,
        trainingBatch: transformationResult.trainingBatch,
        summary: {
          totalRecords: parseResult.data.length,
          processedRecords: transformationResult.trainingDatasets.length,
          matchedRecordings: matchResult.matches.length,
          unmatchedRecords: matchResult.unmatched.length,
          validationErrors: validationResult.errors.length,
          warnings: validationResult.warnings.length + transformationResult.warnings.length
        },
        errors,
        warnings: warnings.concat(transformationResult.warnings.map(w => ({
          type: 'data_quality' as const,
          phase: 'transformation' as const,
          message: w.message,
          recordId: w.recordId,
          impact: w.impact
        })))
      };

    } catch (error) {
      errors.push({
        type: 'database_error',
        phase: 'storage',
        message: `Unexpected error in training dataset creation: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      return this.createFailureResult(errors, warnings);
    }
  }

  /**
   * Retrieve training datasets with filtering and pagination
   */
  async getTrainingDatasets(options: DatasetRetrievalOptions = {}): Promise<{
    datasets: TrainingDatasetRecord[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = supabase
      .from('bdr_training_datasets')
      .select(`
        *,
        recording:recordings(title, user_id, call_date, duration_seconds),
        scorecard_evaluation:bdr_scorecard_evaluations(*),
        call_classification:bdr_call_classifications(*)
      `, { count: 'exact' });

    // Apply filters
    if (options.batchId) {
      query = query.eq('batch_id', options.batchId);
    }
    
    if (options.managerId) {
      query = query.eq('manager_id', options.managerId);
    }
    
    if (options.status) {
      query = query.eq('validation_status', options.status);
    }
    
    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString());
    }

    // Apply ordering
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Failed to retrieve training datasets: ${error.message}`);
    }

    return {
      datasets: data || [],
      totalCount: count || 0,
      hasMore: (count || 0) > (offset + limit)
    };
  }

  /**
   * Update validation status of training datasets
   */
  async updateValidationStatus(
    datasetIds: string[],
    status: 'pending' | 'validated' | 'rejected' | 'needs_review',
    managerId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('bdr_training_datasets')
      .update({ 
        validation_status: status,
        updated_at: new Date().toISOString(),
        // Store validation notes in scorecard_data metadata
        scorecard_data: supabase.rpc('jsonb_set', {
          target: 'scorecard_data',
          path: '{validation_metadata}',
          new_value: JSON.stringify({
            validated_by: managerId,
            validated_at: new Date().toISOString(),
            validation_notes: notes,
            status
          })
        })
      })
      .in('id', datasetIds);

    if (error) {
      return { 
        success: false, 
        error: `Failed to update validation status: ${error.message}` 
      };
    }

    return { success: true };
  }

  /**
   * Delete training datasets and associated records
   */
  async deleteTrainingDatasets(
    datasetIds: string[],
    managerId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify manager has permission to delete these datasets
    const { data: datasets, error: fetchError } = await supabase
      .from('bdr_training_datasets')
      .select('manager_id')
      .in('id', datasetIds);

    if (fetchError) {
      return { success: false, error: `Failed to verify permissions: ${fetchError.message}` };
    }

    const unauthorizedDatasets = datasets?.filter(d => d.manager_id !== managerId) || [];
    if (unauthorizedDatasets.length > 0) {
      return { success: false, error: 'Unauthorized to delete some datasets' };
    }

    // Delete datasets (cascade will handle related records)
    const { error } = await supabase
      .from('bdr_training_datasets')
      .delete()
      .in('id', datasetIds);

    if (error) {
      return { success: false, error: `Failed to delete datasets: ${error.message}` };
    }

    return { success: true };
  }

  /**
   * Get training dataset statistics for dashboard
   */
  async getDatasetStatistics(
    trainingProgramId?: string,
    managerId?: string
  ): Promise<{
    totalDatasets: number;
    pendingValidation: number;
    validated: number;
    rejected: number;
    needsReview: number;
    averageConfidence: number;
    averageScore: number;
    recentBatches: Array<{
      batch_id: string;
      created_at: string;
      total_datasets: number;
      validation_status_counts: Record<string, number>;
    }>;
  }> {
    // Build base query
    let query = supabase.from('bdr_training_datasets').select('*');
    
    if (managerId) {
      query = query.eq('manager_id', managerId);
    }

    const { data: datasets, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get dataset statistics: ${error.message}`);
    }

    const stats = {
      totalDatasets: datasets?.length || 0,
      pendingValidation: 0,
      validated: 0,
      rejected: 0,
      needsReview: 0,
      averageConfidence: 0,
      averageScore: 0,
      recentBatches: [] as any[]
    };

    if (datasets && datasets.length > 0) {
      // Calculate status counts
      for (const dataset of datasets) {
        switch (dataset.validation_status) {
          case 'pending':
            stats.pendingValidation++;
            break;
          case 'validated':
            stats.validated++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'needs_review':
            stats.needsReview++;
            break;
        }
      }

      // Calculate averages
      const weights = datasets.map(d => d.training_weight).filter(w => w > 0);
      stats.averageConfidence = weights.length > 0 
        ? weights.reduce((sum, w) => sum + w, 0) / weights.length 
        : 0;

      // Get recent batches
      const batchGroups = datasets.reduce((groups, dataset) => {
        const batchId = dataset.batch_id;
        if (!groups[batchId]) {
          groups[batchId] = {
            batch_id: batchId,
            created_at: dataset.created_at,
            datasets: []
          };
        }
        groups[batchId].datasets.push(dataset);
        return groups;
      }, {} as Record<string, any>);

      stats.recentBatches = Object.values(batchGroups)
        .map((batch: any) => ({
          batch_id: batch.batch_id,
          created_at: batch.created_at,
          total_datasets: batch.datasets.length,
          validation_status_counts: batch.datasets.reduce((counts: Record<string, number>, dataset: any) => {
            counts[dataset.validation_status] = (counts[dataset.validation_status] || 0) + 1;
            return counts;
          }, {})
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    }

    return stats;
  }

  // Private helper methods

  private async parseExcelFile(file: File): Promise<ExcelParseResult> {
    return parseExcelScorecardData(file);
  }

  private async validateScorecardData(
    data: ParsedScorecardData[], 
    trainingProgram: BDRTrainingProgram
  ): Promise<ScorecardValidationResult> {
    return validateScorecardData(data, trainingProgram);
  }

  private async fetchMatchingRecordings(userId?: string): Promise<RecordingData[]> {
    let query = supabase
      .from('recordings')
      .select(`
        id,
        title,
        user_id,
        call_date,
        created_at,
        duration_seconds,
        transcript,
        ai_summary,
        coaching_evaluation,
        metadata
      `);

    // If userId provided, only match recordings from that user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Only include recordings with transcripts for better matching
    query = query.not('transcript', 'is', null);

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching recordings for matching:', error);
      return [];
    }

    return data || [];
  }

  private async matchCallsToRecordings(
    validatedRecords: ValidatedScorecardRecord[],
    recordings: RecordingData[],
    userId?: string
  ): Promise<BatchMatchResult> {
    const scorecardEntries = validatedRecords.map(r => r.normalizedData);
    return matchCallsToRecordings(scorecardEntries, recordings, userId);
  }

  private async transformToTrainingData(
    validatedRecords: ValidatedScorecardRecord[],
    matchResults: CallMatchResult[],
    trainingProgram: BDRTrainingProgram,
    managerId: string
  ): Promise<TransformationResult> {
    return transformToTrainingDataset(
      validatedRecords,
      matchResults,
      trainingProgram,
      managerId
    );
  }

  private async storeTrainingData(
    transformationResult: TransformationResult
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Start transaction
      const { data, error } = await supabase.rpc('store_training_batch', {
        training_batch: transformationResult.trainingBatch,
        training_datasets: transformationResult.trainingDatasets,
        scorecard_evaluations: transformationResult.scorecardEvaluations,
        call_classifications: transformationResult.callClassifications
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  private createFailureResult(
    errors: TrainingDatasetError[], 
    warnings: TrainingDatasetWarning[]
  ): TrainingDatasetCreationResult {
    return {
      success: false,
      batchId: '',
      trainingDatasets: [],
      scorecardEvaluations: [],
      callClassifications: [],
      trainingBatch: {} as TrainingBatchInsert,
      summary: {
        totalRecords: 0,
        processedRecords: 0,
        matchedRecordings: 0,
        unmatchedRecords: 0,
        validationErrors: errors.length,
        warnings: warnings.length
      },
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const trainingDatasetService = new TrainingDatasetService();

// Export utility functions
export function generateDatasetSummaryReport(result: TrainingDatasetCreationResult): string {
  const lines = [];
  
  lines.push('=== BDR Training Dataset Creation Summary ===\n');
  
  // Overall status
  lines.push(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  lines.push(`Batch ID: ${result.batchId}\n`);
  
  // Processing summary
  lines.push('=== PROCESSING SUMMARY ===');
  lines.push(`Total Records: ${result.summary.totalRecords}`);
  lines.push(`Processed Records: ${result.summary.processedRecords}`);
  lines.push(`Matched Recordings: ${result.summary.matchedRecordings}`);
  lines.push(`Unmatched Records: ${result.summary.unmatchedRecords}`);
  lines.push(`Validation Errors: ${result.summary.validationErrors}`);
  lines.push(`Warnings: ${result.summary.warnings}\n`);
  
  // Created datasets
  if (result.trainingDatasets.length > 0) {
    lines.push('=== CREATED DATASETS ===');
    lines.push(`Training Datasets: ${result.trainingDatasets.length}`);
    lines.push(`Scorecard Evaluations: ${result.scorecardEvaluations.length}`);
    lines.push(`Call Classifications: ${result.callClassifications.length}\n`);
  }
  
  // Errors
  if (result.errors.length > 0) {
    lines.push('=== ERRORS ===');
    for (const error of result.errors) {
      lines.push(`${error.type} (${error.phase}): ${error.message}`);
    }
    lines.push('');
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    lines.push('=== WARNINGS ===');
    for (const warning of result.warnings) {
      lines.push(`${warning.type} (${warning.impact}): ${warning.message}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}