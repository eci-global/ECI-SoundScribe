
export type SalesFrameworkType = 
  | 'BANT' 
  | 'MEDDIC' 
  | 'SPICED' 
  | 'SPIN' 
  | 'CHALLENGER'
  | 'SOLUTION_SELLING'
  | 'NEAT';

export interface FrameworkPerformanceTrend {
  frameworkType: SalesFrameworkType;
  date: string;
  score: number;
  callCount: number;
  improvementRate: number;
}

export interface FrameworkComparisonData {
  framework: SalesFrameworkType;
  score: number;
  callCount: number;
  successRate: number;
  averageImprovement: number;
}

export interface FrameworkInsight {
  type: 'strength' | 'improvement' | 'observation';
  description: string;
  confidence: number;
  category: string;
}

export interface FrameworkAnalysis {
  frameworkType: SalesFrameworkType;
  overallScore: number;
  confidence: number;
  componentScores: Record<string, number>;
  insights: FrameworkInsight[];
  evidence: string[];
  strengths: string[];
  improvements: string[];
  coachingActions: string[];
  benchmarkComparison: {
    industryAverage: number;
    userScore: number;
    percentile: number;
  };
  analysisTimestamp: string;
  aiModelVersion: string;
  callType: string;
  callOutcome: string;
}

// Component type definitions for different frameworks
export interface BANTComponents {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

export interface MEDDICComponents {
  metrics: number;
  economic_buyer: number;
  decision_criteria: number;
  decision_process: number;
  identify_pain: number;
  champion: number;
}

export interface SPICEDComponents {
  situation: number;
  problem: number;
  implication: number;
  complexity: number;
  economic_impact: number;
  decision: number;
}

export interface IndustryBenchmark {
  industry: string;
  frameworkType: SalesFrameworkType;
  componentName: string;
  averageScore: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  sampleSize: number;
}

export interface BenchmarkComparison {
  userScore: number;
  industryAverage: number;
  percentile: number;
  ranking: 'top_10' | 'top_25' | 'above_average' | 'average' | 'below_average';
  improvement_potential: number;
}

export interface CoachingRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action_items: string[];
  estimated_impact: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  time_to_implement: string;
}

// Additional missing types
export type CallType = 'discovery' | 'demo' | 'negotiation' | 'closing';

export interface FrameworkAnalysisRequest {
  recordingId: string;
  framework: SalesFrameworkType;
  frameworks?: SalesFrameworkType[];
  transcript: string;
  callType?: CallType;
  industry?: string;
}

export interface FrameworkAnalysisResponse {
  analysis: FrameworkAnalysis;
  analyses?: FrameworkAnalysis[];
  success: boolean;
  error?: string;
  errors?: string[];
  processingTime?: number;
}

export interface EnhancedCoachingEvaluation {
  // Backward compatibility
  overallScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  
  // Enhanced framework analysis
  frameworkAnalyses: FrameworkAnalysis[];
  primaryFramework: SalesFrameworkType;
  secondaryFrameworks?: SalesFrameworkType[];
  
  // Call classification
  callType: CallType;
  callOutcome: string;
  
  // Enhanced insights
  strategicInsights: string[];
  tacticalImprovements: string[];
  frameworkRecommendations: string[];
  
  // Coaching intelligence
  coachingPriority: 'high' | 'medium' | 'low';
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  improvementPotential: number;
  
  // Metadata
  analysisVersion: string;
  frameworksUsed: SalesFrameworkType[];
  totalAnalysisTime?: number;
}

export interface SalesFrameworkSettings {
  enabled: boolean;
  defaultFramework: SalesFrameworkType;
  autoSelectFramework?: boolean;
  multiFrameworkAnalysis?: boolean;
  confidenceThreshold?: number;
}
