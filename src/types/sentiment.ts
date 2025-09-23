
// Original sentiment moment type for legacy components
export interface SentimentMoment {
  id: string;
  timestamp: number;
  type: 'action' | 'sentiment_neg' | 'bookmark' | 'sentiment_shift' | 'positive_peak' | 'negative_dip' | 'emotional_moment';
  speaker: string;
  text: string | null;
  context: string;
  sentimentScore: number;
  intensity: 'low' | 'medium' | 'high';
  confidence: number;
  source: string;
}
