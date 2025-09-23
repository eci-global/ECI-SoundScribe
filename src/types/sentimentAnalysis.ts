// Types specifically for the useSentimentAnalysis hook
export interface AnalysisSentimentMoment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  text: string | null;
  speaker?: string;
  intensity: number;
  created_at: string;
}

export interface EmotionalTrend {
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intensity: number;
}

export interface SpeakerSentiment {
  speaker: string;
  averageSentiment: number;
  emotionalRange: number;
  dominantEmotion: string;
  moments: AnalysisSentimentMoment[];
}

export interface SentimentInsights {
  overallTone: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotionalVolatility: number;
  keyMoments: AnalysisSentimentMoment[];
  speakerBreakdown: SpeakerSentiment[];
  recommendations: string[];
  riskFlags: string[];
}