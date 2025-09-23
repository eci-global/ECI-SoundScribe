// Selection and distribution utilities for sentiment moments

import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';
import { calculateMomentQuality } from './quality';

/**
 * Intelligent moment selection that ensures good distribution
 */
export function selectBestMoments(
  moments: AnalysisSentimentMoment[],
  maxCount: number = 8,
  duration: number = 300
): AnalysisSentimentMoment[] {
  if (moments.length <= maxCount) return moments;
  
  // Sort by quality score
  const qualityScored = moments.map(moment => ({
    moment,
    quality: calculateMomentQuality(moment)
  })).sort((a, b) => b.quality - a.quality);
  
  // Take the highest quality moments
  const selected: AnalysisSentimentMoment[] = [];
  const timeSegments = new Set<number>();
  
  // Divide recording into time segments to ensure distribution
  const segmentSize = duration / Math.min(maxCount, 6); // Max 6 segments
  
  for (const { moment } of qualityScored) {
    if (selected.length >= maxCount) break;
    
    const segment = Math.floor(moment.start_time / segmentSize);
    
    // Try to get one moment per time segment for good distribution
    if (!timeSegments.has(segment) || selected.length < maxCount / 2) {
      selected.push(moment);
      timeSegments.add(segment);
    }
  }
  
  // If we still have room and high-quality moments, add them
  for (const { moment } of qualityScored) {
    if (selected.length >= maxCount) break;
    if (!selected.includes(moment)) {
      selected.push(moment);
    }
  }
  
  return selected.sort((a, b) => a.start_time - b.start_time);
}