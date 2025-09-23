
export interface CoachingCriteria {
  name: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface CoachingEvaluation {
  overallScore: number;
  criteria: CoachingCriteria[] | {
    talkTimeRatio?: number;
    objectionHandling?: number;
    discoveryQuestions?: number;
    valueArticulation?: number;
    activeListening?: number;
    rapportBuilding?: number;
    nextSteps?: boolean;
    questionCount?: number;
    rapport?: number;
  };
  strengths: string[];
  improvements: string[];
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  summary?: string;
  actionItems?: string[];
  suggestedResponses?: {
    situation: string;
    currentResponse: string;
    improvedResponse: string;
  }[];
  componentScores?: Record<string, number>;
  // Additional properties for compatibility
  talkTimeRatio?: number;
  objectionHandling?: number;
  discoveryQuestions?: number;
  valueArticulation?: number;
  activeListening?: number;
  rapportBuilding?: number;
  nextSteps?: string[];
  // BDR Training Integration - optional BDR evaluation data
  bdrEvaluationId?: string;
  bdrTrainingProgramId?: string;
  bdrCriteriaScores?: Record<string, {
    score: number;
    maxScore: number;
    weight: number;
    feedback: string;
  }>;
  bdrInsights?: {
    competencyLevel?: 'novice' | 'developing' | 'proficient' | 'advanced';
    coachingPriorities?: string[];
    nextCallFocus?: string[];
  };
  // Json compatibility
  [key: string]: any;
}

export interface CoachingRecommendation {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  impactScore: number;
  timeframe: string;
  actionItems: string[];
}

export interface PerformanceMetrics {
  callsAnalyzed: number;
  averageScore: number;
  improvementTrend: number;
  topStrengths: string[];
  keyOpportunities: string[];
  progressOverTime: {
    month: string;
    score: number;
  }[];
}

export interface CoachingInsight {
  type: 'strength' | 'improvement' | 'trend';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  relatedCalls?: string[];
}

// Additional AI-related types for compatibility
export interface AIInsights {
  keyPoints?: string[];
  opportunities?: string[];
  concerns?: string[];
  nextSteps?: string[];
  actionItems?: string[];
  keyTakeaways?: string[];
  // Json compatibility
  [key: string]: any;
}

export interface AINextSteps {
  immediate?: string[];
  shortTerm?: string[];
  longTerm?: string[];
}

export interface AIMoments {
  highlights?: Array<{
    timestamp: number;
    description: string;
    type: string;
  }>;
  keyQuotes?: Array<{
    speaker: string;
    quote: string;
    timestamp: number;
  }>;
}

export interface AISpeakerAnalysis {
  speakers?: Array<{
    name: string;
    talkTime: number;
    sentiment: string;
  }>;
  talkTimeRatio?: number;
  // Additional properties used in speakerResolution.ts
  analysis_method?: string;
  service_provider?: string;
  identified_speakers?: Array<{
    name: string;
    confidence: number;
    characteristics?: any;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      speaker_label?: string;
      segments?: any[];
    }>;
  }>;
  confidence_score?: number;
  unidentified_segments?: Array<{
    start: number;
    end: number;
    text: string;
    speaker_label?: string;
    segments?: any[];
  }>;
  // Json compatibility
  [key: string]: any;
}

// Type guards
export const isCoachingEvaluation = (data: any): data is CoachingEvaluation => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return typeof data.overallScore === 'number' && 
         (typeof data.criteria === 'object' || Array.isArray(data.criteria)) &&
         Array.isArray(data.strengths) &&
         Array.isArray(data.improvements);
};

export const isAISpeakerAnalysis = (data: any): data is AISpeakerAnalysis => {
  return data && typeof data === 'object' && !Array.isArray(data);
};
