export interface UXAnalysis {
  id?: string;
  recording_id: string;
  employee_identification: EmployeeIdentification;
  question_analysis: QuestionAnalysis;
  solution_recommendations: SolutionRecommendation[];
  call_breakdown: CallBreakdown;
  comprehensive_summary: string;
  next_steps: NextStep[];
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeIdentification {
  identified_employees: IdentifiedEmployee[];
  confidence_score: number;
  identification_method: 'voice_recognition' | 'transcript_analysis' | 'manual' | 'hybrid';
}

export interface IdentifiedEmployee {
  name: string;
  role?: string;
  department?: string;
  confidence: number;
  segments: EmployeeSegment[];
  characteristics: {
    speaking_style?: string;
    expertise_areas?: string[];
    communication_effectiveness?: number;
  };
}

export interface EmployeeSegment {
  start_time: number;
  end_time: number;
  text: string;
  context: string;
}

export interface QuestionAnalysis {
  questions: ExtractedQuestion[];
  question_patterns: QuestionPattern[];
  overall_question_quality: number;
}

export interface ExtractedQuestion {
  id: string;
  question_text: string;
  question_type: 'open_ended' | 'closed_ended' | 'probing' | 'clarifying' | 'follow_up';
  asked_by: string; // employee name
  timestamp: number;
  context: string;
  effectiveness_score: number;
}

export interface QuestionPattern {
  pattern_type: string;
  frequency: number;
  effectiveness: number;
  examples: string[];
}

export interface CustomerAnswer {
  id: string;
  answer_text: string;
  customer_name?: string;
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  completeness: number; // 0-1 scale
  key_insights: string[];
}

export interface SolutionRecommendation {
  id: string;
  question_id: string;
  recommended_solution: string;
  solution_type: 'immediate' | 'short_term' | 'long_term' | 'process_improvement';
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  implementation_steps: string[];
  expected_impact: string;
}

export interface CallBreakdown {
  sections: CallSection[];
  key_topics: string[];
  customer_pain_points: string[];
  opportunities_identified: string[];
  overall_sentiment: 'positive' | 'neutral' | 'negative';
}

export interface CallSection {
  id: string;
  title: string;
  start_time: number;
  end_time: number;
  participants: string[];
  key_points: string[];
  questions_asked: string[];
  customer_feedback: string[];
}

export interface NextStep {
  id: string;
  action: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies?: string[];
}

// Service interfaces
export interface UXAnalysisRequest {
  recording_id: string;
  transcript: string;
  options?: {
    include_employee_identification?: boolean;
    include_solution_recommendations?: boolean;
    analysis_depth?: 'basic' | 'comprehensive';
  };
}

export interface UXAnalysisResponse {
  success: boolean;
  data?: UXAnalysis;
  error?: string;
  processing_time?: number;
}
