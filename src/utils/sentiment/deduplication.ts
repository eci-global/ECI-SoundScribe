// Deduplication utilities for sentiment moments

import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';
import { areMomentsSimilar } from './similarity';
import { calculateMomentQuality } from './quality';

/**
 * Advanced deduplication that considers semantic similarity
 */
export function deduplicateMoments(moments: AnalysisSentimentMoment[]): AnalysisSentimentMoment[] {
  const uniqueMoments: AnalysisSentimentMoment[] = [];
  
  // Sort moments by quality (highest first) so we keep the best versions
  const sortedMoments = moments
    .map(moment => ({ moment, quality: calculateMomentQuality(moment) }))
    .sort((a, b) => b.quality - a.quality)
    .map(item => item.moment);
  
  for (const moment of sortedMoments) {
    // Check if this moment is similar to any existing unique moment
    const isDuplicate = uniqueMoments.some(existing => 
      areMomentsSimilar(moment, existing, { exactTextMatch: true }) || // First check for exact matches
      areMomentsSimilar(moment, existing) // Then check for similar matches
    );
    
    if (!isDuplicate) {
      uniqueMoments.push(moment);
    } else {
      console.log(`🔍 Filtered duplicate moment: "${moment.text?.substring(0, 50)}..."`);
    }
  }
  
  console.log(`✨ Deduplication: ${moments.length} → ${uniqueMoments.length} moments`);
  return uniqueMoments;
}
