import { supabase } from '@/integrations/supabase/client';
import { AICalibrationService } from './aiCalibrationService';
import { ManagerValidationWorkflow } from './managerValidationWorkflow';

export interface ConstraintUpdate {
  id: string;
  type: 'manager_feedback' | 'validation_workflow' | 'system_calibration';
  timestamp: string;
  changes: Record<string, any>;
  applied: boolean;
  error?: string;
}

export interface RealtimeUpdateEvent {
  type: 'constraint_updated' | 'validation_required' | 'calibration_completed';
  data: any;
  timestamp: string;
}

/**
 * Real-time Constraint Update Service
 * Handles real-time updates to AI constraints when managers provide corrections
 */
export class RealtimeConstraintService {
  private static listeners: Array<(event: RealtimeUpdateEvent) => void> = [];
  private static isListening = false;

  /**
   * Initialize real-time constraint updates
   */
  static async initialize(): Promise<void> {
    if (this.isListening) return;

    try {
      // Listen for manager feedback corrections
      const feedbackChannel = supabase
        .channel('manager_feedback_corrections')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'manager_feedback_corrections'
          },
          async (payload) => {
            console.log('New manager feedback correction received:', payload);
            await this.handleManagerFeedback(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'manager_feedback_corrections'
          },
          async (payload) => {
            console.log('Manager feedback correction updated:', payload);
            await this.handleManagerFeedbackUpdate(payload.new);
          }
        )
        .subscribe();

      // Listen for validation queue updates
      const validationChannel = supabase
        .channel('validation_queue')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'validation_queue'
          },
          async (payload) => {
            console.log('New validation item added:', payload);
            await this.handleValidationItem(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'validation_queue'
          },
          async (payload) => {
            console.log('Validation item updated:', payload);
            await this.handleValidationUpdate(payload.new);
          }
        )
        .subscribe();

      this.isListening = true;
      console.log('Real-time constraint updates initialized');

    } catch (error) {
      console.error('Error initializing real-time constraint updates:', error);
    }
  }

  /**
   * Handle new manager feedback corrections
   */
  private static async handleManagerFeedback(correction: any): Promise<void> {
    try {
      // Check if this is a high-variance correction
      const variance = Math.abs(correction.corrected_overall_score - correction.original_overall_score);
      
      if (variance > 1.0) {
        // High variance - trigger immediate constraint update
        await this.triggerImmediateConstraintUpdate(correction);
        
        // Create validation alert
        await ManagerValidationWorkflow.createValidationAlert(
          'high_variance',
          variance > 2.0 ? 'critical' : 'high',
          `High variance detected: ${variance.toFixed(2)} points difference`,
          correction.evaluation_id,
          correction.recording_id
        );
      }

      // Update AI constraints
      await this.updateAIConstraints(correction);

      // Emit real-time event
      this.emitEvent({
        type: 'constraint_updated',
        data: {
          correctionId: correction.id,
          variance,
          constraintType: 'manager_feedback'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling manager feedback:', error);
    }
  }

  /**
   * Handle manager feedback updates
   */
  private static async handleManagerFeedbackUpdate(correction: any): Promise<void> {
    try {
      // If status changed to 'applied', update constraints
      if (correction.status === 'applied') {
        await this.updateAIConstraints(correction);
        
        this.emitEvent({
          type: 'constraint_updated',
          data: {
            correctionId: correction.id,
            status: 'applied',
            constraintType: 'manager_feedback'
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error handling manager feedback update:', error);
    }
  }

  /**
   * Handle new validation items
   */
  private static async handleValidationItem(validationItem: any): Promise<void> {
    try {
      // Check if this is a critical priority item
      if (validationItem.priority === 'critical') {
        // Trigger immediate validation workflow
        await this.triggerValidationWorkflow(validationItem);
      }

      this.emitEvent({
        type: 'validation_required',
        data: {
          validationId: validationItem.id,
          priority: validationItem.priority,
          variance: validationItem.variance
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling validation item:', error);
    }
  }

  /**
   * Handle validation updates
   */
  private static async handleValidationUpdate(validationItem: any): Promise<void> {
    try {
      // If validation was processed, update constraints
      if (validationItem.status === 'validated' && validationItem.score_adjustments) {
        await this.updateAIConstraintsFromValidation(validationItem);
        
        this.emitEvent({
          type: 'constraint_updated',
          data: {
            validationId: validationItem.id,
            adjustments: validationItem.score_adjustments,
            constraintType: 'validation_workflow'
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error handling validation update:', error);
    }
  }

  /**
   * Trigger immediate constraint update for high-variance corrections
   */
  private static async triggerImmediateConstraintUpdate(correction: any): Promise<void> {
    try {
      // Get current constraints
      const constraints = await AICalibrationService.getCalibrationConstraints();
      
      // Apply immediate adjustment based on correction
      const criteriaAdjustments = correction.criteria_adjustments || {};
      const updatedConstraints = constraints.map(constraint => {
        if (criteriaAdjustments[constraint.criteria]) {
          const adjustment = criteriaAdjustments[constraint.criteria];
          const originalScore = correction.original_ai_scores[constraint.criteria]?.score || 0;
          const adjustmentFactor = (adjustment.score - originalScore) * 0.1; // 10% immediate adjustment
          
          return {
            ...constraint,
            adjustmentFactor: constraint.adjustmentFactor + adjustmentFactor,
            lastUpdated: new Date().toISOString()
          };
        }
        return constraint;
      });

      // Store updated constraints
      await supabase
        .from('ai_calibration_constraints')
        .upsert({
          id: 'current',
          constraints: updatedConstraints,
          updated_at: new Date().toISOString()
        });

      console.log('Immediate constraint update applied for high-variance correction');

    } catch (error) {
      console.error('Error triggering immediate constraint update:', error);
    }
  }

  /**
   * Update AI constraints based on manager feedback
   */
  private static async updateAIConstraints(correction: any): Promise<void> {
    try {
      // Update constraints using the calibration service
      await AICalibrationService.updateAIConstraints();
      
      // Log the constraint update
      await supabase
        .from('constraint_updates')
        .insert({
          type: 'manager_feedback',
          correction_id: correction.id,
          changes: {
            criteriaAdjustments: correction.criteria_adjustments,
            overallVariance: correction.score_variance,
            changeReason: correction.change_reason
          },
          applied: true,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error updating AI constraints:', error);
      
      // Log the error
      await supabase
        .from('constraint_updates')
        .insert({
          type: 'manager_feedback',
          correction_id: correction.id,
          changes: {},
          applied: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
    }
  }

  /**
   * Update AI constraints from validation workflow
   */
  private static async updateAIConstraintsFromValidation(validationItem: any): Promise<void> {
    try {
      // Update constraints using the calibration service
      await AICalibrationService.updateAIConstraints();
      
      // Log the constraint update
      await supabase
        .from('constraint_updates')
        .insert({
          type: 'validation_workflow',
          validation_id: validationItem.id,
          changes: {
            scoreAdjustments: validationItem.score_adjustments,
            variance: validationItem.variance,
            priority: validationItem.priority
          },
          applied: true,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error updating AI constraints from validation:', error);
    }
  }

  /**
   * Trigger validation workflow for critical items
   */
  private static async triggerValidationWorkflow(validationItem: any): Promise<void> {
    try {
      // Assign to available manager
      const { data: managers, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'manager')
        .eq('is_active', true)
        .limit(1);

      if (error || !managers || managers.length === 0) {
        console.warn('No available managers for critical validation');
        return;
      }

      // Update validation item with assigned manager
      await supabase
        .from('validation_queue')
        .update({
          assigned_manager: managers[0].id,
          status: 'in_review',
          assigned_at: new Date().toISOString()
        })
        .eq('id', validationItem.id);

      console.log('Critical validation item assigned to manager');

    } catch (error) {
      console.error('Error triggering validation workflow:', error);
    }
  }

  /**
   * Add event listener for real-time updates
   */
  static addEventListener(listener: (event: RealtimeUpdateEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  static removeEventListener(listener: (event: RealtimeUpdateEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit real-time event to all listeners
   */
  private static emitEvent(event: RealtimeUpdateEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Get recent constraint updates
   */
  static async getRecentConstraintUpdates(limit: number = 10): Promise<ConstraintUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('constraint_updates')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error getting recent constraint updates:', error);
      return [];
    }
  }

  /**
   * Get constraint update statistics
   */
  static async getConstraintUpdateStats(): Promise<{
    totalUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    averageUpdateTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('constraint_updates')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) throw error;

      const totalUpdates = data.length;
      const successfulUpdates = data.filter(u => u.applied).length;
      const failedUpdates = totalUpdates - successfulUpdates;

      return {
        totalUpdates,
        successfulUpdates,
        failedUpdates,
        averageUpdateTime: 0 // TODO: Calculate based on processing time
      };

    } catch (error) {
      console.error('Error getting constraint update stats:', error);
      return {
        totalUpdates: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        averageUpdateTime: 0
      };
    }
  }

  /**
   * Cleanup and stop listening
   */
  static async cleanup(): Promise<void> {
    try {
      await supabase.removeAllChannels();
      this.isListening = false;
      this.listeners = [];
      console.log('Real-time constraint updates cleaned up');

    } catch (error) {
      console.error('Error cleaning up real-time constraint updates:', error);
    }
  }
}

export default RealtimeConstraintService;
