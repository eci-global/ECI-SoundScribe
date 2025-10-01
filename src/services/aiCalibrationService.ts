import { supabase } from '@/integrations/supabase/client';

interface ManagerCorrectionRecord {
  id: string;
  created_at: string;
  change_reason: string;
  score_variance: number;
  corrected_overall_score?: number;
  original_overall_score?: number;
  criteria_adjustments?: Record<string, { score: number; feedback?: string }>;
  original_ai_scores?: Record<string, { score: number }>;
}

export interface CalibrationConstraint {
  criteria: string;
  adjustmentFactor: number;
  confidence: number;
  sampleSize: number;
  lastUpdated: string;
}

export interface ManagerCorrectionPattern {
  criteria: string;
  commonReasons: string[];
  averageVariance: number;
  adjustmentTrend: number;
  confidence: number;
}

export interface CalibrationData {
  constraints: CalibrationConstraint[];
  patterns: ManagerCorrectionPattern[];
  overallAlignment: number;
  lastCalibration: string;
}

/**
 * AI Calibration Service
 * Incorporates manager corrections into AI training constraints
 */
export class AICalibrationService {
  
  /**
   * Get current calibration constraints based on manager feedback
   */
  static async getCalibrationConstraints(): Promise<CalibrationConstraint[]> {
    try {
      const corrections = await this.fetchRecentCorrections();

      // Calculate constraints for each criteria
      const constraintsMap = new Map<string, {
        adjustments: number[];
        originalScores: number[];
        variances: number[];
        reasons: string[];
        lastUpdated: string;
      }>();

      corrections.forEach(correction => {
        const criteriaAdjustments = correction.criteria_adjustments || {};
        
        Object.entries(criteriaAdjustments).forEach(([criteria, adjustment]: [string, any]) => {
          if (typeof adjustment?.score !== 'number') {
            return;
          }

          if (!constraintsMap.has(criteria)) {
            constraintsMap.set(criteria, {
              adjustments: [],
              originalScores: [],
              variances: [],
              reasons: [],
              lastUpdated: correction.created_at
            });
          }

          const constraint = constraintsMap.get(criteria)!;
          const appliedScore = adjustment.score;
          constraint.adjustments.push(appliedScore);

          const originalScore = correction.original_ai_scores?.[criteria]?.score ?? correction.original_overall_score;
          if (typeof originalScore === 'number') {
            constraint.originalScores.push(originalScore);
            constraint.variances.push(Math.abs(appliedScore - originalScore));
          } else if (typeof correction.score_variance === 'number') {
            constraint.variances.push(correction.score_variance);
          }
          constraint.reasons.push(correction.change_reason);
          if (!constraint.lastUpdated || correction.created_at > constraint.lastUpdated) {
            constraint.lastUpdated = correction.created_at;
          }
        });
      });

      // Convert to calibration constraints
      const constraints: CalibrationConstraint[] = [];
      
      constraintsMap.forEach((data, criteria) => {
        const averageAdjustment = data.adjustments.reduce((sum, adj) => sum + adj, 0) / data.adjustments.length;
        const averageOriginal = data.originalScores.length > 0
          ? data.originalScores.reduce((sum, score) => sum + score, 0) / data.originalScores.length
          : 0;
        const averageVariance = data.variances.length > 0
          ? data.variances.reduce((sum, variance) => sum + variance, 0) / data.variances.length
          : 0;
        const confidence = Math.min(1, data.adjustments.length / 10); // Confidence based on sample size
        
        // Calculate adjustment factor (negative means AI is too high, positive means too low)
        const adjustmentFactor = averageAdjustment - averageOriginal;
        
        constraints.push({
          criteria,
          adjustmentFactor: Math.max(-0.5, Math.min(0.5, adjustmentFactor)), // Cap at ±0.5
          confidence,
          sampleSize: data.adjustments.length,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        });
      });

      return constraints;

    } catch (error) {
      console.error('Error getting calibration constraints:', error);
      return [];
    }
  }

  /**
   * Get manager correction patterns for AI training
   */
  static async getManagerCorrectionPatterns(): Promise<ManagerCorrectionPattern[]> {
    try {
      const corrections = await this.fetchRecentCorrections();

      const patternsMap = new Map<string, {
        reasons: string[];
        variances: number[];
        adjustments: number[];
      }>();

      corrections.forEach(correction => {
        const criteriaAdjustments = correction.criteria_adjustments || {};
        
        Object.entries(criteriaAdjustments).forEach(([criteria, adjustment]: [string, any]) => {
          if (typeof adjustment?.score !== 'number') {
            return;
          }

          if (!patternsMap.has(criteria)) {
            patternsMap.set(criteria, {
              reasons: [],
              variances: [],
              adjustments: []
            });
          }

          const pattern = patternsMap.get(criteria)!;
          pattern.reasons.push(correction.change_reason);
          const variance = typeof correction.score_variance === 'number'
            ? correction.score_variance
            : (() => {
                const originalScore = correction.original_ai_scores?.[criteria]?.score ?? correction.original_overall_score;
                return typeof originalScore === 'number'
                  ? Math.abs(adjustment.score - originalScore)
                  : 0;
              })();
          pattern.variances.push(variance);
          pattern.adjustments.push(adjustment.score);
        });
      });

      const patterns: ManagerCorrectionPattern[] = [];
      
      patternsMap.forEach((data, criteria) => {
        // Find most common reasons
        const reasonCounts = data.reasons.reduce((acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const commonReasons = Object.entries(reasonCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([reason]) => reason);

        const averageVariance = data.variances.length > 0
          ? data.variances.reduce((sum, variance) => sum + variance, 0) / data.variances.length
          : 0;
        
        // Calculate adjustment trend (positive = managers consistently increase scores)
        const adjustmentTrend = data.adjustments.reduce((sum, adj, i) => {
          return sum + (adj - (data.adjustments[i - 1] || adj));
        }, 0) / Math.max(1, data.adjustments.length - 1);

        patterns.push({
          criteria,
          commonReasons,
          averageVariance,
          adjustmentTrend,
          confidence: Math.min(1, data.reasons.length / 20) // Confidence based on sample size
        });
      });

      return patterns;

    } catch (error) {
      console.error('Error getting manager correction patterns:', error);
      return [];
    }
  }

  /**
   * Generate AI calibration prompt based on manager feedback
   */
  static async generateCalibrationPrompt(): Promise<string> {
    try {
      const [constraints, patterns] = await Promise.all([
        this.getCalibrationConstraints(),
        this.getManagerCorrectionPatterns()
      ]);

      let prompt = "AI CALIBRATION CONSTRAINTS BASED ON MANAGER FEEDBACK:\n\n";

      if (constraints.length === 0) {
        prompt += "No calibration data available. Use default scoring criteria.\n";
        return prompt;
      }

      prompt += "MANAGER FEEDBACK ANALYSIS:\n";
      prompt += `Based on ${constraints.reduce((sum, c) => sum + c.sampleSize, 0)} manager corrections:\n\n`;

      // Add constraints for each criteria
      constraints.forEach(constraint => {
        prompt += `${constraint.criteria.toUpperCase()}:\n`;
        prompt += `- Adjustment Factor: ${constraint.adjustmentFactor > 0 ? '+' : ''}${constraint.adjustmentFactor.toFixed(2)} (${constraint.confidence.toFixed(2)} confidence)\n`;
        prompt += `- Sample Size: ${constraint.sampleSize} corrections\n`;
        
        if (constraint.adjustmentFactor > 0.1) {
          prompt += `- MANAGER FEEDBACK: AI tends to score too low on this criteria. Increase scoring sensitivity.\n`;
        } else if (constraint.adjustmentFactor < -0.1) {
          prompt += `- MANAGER FEEDBACK: AI tends to score too high on this criteria. Decrease scoring sensitivity.\n`;
        } else {
          prompt += `- MANAGER FEEDBACK: AI scoring is well-aligned with manager expectations.\n`;
        }
        prompt += "\n";
      });

      // Add patterns
      if (patterns.length > 0) {
        prompt += "COMMON CORRECTION PATTERNS:\n";
        patterns.forEach(pattern => {
          prompt += `${pattern.criteria.toUpperCase()}:\n`;
          prompt += `- Most common reasons: ${pattern.commonReasons.join(', ')}\n`;
          prompt += `- Average variance: ${pattern.averageVariance.toFixed(2)}\n`;
          prompt += `- Adjustment trend: ${pattern.adjustmentTrend > 0 ? 'Managers consistently increase scores' : 'Managers consistently decrease scores'}\n\n`;
        });
      }

      prompt += "SCORING INSTRUCTIONS:\n";
      prompt += "1. Apply the adjustment factors when scoring each criteria\n";
      prompt += "2. Pay special attention to criteria with high variance\n";
      prompt += "3. Use manager feedback patterns to improve scoring accuracy\n";
      prompt += "4. When in doubt, err on the side of the manager feedback trends\n";

      return prompt;

    } catch (error) {
      console.error('Error generating calibration prompt:', error);
      return "Use default scoring criteria.";
    }
  }

  /**
   * Update AI model constraints in real-time
   */
  static async updateAIConstraints(): Promise<{ success: boolean; constraints?: CalibrationConstraint[] }> {
    try {
      const constraints = await this.getCalibrationConstraints();
      
      // Store constraints in database for AI functions to use
      const { error } = await supabase
        .from('ai_calibration_constraints')
        .upsert({
          id: 'current',
          constraints,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true, constraints };

    } catch (error) {
      console.error('Error updating AI constraints:', error);
      return { success: false };
    }
  }

  /**
   * Get overall alignment score between AI and managers
   */
  static async getOverallAlignment(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('manager_feedback_corrections')
        .select('score_variance, high_variance')
        .eq('status', 'applied')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) throw error;

      if (data.length === 0) return 1.0; // Perfect alignment if no corrections

      const averageVariance = data.reduce((sum, c) => sum + c.score_variance, 0) / data.length;
      const highVarianceRate = data.filter(c => c.high_variance).length / data.length;

      // Calculate alignment score (0-1, where 1 is perfect alignment)
      const varianceScore = Math.max(0, 1 - (averageVariance / 2)); // Penalize high variance
      const consistencyScore = 1 - highVarianceRate; // Penalize high variance rate
      
      return (varianceScore + consistencyScore) / 2;

    } catch (error) {
      console.error('Error calculating overall alignment:', error);
      return 0.5; // Default to moderate alignment
    }
  }

  /**
   * Trigger real-time constraint updates
   */
  static async triggerConstraintUpdate(): Promise<void> {
    try {
      // Update constraints
      await this.updateAIConstraints();
      
      // Log the update
      await supabase
        .from('ai_calibration_logs')
        .insert({
          action: 'constraints_updated',
          details: 'Manager feedback incorporated into AI constraints',
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error triggering constraint update:', error);
    }
  }

  /**
   * Fetch recent manager corrections with only required fields
   */
  private static async fetchRecentCorrections(days = 90): Promise<ManagerCorrectionRecord[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('manager_feedback_corrections')
        .select('id, created_at, change_reason, score_variance, corrected_overall_score, original_overall_score, criteria_adjustments, original_ai_scores')
        .eq('status', 'applied')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error || !data) {
        if (error) {
          console.error('Error fetching manager corrections:', error);
        }
        return [];
      }

      return data as ManagerCorrectionRecord[];

    } catch (error) {
      console.error('Unexpected error fetching manager corrections:', error);
      return [];
    }
  }
}

export default AICalibrationService;
