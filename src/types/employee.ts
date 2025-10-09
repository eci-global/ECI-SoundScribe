// Employee Tracking and Scorecard System Types

export interface Employee {
  id: string;
  user_id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  role?: string;
  manager_id?: string;
  team_id?: string;
  hire_date?: string;
  status: 'active' | 'inactive' | 'terminated';
  voice_profile?: VoiceProfile;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCallParticipation {
  id: string;
  recording_id: string;
  employee_id: string;
  participation_type: 'primary' | 'secondary' | 'observer';
  talk_time_seconds: number;
  talk_time_percentage: number;
  speaker_segments?: SpeakerSegment[];
  confidence_score: number;
  manually_tagged: boolean;
  created_at: string;
}

export interface SpeakerSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
}

export interface EmployeeScorecard {
  id: string;
  employee_id: string;
  recording_id: string;
  participation_id: string;
  overall_score: number;
  criteria_scores: Record<string, {
    score: number;
    max_score: number;
    weight: number;
    feedback: string;
    suggestions: string[];
  }>;
  strengths: string[];
  improvements: string[];
  coaching_notes?: string;
  manager_feedback?: string;
  evaluation_date: string;
  evaluator_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePerformanceTrend {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  total_calls: number;
  average_score: number;
  score_trend: number;
  top_strengths: string[];
  improvement_areas: string[];
  coaching_sessions: number;
  manager_feedback_count: number;
  created_at: string;
}

export interface ManagerCoachingNote {
  id: string;
  employee_id: string;
  manager_id: string;
  recording_id?: string;
  note_type: 'coaching' | 'feedback' | 'recognition' | 'improvement';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  action_items: string[];
  follow_up_date?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface VoiceProfile {
  id: string;
  employee_id: string;
  voice_characteristics: VoiceCharacteristics;
  sample_recordings: string[];
  confidence_threshold: number;
  last_updated: string;
  created_at: string;
}

export interface VoiceCharacteristics {
  pitch_range: [number, number];
  speaking_rate: number;
  voice_timbre: string;
  accent_characteristics: string[];
  unique_identifiers: string[];
  confidence_factors: Record<string, number>;
}

// Performance Analytics Types
export interface EmployeePerformanceSummary {
  employee_name: string;
  total_calls: number;
  current_score: number;
  score_trend: number;
  recent_strengths: string[];
  recent_improvements: string[];
  coaching_notes_count: number;
  last_evaluation_date: string;
}

export interface EmployeeAnalytics {
  employee: Employee;
  performance_summary: EmployeePerformanceSummary;
  recent_recordings: EmployeeRecording[];
  score_trends: ScoreTrend[];
  coaching_history: ManagerCoachingNote[];
  peer_comparison?: PeerComparison;
}

export interface EmployeeRecording {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  participation_type: 'primary' | 'secondary' | 'observer';
  overall_score: number;
  talk_time_percentage: number;
  strengths: string[];
  improvements: string[];
  // AI Detection metadata
  participation_id?: string; // employee_call_participation.id - needed for corrections
  detection_method?: 'exact_match' | 'fuzzy_match' | 'first_name_unique' | 'first_name_context' | 'first_name_ambiguous';
  confidence_score?: number;
  manually_tagged?: boolean;
  detected_name?: string;
  name_type?: 'full_name' | 'first_name_only' | 'unclear';
  reasoning?: string;
}

export interface ScoreTrend {
  date: string;
  score: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface PeerComparison {
  employee_rank: number;
  total_employees: number;
  percentile: number;
  team_average: number;
  department_average: number;
  top_performers: string[];
}

// Search and Filter Types
export interface EmployeeSearchFilters {
  department?: string;
  team_id?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'terminated';
  date_range?: {
    start: string;
    end: string;
  };
  score_range?: {
    min: number;
    max: number;
  };
}

export interface EmployeeSearchResult {
  employee: Employee;
  performance_summary: EmployeePerformanceSummary;
  recent_activity: string;
  score_trend: 'improving' | 'declining' | 'stable';
}

// Voice Detection and Identification Types
export interface VoiceDetectionResult {
  employee_id?: string;
  confidence: number;
  detection_method: 'automatic' | 'manual';
  voice_characteristics: Partial<VoiceCharacteristics>;
  suggested_employees: Array<{
    employee_id: string;
    confidence: number;
    name: string;
  }>;
}

export interface EmployeeVoiceTraining {
  employee_id: string;
  sample_recordings: string[];
  training_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  confidence_scores: number[];
  last_training_date: string;
  training_quality_score: number;
}

// Dashboard and Reporting Types
export interface EmployeeDashboardData {
  employee: Employee;
  performance_metrics: {
    total_calls: number;
    average_score: number;
    score_improvement: number;
    coaching_sessions: number;
    manager_feedback_count: number;
  };
  recent_scores: Array<{
    date: string;
    score: number;
    recording_title: string;
  }>;
  strengths_analysis: {
    top_strengths: string[];
    strength_frequency: Record<string, number>;
  };
  improvement_areas: {
    top_improvements: string[];
    improvement_frequency: Record<string, number>;
  };
  coaching_effectiveness: {
    coaching_notes_count: number;
    action_items_completed: number;
    follow_up_rate: number;
  };
}

export interface TeamPerformanceReport {
  team: Team;
  employees: Employee[];
  team_metrics: {
    total_calls: number;
    average_score: number;
    top_performers: string[];
    improvement_areas: string[];
  };
  individual_performance: Array<{
    employee: Employee;
    performance_summary: EmployeePerformanceSummary;
    recent_trend: 'improving' | 'declining' | 'stable';
  }>;
}

// API Response Types
export interface EmployeeListResponse {
  employees: EmployeeSearchResult[];
  total_count: number;
  page: number;
  page_size: number;
  filters_applied: EmployeeSearchFilters;
}

export interface EmployeeDetailResponse {
  employee: Employee;
  analytics: EmployeeAnalytics;
  dashboard_data: EmployeeDashboardData;
}

// Utility Types
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type ParticipationType = 'primary' | 'secondary' | 'observer';
export type NoteType = 'coaching' | 'feedback' | 'recognition' | 'improvement';
export type Priority = 'low' | 'medium' | 'high';
export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type TrendDirection = 'improving' | 'declining' | 'stable';
