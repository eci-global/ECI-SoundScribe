// Validation utilities for sentiment data

import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';

/**
 * Validate that sentiment data makes logical sense
 */
export function validateSentimentData(moments: AnalysisSentimentMoment[]): {
  valid: AnalysisSentimentMoment[];
  invalid: AnalysisSentimentMoment[];
  issues: string[];
} {
  const valid: AnalysisSentimentMoment[] = [];
  const invalid: AnalysisSentimentMoment[] = [];
  const issues: string[] = [];
  
  for (const moment of moments) {
    const momentIssues: string[] = [];
    
    // Validate confidence range
    if (moment.confidence < 0 || moment.confidence > 1) {
      momentIssues.push('Invalid confidence value');
    }
    
    // Validate intensity range
    if (moment.intensity < 0 || moment.intensity > 1) {
      momentIssues.push('Invalid intensity value');
    }
    
    // Validate time consistency
    if (moment.start_time < 0 || moment.end_time < moment.start_time) {
      momentIssues.push('Invalid time range');
    }
    
    // Validate sentiment consistency
    if (moment.sentiment === 'positive' && moment.intensity < 0.2) {
      momentIssues.push('Low intensity for positive sentiment');
    }
    if (moment.sentiment === 'negative' && moment.intensity < 0.2) {
      momentIssues.push('Low intensity for negative sentiment');
    }
    
    if (momentIssues.length === 0) {
      valid.push(moment);
    } else {
      invalid.push(moment);
      issues.push(...momentIssues.map(issue => `Moment ${moment.id}: ${issue}`));
    }
  }
  
  return { valid, invalid, issues };
}