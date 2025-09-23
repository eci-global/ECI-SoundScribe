// Text similarity and moment comparison utilities

import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';

/**
 * Calculate semantic similarity between two text strings
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Check if two moments are semantically similar
 */
export function areMomentsSimilar(
  moment1: AnalysisSentimentMoment,
  moment2: AnalysisSentimentMoment,
  options: {
    timeWindowSeconds?: number;
    textSimilarityThreshold?: number;
    sameSentimentRequired?: boolean;
    exactTextMatch?: boolean;
  } = {}
): boolean {
  const {
    timeWindowSeconds = 120, // Increased from 30 to catch duplicates across longer time spans
    textSimilarityThreshold = 0.8, // Increased to be more strict about similar text
    sameSentimentRequired = true,
    exactTextMatch = false
  } = options;

  // Check for exact text duplicates (this catches the obvious duplicates)
  if (moment1.text && moment2.text) {
    const text1 = moment1.text.trim().toLowerCase();
    const text2 = moment2.text.trim().toLowerCase();
    
    if (exactTextMatch && text1 === text2 && moment1.sentiment === moment2.sentiment) {
      return true; // Exact match regardless of time
    }
    
    // Check for very high text similarity (>90%) - likely duplicates
    const textSimilarity = calculateTextSimilarity(text1, text2);
    if (textSimilarity > 0.9 && moment1.sentiment === moment2.sentiment) {
      return true; // Very similar text with same sentiment = duplicate
    }
  }

  // Check time proximity for regular similarity detection
  const timeDiff = Math.abs(moment1.start_time - moment2.start_time);
  const timesSimilar = timeDiff <= timeWindowSeconds;

  // Check sentiment match if required
  const sentimentsSimilar = !sameSentimentRequired || moment1.sentiment === moment2.sentiment;

  // Check text similarity
  const textSimilarity = calculateTextSimilarity(moment1.text || '', moment2.text || '');
  const textsSimilar = textSimilarity >= textSimilarityThreshold;

  return timesSimilar && sentimentsSimilar && textsSimilar;
}