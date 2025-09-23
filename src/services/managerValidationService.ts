/**
 * Manager Validation Service for BDR Training Integration
 * 
 * Handles manager review and validation of training datasets, including
 * approval workflows, scoring adjustments, and validation queue management.
 */

import { supabase } from '../integrations/supabase/client';
import { BDRTrainingProgram } from '../types/bdr-training';

// Validation queue types
export interface ValidationQueueItem {
  id: string;
  recording_id: string;
  batch_id: string;
  call_identifier: string;
  confidence_score: number;
  current_scores: {
    opening: number;
    clearConfident: number;
    patternInterrupt: number;
    toneEnergy: number;
    closing: number;
    overall: number;
  };
  manager_notes?: string;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  estimated_review_time: number; // minutes
  // Joined data
  recording?: {
    title: string;
    user_id: string;
    transcript: string;
    call_date: string | null;
    duration_seconds: number | null;
  };
  scorecard_evaluation?: {
    call_date: string;
    duration_minutes: number;
    matching_confidence: number;
  };
}

export interface ValidationAction {
  type: 'approve' | 'reject' | 'adjust_scores' | 'request_review' | 'add_notes';
  item_id: string;
  manager_id: string;
  reason?: string;
  score_adjustments?: {
    opening?: number;
    clearConfident?: number;
    patternInterrupt?: number;
    toneEnergy?: number;
    closing?: number;
  };
  notes?: string;
  validation_notes?: string;
  timestamp: string;
}

export interface ValidationBatchAction {
  action_type: 'bulk_approve' | 'bulk_reject' | 'bulk_review';
  item_ids: string[];
  manager_id: string;
  reason: string;
  criteria?: {
    min_confidence?: number;
    max_confidence?: number;
    score_thresholds?: Record<string, number>;
  };
}

// Manager validation statistics
export interface ValidationStats {
  queue_summary: {
    total_pending: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    estimated_total_time: number;
  };
  manager_performance: {
    items_validated_today: number;
    items_validated_this_week: number;
    average_validation_time: number;
    accuracy_score: number; // Based on consistency with other managers
  };
  batch_progress: {
    current_batches: Array<{
      batch_id: string;
      batch_name: string;
      total_items: number;
      validated_items: number;
      pending_items: number;
      completion_percentage: number;
    }>;
  };
  quality_metrics: {
    consistency_score: number; // Consistency with AI predictions
    inter_rater_reliability: number; // Consistency with other managers
    validation_distribution: {
      approved: number;
      rejected: number;
      needs_review: number;
    };
  };
}

// Validation configuration
export interface ValidationConfig {
  auto_approve_threshold: number; // Confidence threshold for auto-approval
  priority_thresholds: {
    high_priority_below: number; // Items below this confidence are high priority
    low_priority_above: number; // Items above this confidence are low priority
  };
  quality_controls: {
    require_notes_for_rejection: boolean;
    require_notes_for_score_changes: boolean;
    flag_large_score_deviations: boolean;
    max_score_deviation: number;
  };
  batch_size_limits: {
    max_items_per_session: number;
    recommended_session_duration: number; // minutes
  };
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  auto_approve_threshold: 0.9,
  priority_thresholds: {
    high_priority_below: 0.6,
    low_priority_above: 0.85
  },
  quality_controls: {
    require_notes_for_rejection: true,
    require_notes_for_score_changes: true,
    flag_large_score_deviations: true,
    max_score_deviation: 3
  },
  batch_size_limits: {
    max_items_per_session: 20,
    recommended_session_duration: 60
  }
};

/**
 * Main manager validation service class
 */
export class ManagerValidationService {

  /**
   * Get validation queue for a manager with filtering and prioritization
   */
  async getValidationQueue(
    managerId: string,
    options: {
      priority?: 'high' | 'medium' | 'low';
      batch_id?: string;
      status?: 'pending' | 'needs_review';
      limit?: number;
      offset?: number;
      order_by?: 'priority' | 'confidence' | 'created_at';
    } = {}
  ): Promise<{
    items: ValidationQueueItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = supabase
      .from('bdr_training_datasets')
      .select(`
        id,
        recording_id,
        batch_id,
        scorecard_data,
        validation_status,
        training_weight,
        created_at,
        recording:recordings(title, user_id, transcript, call_date, duration_seconds),
        scorecard_evaluation:bdr_scorecard_evaluations(call_date, duration_minutes, matching_confidence, call_identifier)
      `, { count: 'exact' })
      .eq('manager_id', managerId)
      .in('validation_status', ['pending', 'needs_review']);

    // Apply filters
    if (options.batch_id) {
      query = query.eq('batch_id', options.batch_id);
    }
    
    if (options.status) {
      query = query.eq('validation_status', options.status);
    }

    // Apply ordering
    switch (options.order_by) {
      case 'priority':
        // Custom ordering by priority (low confidence first)
        query = query.order('training_weight', { ascending: true });
        break;
      case 'confidence':
        query = query.order('training_weight', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: true }); // FIFO by default
    }

    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Failed to get validation queue: ${error.message}`);
    }

    // Transform data to validation queue items
    const items: ValidationQueueItem[] = (data || []).map(item => {
      const scorecardData = item.scorecard_data || {};
      const criteriaScores = scorecardData.criteria_scores || {};
      
      // Calculate priority based on confidence score
      const confidenceScore = item.training_weight;
      let priority: 'high' | 'medium' | 'low';
      if (confidenceScore < DEFAULT_VALIDATION_CONFIG.priority_thresholds.high_priority_below) {
        priority = 'high';
      } else if (confidenceScore > DEFAULT_VALIDATION_CONFIG.priority_thresholds.low_priority_above) {
        priority = 'low';
      } else {
        priority = 'medium';
      }

      // Estimate review time based on priority and complexity
      const estimatedReviewTime = this.calculateEstimatedReviewTime(priority, item.recording?.transcript?.length || 0);

      return {
        id: item.id,
        recording_id: item.recording_id,
        batch_id: item.batch_id,
        call_identifier: item.scorecard_evaluation?.call_identifier || item.recording?.title || 'Unknown',
        confidence_score: confidenceScore,
        current_scores: {
          opening: criteriaScores.opening_and_introduction?.score || 0,
          clearConfident: criteriaScores.qualifying_questions?.score || 0,
          patternInterrupt: criteriaScores.pain_point_identification?.score || 0,
          toneEnergy: criteriaScores.value_articulation?.score || 0,
          closing: criteriaScores.objection_handling?.score || 0,
          overall: scorecardData.overall_score || 0
        },
        manager_notes: scorecardData.manager_notes,
        validation_status: item.validation_status,
        created_at: item.created_at,
        priority,
        estimated_review_time: estimatedReviewTime,
        recording: item.recording,
        scorecard_evaluation: item.scorecard_evaluation
      };
    });

    // Apply priority filter after transformation
    const filteredItems = options.priority 
      ? items.filter(item => item.priority === options.priority)
      : items;

    return {
      items: filteredItems,
      totalCount: count || 0,
      hasMore: (count || 0) > (offset + limit)
    };
  }

  /**
   * Execute validation action on a single item
   */
  async executeValidationAction(
    action: ValidationAction
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const item = await this.getValidationItem(action.item_id);
      if (!item) {
        return { success: false, error: 'Validation item not found' };
      }

      // Validate action based on business rules
      const validationResult = this.validateAction(action, item);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // Execute the action
      switch (action.type) {
        case 'approve':
          return await this.approveItem(action.item_id, action.manager_id, action.notes);
        
        case 'reject':
          return await this.rejectItem(action.item_id, action.manager_id, action.reason!, action.notes);
        
        case 'adjust_scores':
          return await this.adjustScores(action.item_id, action.manager_id, action.score_adjustments!, action.notes);
        
        case 'request_review':
          return await this.requestReview(action.item_id, action.manager_id, action.reason!, action.notes);
        
        case 'add_notes':
          return await this.addNotes(action.item_id, action.manager_id, action.notes!);
        
        default:
          return { success: false, error: `Unknown action type: ${(action as any).type}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to execute validation action: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Execute bulk validation actions
   */
  async executeBatchAction(
    batchAction: ValidationBatchAction
  ): Promise<{ 
    success: boolean; 
    results: Array<{ item_id: string; success: boolean; error?: string }>;
    summary: { successful: number; failed: number; };
  }> {
    const results: Array<{ item_id: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const itemId of batchAction.item_ids) {
      try {
        let actionResult: { success: boolean; error?: string };

        switch (batchAction.action_type) {
          case 'bulk_approve':
            actionResult = await this.approveItem(itemId, batchAction.manager_id, `Bulk approval: ${batchAction.reason}`);
            break;
          
          case 'bulk_reject':
            actionResult = await this.rejectItem(itemId, batchAction.manager_id, batchAction.reason, `Bulk rejection: ${batchAction.reason}`);
            break;
          
          case 'bulk_review':
            actionResult = await this.requestReview(itemId, batchAction.manager_id, batchAction.reason, `Bulk review request: ${batchAction.reason}`);
            break;
          
          default:
            actionResult = { success: false, error: `Unknown bulk action: ${batchAction.action_type}` };
        }

        results.push({ item_id: itemId, ...actionResult });
        
        if (actionResult.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ item_id: itemId, success: false, error: errorMessage });
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: { successful, failed }
    };
  }

  /**
   * Get validation statistics for manager dashboard
   */
  async getValidationStats(managerId: string): Promise<ValidationStats> {
    // Get queue summary
    const { items: pendingItems } = await this.getValidationQueue(managerId, { limit: 1000 });
    
    const queueSummary = {
      total_pending: pendingItems.length,
      high_priority: pendingItems.filter(i => i.priority === 'high').length,
      medium_priority: pendingItems.filter(i => i.priority === 'medium').length,
      low_priority: pendingItems.filter(i => i.priority === 'low').length,
      estimated_total_time: pendingItems.reduce((sum, item) => sum + item.estimated_review_time, 0)
    };

    // Get manager performance metrics
    const managerPerformance = await this.calculateManagerPerformance(managerId);
    
    // Get batch progress
    const batchProgress = await this.getBatchProgress(managerId);
    
    // Get quality metrics
    const qualityMetrics = await this.calculateQualityMetrics(managerId);

    return {
      queue_summary: queueSummary,
      manager_performance: managerPerformance,
      batch_progress: batchProgress,
      quality_metrics: qualityMetrics
    };
  }

  /**
   * Get validation history for audit and analysis
   */
  async getValidationHistory(
    managerId: string,
    options: {
      dateRange?: { start: Date; end: Date };
      action_type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    actions: Array<{
      id: string;
      action_type: string;
      item_id: string;
      manager_id: string;
      timestamp: string;
      reason?: string;
      notes?: string;
      score_changes?: Record<string, { from: number; to: number }>;
    }>;
    totalCount: number;
  }> {
    let query = supabase
      .from('bdr_validation_history')
      .select('*', { count: 'exact' })
      .eq('manager_id', managerId);

    if (options.dateRange) {
      query = query
        .gte('timestamp', options.dateRange.start.toISOString())
        .lte('timestamp', options.dateRange.end.toISOString());
    }

    if (options.action_type) {
      query = query.eq('action_type', options.action_type);
    }

    query = query.order('timestamp', { ascending: false });

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Failed to get validation history: ${error.message}`);
    }

    return {
      actions: data || [],
      totalCount: count || 0
    };
  }

  // Private helper methods

  private async getValidationItem(itemId: string): Promise<ValidationQueueItem | null> {
    const { data, error } = await supabase
      .from('bdr_training_datasets')
      .select(`
        id,
        recording_id,
        batch_id,
        scorecard_data,
        validation_status,
        training_weight,
        created_at
      `)
      .eq('id', itemId)
      .single();

    if (error || !data) {
      return null;
    }

    // Convert to ValidationQueueItem format (simplified)
    const scorecardData = data.scorecard_data || {};
    const criteriaScores = scorecardData.criteria_scores || {};

    return {
      id: data.id,
      recording_id: data.recording_id,
      batch_id: data.batch_id,
      call_identifier: scorecardData.call_identifier || 'Unknown',
      confidence_score: data.training_weight,
      current_scores: {
        opening: criteriaScores.opening_and_introduction?.score || 0,
        clearConfident: criteriaScores.qualifying_questions?.score || 0,
        patternInterrupt: criteriaScores.pain_point_identification?.score || 0,
        toneEnergy: criteriaScores.value_articulation?.score || 0,
        closing: criteriaScores.objection_handling?.score || 0,
        overall: scorecardData.overall_score || 0
      },
      manager_notes: scorecardData.manager_notes,
      validation_status: data.validation_status,
      created_at: data.created_at,
      priority: 'medium',
      estimated_review_time: 5
    };
  }

  private validateAction(action: ValidationAction, item: ValidationQueueItem): { valid: boolean; error?: string } {
    // Check if item is in a valid state for the action
    if (item.validation_status === 'validated' && action.type !== 'add_notes') {
      return { valid: false, error: 'Item is already validated' };
    }

    // Validate required fields based on action type
    switch (action.type) {
      case 'reject':
        if (DEFAULT_VALIDATION_CONFIG.quality_controls.require_notes_for_rejection && !action.reason) {
          return { valid: false, error: 'Reason is required for rejection' };
        }
        break;
      
      case 'adjust_scores':
        if (!action.score_adjustments || Object.keys(action.score_adjustments).length === 0) {
          return { valid: false, error: 'Score adjustments are required' };
        }
        
        if (DEFAULT_VALIDATION_CONFIG.quality_controls.require_notes_for_score_changes && !action.notes) {
          return { valid: false, error: 'Notes are required for score adjustments' };
        }
        
        // Check for large score deviations
        if (DEFAULT_VALIDATION_CONFIG.quality_controls.flag_large_score_deviations) {
          for (const [criteria, newScore] of Object.entries(action.score_adjustments)) {
            const currentScore = item.current_scores[criteria as keyof typeof item.current_scores];
            const deviation = Math.abs((newScore || 0) - currentScore);
            
            if (deviation > DEFAULT_VALIDATION_CONFIG.quality_controls.max_score_deviation) {
              return { 
                valid: false, 
                error: `Large score deviation detected for ${criteria}: ${deviation} points` 
              };
            }
          }
        }
        break;
      
      case 'request_review':
        if (!action.reason) {
          return { valid: false, error: 'Reason is required for review requests' };
        }
        break;
      
      case 'add_notes':
        if (!action.notes) {
          return { valid: false, error: 'Notes content is required' };
        }
        break;
    }

    return { valid: true };
  }

  private async approveItem(itemId: string, managerId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('bdr_training_datasets')
      .update({ 
        validation_status: 'validated',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: `Failed to approve item: ${error.message}` };
    }

    await this.logValidationAction({
      type: 'approve',
      item_id: itemId,
      manager_id: managerId,
      notes,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  private async rejectItem(itemId: string, managerId: string, reason: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('bdr_training_datasets')
      .update({ 
        validation_status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: `Failed to reject item: ${error.message}` };
    }

    await this.logValidationAction({
      type: 'reject',
      item_id: itemId,
      manager_id: managerId,
      reason,
      notes,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  private async adjustScores(
    itemId: string, 
    managerId: string, 
    adjustments: Record<string, number>, 
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get current scorecard data
    const { data, error: fetchError } = await supabase
      .from('bdr_training_datasets')
      .select('scorecard_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: `Failed to fetch current data: ${fetchError.message}` };
    }

    const scorecardData = data.scorecard_data || {};
    const criteriaScores = scorecardData.criteria_scores || {};

    // Apply adjustments
    const updatedCriteriaScores = { ...criteriaScores };
    for (const [criteria, newScore] of Object.entries(adjustments)) {
      const criteriaKey = this.mapScoreCriteriaKey(criteria);
      if (updatedCriteriaScores[criteriaKey]) {
        updatedCriteriaScores[criteriaKey].score = newScore;
      }
    }

    // Recalculate overall score
    const overallScore = this.calculateOverallScore(updatedCriteriaScores);

    const updatedScorecardData = {
      ...scorecardData,
      criteria_scores: updatedCriteriaScores,
      overall_score: overallScore,
      validation_metadata: {
        ...scorecardData.validation_metadata,
        score_adjustments: adjustments,
        adjusted_by: managerId,
        adjusted_at: new Date().toISOString(),
        adjustment_notes: notes
      }
    };

    const { error } = await supabase
      .from('bdr_training_datasets')
      .update({ 
        scorecard_data: updatedScorecardData,
        validation_status: 'validated',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: `Failed to adjust scores: ${error.message}` };
    }

    await this.logValidationAction({
      type: 'adjust_scores',
      item_id: itemId,
      manager_id: managerId,
      notes,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  private async requestReview(itemId: string, managerId: string, reason: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('bdr_training_datasets')
      .update({ 
        validation_status: 'needs_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: `Failed to request review: ${error.message}` };
    }

    await this.logValidationAction({
      type: 'request_review',
      item_id: itemId,
      manager_id: managerId,
      reason,
      notes,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  private async addNotes(itemId: string, managerId: string, notes: string): Promise<{ success: boolean; error?: string }> {
    // This would update the scorecard data with additional notes
    // Implementation would be similar to adjustScores but only updating notes
    
    await this.logValidationAction({
      type: 'add_notes',
      item_id: itemId,
      manager_id: managerId,
      notes,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  private async logValidationAction(action: ValidationAction): Promise<void> {
    // Log to validation history table
    await supabase
      .from('bdr_validation_history')
      .insert({
        action_type: action.type,
        item_id: action.item_id,
        manager_id: action.manager_id,
        timestamp: action.timestamp,
        reason: action.reason,
        notes: action.notes,
        score_changes: action.score_adjustments
      });
  }

  private calculateEstimatedReviewTime(priority: string, transcriptLength: number): number {
    // Base time by priority
    const baseTime = {
      high: 10,    // 10 minutes for high priority (needs careful review)
      medium: 5,   // 5 minutes for medium priority
      low: 2       // 2 minutes for low priority (likely auto-approve)
    };

    const base = baseTime[priority as keyof typeof baseTime] || 5;
    
    // Add time based on transcript length
    const lengthFactor = Math.min(transcriptLength / 1000, 2); // Max 2x for long transcripts
    
    return Math.ceil(base * (1 + lengthFactor * 0.5));
  }

  private mapScoreCriteriaKey(criteria: string): string {
    const mapping: Record<string, string> = {
      opening: 'opening_and_introduction',
      clearConfident: 'qualifying_questions',
      patternInterrupt: 'pain_point_identification',
      toneEnergy: 'value_articulation',
      closing: 'objection_handling'
    };
    
    return mapping[criteria] || criteria;
  }

  private calculateOverallScore(criteriaScores: Record<string, any>): number {
    const scores = Object.values(criteriaScores).map((c: any) => c.score || 0);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  private async calculateManagerPerformance(managerId: string): Promise<ValidationStats['manager_performance']> {
    // This would calculate various performance metrics
    // Implementation would involve querying validation history and calculating metrics
    return {
      items_validated_today: 0,
      items_validated_this_week: 0,
      average_validation_time: 0,
      accuracy_score: 0
    };
  }

  private async getBatchProgress(managerId: string): Promise<ValidationStats['batch_progress']> {
    // This would get current batch progress
    return { current_batches: [] };
  }

  private async calculateQualityMetrics(managerId: string): Promise<ValidationStats['quality_metrics']> {
    // This would calculate quality metrics
    return {
      consistency_score: 0,
      inter_rater_reliability: 0,
      validation_distribution: {
        approved: 0,
        rejected: 0,
        needs_review: 0
      }
    };
  }
}

// Export singleton instance
export const managerValidationService = new ManagerValidationService();