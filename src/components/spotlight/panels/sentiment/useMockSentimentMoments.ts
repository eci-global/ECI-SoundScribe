import { useMemo } from 'react';
import type { Recording } from '@/types/recording';
import type { SentimentMoment } from '@/types/sentiment';

export function useMockSentimentMoments(recording: Recording): SentimentMoment[] {
  return useMemo(() => {
    if (!recording.duration) return [];

    const moments: SentimentMoment[] = [];
    const duration = recording.duration;
    
    // Generate sentiment shifts throughout the call
    const numMoments = Math.min(8, Math.max(3, Math.floor(duration / 120))); // 1 moment per 2 minutes, min 3, max 8
    
    for (let i = 0; i < numMoments; i++) {
      const timestamp = Math.floor((duration / numMoments) * i + Math.random() * (duration / numMoments));
      const sentimentScore = Math.random() * 2 - 1; // -1 to 1
      
      if (i === 1 && sentimentScore > 0.5) {
        // Positive peak
        moments.push({
          id: `positive-${i}`,
          timestamp,
          speaker: i % 2 === 0 ? 'Sales Rep' : 'Customer',
          sentimentScore: 0.8,
          intensity: 'high' as const,
          type: 'positive_peak' as const,
          text: 'That sounds exactly like what we need!',
          context: 'Customer expressing strong interest in the solution',
          confidence: 0.92,
          source: 'ai_analysis'
        });
      } else if (i === Math.floor(numMoments / 2) && sentimentScore < -0.3) {
        // Negative dip
        moments.push({
          id: `negative-${i}`,
          timestamp,
          speaker: i % 2 === 0 ? 'Sales Rep' : 'Customer',
          sentimentScore: -0.6,
          intensity: 'medium' as const,
          type: 'negative_dip' as const,
          text: 'I\'m not sure this is within our budget range...',
          context: 'Customer expressing price concerns',
          confidence: 0.87,
          source: 'ai_analysis'
        });
      } else if (i === numMoments - 2) {
        // Emotional moment near end
        moments.push({
          id: `emotional-${i}`,
          timestamp,
          speaker: i % 2 === 0 ? 'Sales Rep' : 'Customer',
          sentimentScore: sentimentScore > 0 ? 0.7 : -0.4,
          intensity: sentimentScore > 0 ? 'high' as const : 'medium' as const,
          type: 'emotional_moment' as const,
          text: sentimentScore > 0 ? 
            'This could really transform how we work!' : 
            'I need to think about this more carefully.',
          context: sentimentScore > 0 ? 
            'Customer showing excitement about potential impact' : 
            'Customer showing hesitation',
          confidence: 0.84,
          source: 'ai_analysis'
        });
      } else {
        // Regular sentiment shift
        moments.push({
          id: `shift-${i}`,
          timestamp,
          speaker: i % 2 === 0 ? 'Sales Rep' : 'Customer',
          sentimentScore,
          intensity: Math.abs(sentimentScore) > 0.6 ? 'high' as const : 'medium' as const,
          type: 'sentiment_shift' as const,
          text: sentimentScore > 0.3 ? 
            'I can see how that would help us.' :
            sentimentScore < -0.3 ?
            'That\'s concerning to hear.' :
            'Let me understand this better.',
          context: sentimentScore > 0.3 ? 
            'Positive response to solution explanation' :
            sentimentScore < -0.3 ?
            'Negative reaction to information' :
            'Neutral inquiry for clarification',
          confidence: 0.75 + Math.random() * 0.2,
          source: 'ai_analysis'
        });
      }
    }

    return moments.sort((a, b) => a.timestamp - b.timestamp);
  }, [recording.duration]);
}