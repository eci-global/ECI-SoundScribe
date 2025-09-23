// Quality assessment utilities for sentiment moments

import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';

/**
 * Quality score for a sentiment moment
 */
export function calculateMomentQuality(moment: AnalysisSentimentMoment): number {
  let score = 0;
  
  // Base confidence score (0-40 points)
  score += (moment.confidence || 0) * 40;
  
  // Text quality (0-20 points)
  if (moment.text) {
    const textLength = moment.text.length;
    if (textLength > 10) score += 10; // Has meaningful text
    if (textLength > 30) score += 5;  // Has substantial text
    if (!/^(AI-identified|Emotional shift|No text)/.test(moment.text)) score += 5; // Not a generic placeholder
  }
  
  // Speaker information (0-10 points)
  if (moment.speaker && moment.speaker !== 'Unknown') score += 10;
  
  // Intensity appropriateness (0-15 points)
  const intensity = moment.intensity || 0;
  if (intensity > 0.3 && intensity < 0.9) score += 15; // Realistic intensity range
  
  // Time validity (0-15 points)
  if (moment.start_time >= 0 && moment.end_time > moment.start_time) score += 15;
  
  return Math.min(score, 100); // Cap at 100
}

/**
 * Filter moments by quality threshold
 */
export function filterHighQualityMoments(
  moments: AnalysisSentimentMoment[],
  qualityThreshold: number = 60
): AnalysisSentimentMoment[] {
  return moments.filter(moment => calculateMomentQuality(moment) >= qualityThreshold);
}