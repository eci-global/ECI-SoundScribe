import { supabase } from '@/integrations/supabase/client';

export interface ValidationQueueItem {
  id: string;
  recordingId: string;
  evaluationId: string;
  aiScore: number;
  historicalAverage: number;
  variance: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  criteria: string[];
  createdAt: string;
  assignedManager?: string;
  status: 'pending' | 'in_review' | 'validated' | 'rejected';
}

export interface ValidationAlert {
  id: string;
  type: 'high_variance' | 'pattern_anomaly' | 'bias_detected' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  evaluationId: string;
  recordingId: string;
  createdAt: string;
  resolved: boolean;
}

export interface ValidationStats {
  totalPending: number;
  highPriority: number;
  averageProcessingTime: number;
  managerWorkload: Array<{
    managerId: string;
    managerName: string;
    pendingCount: number;
    averageProcessingTime: number;
  }>;
}

/**
 * Manager Validation Workflow Service
 * Handles high-variance AI scores and manager validation workflow
 */
export class ManagerValidationWorkflow {
  
  /**
   * Detect high-variance AI scores that need manager validation
   */
  static async detectHighVarianceScores(): Promise<ValidationQueueItem[]> {
    try {
      // Get recent AI evaluations
      const { data: evaluations, error } = await supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          *,
          recordings!bdr_scorecard_evaluations_recording_id_fkey(*)
        `)
        .gte('evaluated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .eq('evaluator_type', 'ai')
        .order('evaluated_at', { ascending: false });

      if (error) throw error;

      const validationItems: ValidationQueueItem[] = [];

      for (const evaluation of evaluations) {
        const aiScore = evaluation.overall_score || 0;
        
        // Calculate historical average for this user/context
        const historicalAverage = await this.calculateHistoricalAverage(evaluation.user_id, evaluation.recording_id);
        
        // Calculate variance
        const variance = Math.abs(aiScore - historicalAverage);
        
        // Determine if validation is needed
        if (variance > 1.0 || this.detectPatternAnomaly(evaluation)) {
          const priority = this.calculatePriority(variance, evaluation);
          
          validationItems.push({
            id: `validation_${evaluation.id}`,
            recordingId: evaluation.recording_id,
            evaluationId: evaluation.id,
            aiScore,
            historicalAverage,
            variance,
            priority,
            criteria: Object.keys(evaluation.criteria_scores || {}),
            createdAt: evaluation.evaluated_at,
            status: 'pending'
          });
        }
      }

      return validationItems;

    } catch (error) {
      console.error('Error detecting high-variance scores:', error);
      return [];
    }
  }

  /**
   * Calculate historical average score for context
   */
  private static async calculateHistoricalAverage(userId: string, recordingId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('bdr_scorecard_evaluations')
        .select('overall_score')
        .eq('user_id', userId)
        .neq('recording_id', recordingId) // Exclude current recording
        .gte('evaluated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('evaluated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data.length === 0) return 2.5; // Default average

      return data.reduce((sum, eval) => sum + (eval.overall_score || 0), 0) / data.length;

    } catch (error) {
      console.error('Error calculating historical average:', error);
      return 2.5;
    }
  }

  /**
   * Detect pattern anomalies in AI scoring
   */
  private static detectPatternAnomaly(evaluation: any): boolean {
    const criteriaScores = evaluation.criteria_scores || {};
    const scores = Object.values(criteriaScores).map((s: any) => s.score || 0);
    
    // Check for extreme score variations within the same evaluation
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const scoreRange = maxScore - minScore;
    
    // Flag if there's a 3+ point difference between criteria
    return scoreRange > 3.0;
  }

  /**
   * Calculate validation priority
   */
  private static calculatePriority(variance: number, evaluation: any): 'low' | 'medium' | 'high' | 'critical' {
    if (variance > 2.0) return 'critical';
    if (variance > 1.5) return 'high';
    if (variance > 1.0) return 'medium';
    return 'low';
  }

  /**
   * Get validation queue for managers
   */
  static async getValidationQueue(managerId?: string): Promise<ValidationQueueItem[]> {
    try {
      let query = supabase
        .from('validation_queue')
        .select('*')
        .in('status', ['pending', 'in_review'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (managerId) {
        query = query.eq('assigned_manager', managerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error getting validation queue:', error);
      return [];
    }
  }

  /**
   * Assign validation items to managers
   */
  static async assignValidationItems(): Promise<void> {
    try {
      const validationItems = await this.detectHighVarianceScores();
      
      // Get available managers
      const { data: managers, error: managersError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'manager')
        .eq('is_active', true);

      if (managersError) throw managersError;

      if (managers.length === 0) {
        console.warn('No active managers found for validation assignment');
        return;
      }

      // Distribute validation items among managers
      const itemsPerManager = Math.ceil(validationItems.length / managers.length);
      
      for (let i = 0; i < validationItems.length; i++) {
        const managerIndex = i % managers.length;
        const manager = managers[managerIndex];
        
        // Insert into validation queue
        await supabase
          .from('validation_queue')
          .insert({
            id: validationItems[i].id,
            recording_id: validationItems[i].recordingId,
            evaluation_id: validationItems[i].evaluationId,
            ai_score: validationItems[i].aiScore,
            historical_average: validationItems[i].historicalAverage,
            variance: validationItems[i].variance,
            priority: validationItems[i].priority,
            criteria: validationItems[i].criteria,
            assigned_manager: manager.id,
            status: 'pending',
            created_at: validationItems[i].createdAt
          });
      }

    } catch (error) {
      console.error('Error assigning validation items:', error);
    }
  }

  /**
   * Process manager validation
   */
  static async processValidation(
    validationId: string,
    managerId: string,
    action: 'approve' | 'reject' | 'adjust',
    adjustments?: Record<string, number>,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get validation item
      const { data: validationItem, error: fetchError } = await supabase
        .from('validation_queue')
        .select('*')
        .eq('id', validationId)
        .single();

      if (fetchError) throw fetchError;

      if (action === 'approve') {
        // Mark as validated
        await supabase
          .from('validation_queue')
          .update({ 
            status: 'validated',
            processed_by: managerId,
            processed_at: new Date().toISOString(),
            manager_notes: notes
          })
          .eq('id', validationId);

      } else if (action === 'reject') {
        // Mark as rejected
        await supabase
          .from('validation_queue')
          .update({ 
            status: 'rejected',
            processed_by: managerId,
            processed_at: new Date().toISOString(),
            manager_notes: notes
          })
          .eq('id', validationId);

      } else if (action === 'adjust' && adjustments) {
        // Apply score adjustments
        const { data: evaluation, error: evalError } = await supabase
          .from('bdr_scorecard_evaluations')
          .select('*')
          .eq('id', validationItem.evaluation_id)
          .single();

        if (evalError) throw evalError;

        // Update evaluation with manager adjustments
        const updatedCriteriaScores = { ...evaluation.criteria_scores };
        Object.entries(adjustments).forEach(([criteria, newScore]) => {
          if (updatedCriteriaScores[criteria]) {
            updatedCriteriaScores[criteria].score = newScore;
          }
        });

        // Recalculate overall score
        const scores = Object.values(updatedCriteriaScores).map((s: any) => s.score);
        const newOverallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        // Update evaluation
        await supabase
          .from('bdr_scorecard_evaluations')
          .update({
            criteria_scores: updatedCriteriaScores,
            overall_score: newOverallScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', validationItem.evaluation_id);

        // Mark validation as processed
        await supabase
          .from('validation_queue')
          .update({ 
            status: 'validated',
            processed_by: managerId,
            processed_at: new Date().toISOString(),
            manager_notes: notes,
            score_adjustments: adjustments
          })
          .eq('id', validationId);
      }

      return { success: true };

    } catch (error) {
      console.error('Error processing validation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get validation statistics
   */
  static async getValidationStats(): Promise<ValidationStats> {
    try {
      const { data: queueItems, error: queueError } = await supabase
        .from('validation_queue')
        .select('*');

      if (queueError) throw queueError;

      const totalPending = queueItems.filter(item => item.status === 'pending').length;
      const highPriority = queueItems.filter(item => 
        item.status === 'pending' && ['high', 'critical'].includes(item.priority)
      ).length;

      // Calculate average processing time
      const processedItems = queueItems.filter(item => 
        item.status === 'validated' && item.processed_at
      );
      
      const averageProcessingTime = processedItems.length > 0 
        ? processedItems.reduce((sum, item) => {
            const created = new Date(item.created_at);
            const processed = new Date(item.processed_at);
            return sum + (processed.getTime() - created.getTime()) / (1000 * 60); // minutes
          }, 0) / processedItems.length
        : 0;

      // Calculate manager workload
      const managerWorkload = new Map();
      queueItems.forEach(item => {
        if (item.assigned_manager) {
          if (!managerWorkload.has(item.assigned_manager)) {
            managerWorkload.set(item.assigned_manager, {
              managerId: item.assigned_manager,
              managerName: item.assigned_manager_name || 'Unknown',
              pendingCount: 0,
              totalProcessingTime: 0,
              processedCount: 0
            });
          }
          
          const manager = managerWorkload.get(item.assigned_manager);
          if (item.status === 'pending') {
            manager.pendingCount++;
          } else if (item.status === 'validated' && item.processed_at) {
            manager.processedCount++;
            const created = new Date(item.created_at);
            const processed = new Date(item.processed_at);
            manager.totalProcessingTime += (processed.getTime() - created.getTime()) / (1000 * 60);
          }
        }
      });

      const managerStats = Array.from(managerWorkload.values()).map(manager => ({
        managerId: manager.managerId,
        managerName: manager.managerName,
        pendingCount: manager.pendingCount,
        averageProcessingTime: manager.processedCount > 0 
          ? manager.totalProcessingTime / manager.processedCount 
          : 0
      }));

      return {
        totalPending,
        highPriority,
        averageProcessingTime,
        managerWorkload: managerStats
      };

    } catch (error) {
      console.error('Error getting validation stats:', error);
      return {
        totalPending: 0,
        highPriority: 0,
        averageProcessingTime: 0,
        managerWorkload: []
      };
    }
  }

  /**
   * Create validation alerts for system issues
   */
  static async createValidationAlert(
    type: ValidationAlert['type'],
    severity: ValidationAlert['severity'],
    message: string,
    evaluationId: string,
    recordingId: string
  ): Promise<void> {
    try {
      await supabase
        .from('validation_alerts')
        .insert({
          type,
          severity,
          message,
          evaluation_id: evaluationId,
          recording_id: recordingId,
          created_at: new Date().toISOString(),
          resolved: false
        });

    } catch (error) {
      console.error('Error creating validation alert:', error);
    }
  }

  /**
   * Get pending validation alerts
   */
  static async getPendingAlerts(): Promise<ValidationAlert[]> {
    try {
      const { data, error } = await supabase
        .from('validation_alerts')
        .select('*')
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error getting pending alerts:', error);
      return [];
    }
  }
}

export default ManagerValidationWorkflow;
