// BDR Scorecard Training Integration Types
// Extends existing coaching system without modifying current types

import { CoachingCriteria, CoachingEvaluation } from './coaching';

// BDR Scorecard Criteria Definition
export interface BDRCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage weight in overall score (0-100)
  maxScore: number; // Maximum possible score for this criteria
  passingScore: number; // Minimum score required to pass this criterion
  scoringGuidelines: {
    excellent: { min: number; description: string };
    good: { min: number; description: string };
    needs_improvement: { min: number; description: string };
    poor: { min: number; description: string };
  };
  // AI prompts for evaluation
  evaluationPrompts: {
    analysisPrompt: string;
    scoringPrompt: string;
    feedbackPrompt: string;
  };
}

// Actual BDR Scorecard Criteria (from "000 BDR Call Scorecard.csv")
// Scoring: 0-4 scale (BLANK=absent, 0=not demonstrated, 1=needs improvement, 2=meets expectations, 3=strong performance, 4=best-in-class)
export const DEFAULT_BDR_CRITERIA: BDRCriteria[] = [
  {
    id: 'opening',
    name: 'Opening',
    description: 'Rep states their name, company, and reason for calling in a confident tone with pattern interrupt',
    weight: 12.5, // 8 criteria = 100/8 = 12.5% each
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Rep states name, company, and reason for calling confidently, (2) Opens with statement/question that breaks routine or sparks curiosity, (3) Gets to point quickly while respecting prospect time, (4) Smooth transition to call purpose.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide specific feedback on opening execution and pattern interrupt effectiveness.'
    }
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    description: 'Acknowledges objections without being combative, maintains curiosity, and reframes perspective',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Acknowledges objection without sounding combative/dismissive/defensive, (2) Maintains curiosity and authentic interest in learning, (3) Keeps answers short, confident, conversational, (4) Offers alternative perspective to reframe objection, (5) Recovers momentum smoothly.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide specific objection handling techniques and reframing strategies for improvement.'
    }
  },
  {
    id: 'qualification',
    name: 'Qualification',
    description: 'Identifies fit criteria, uncovers pain points, uses open-ended questions and active listening',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Identifies basic fit criteria early (role, company size, industry), (2) Uncovers pain/challenges tied to solution space, (3) Uses curiosity-based, open-ended questions vs interrogation, (4) Asks probing follow-up questions, (5) Demonstrates active listening by adapting questions.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest specific qualifying questions and discovery techniques for improvement.'
    }
  },
  {
    id: 'tone_and_energy',
    name: 'Tone & Energy',
    description: 'Positive, energetic tone with natural pacing - not flat, apologetic, rushed, or monotone',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Tone is positive and energetic (not flat or apologetic), (2) Natural pacing - speech is steady (not rushed or monotone).',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide feedback on tone improvement and pacing adjustments needed.'
    }
  },
  {
    id: 'assertiveness_and_control',
    name: 'Assertiveness & Control',
    description: 'Guides conversation without being pushy, practices active listening, creates urgency',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Guides conversation without being pushy - steers flow without dominating, (2) Active listening - doesn\'t cut off prospect, waits for completion, (3) Taps into "why now" - connects to timing/urgency.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest techniques for better conversation control and urgency development.'
    }
  },
  {
    id: 'business_acumen_and_relevance',
    name: 'Business Acumen & Relevance',
    description: 'Uses industry/role insights and shares relevant stories, case studies, or proof points',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) References industry/role insights - uses relevant industry knowledge, (2) Uses story/case/proof point - shares relevant customer example or data point.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest industry insights and proof points that could enhance credibility.'
    }
  },
  {
    id: 'closing',
    name: 'Closing',
    description: 'Summarizes prospect needs, shares company track record, uses assumptive close, confirms details',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Summarizes/paraphrases prospect needs for clarity - explicitly checks "Did I get that right?" or "Anything else?", (2) Shares company track record and sales rep qualifications, (3) Assumptive close - suggests specific time for next step/meeting, (4) Confirms contact info and asks prospect to accept next step.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest closing technique improvements and confirmation strategies.'
    }
  },
  {
    id: 'talk_time',
    name: 'Talk Time',
    description: 'Rep speaks less than 50% of the time (ideal ratio: 43/57 rep/prospect)',
    weight: 12.5,
    maxScore: 4,
    passingScore: 2,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: Rep doesn\'t dominate conversation - speaking less than 50% of time (ideal ratio: 43/57 rep/prospect).',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide guidance on achieving better talk time balance and encouraging prospect participation.'
    }
  }
];

// BDR Training Program Configuration
export interface BDRTrainingProgram {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  
  // Scorecard configuration
  scorecardCriteria: BDRCriteria[];
  targetScoreThreshold: number; // Minimum score to pass (0-100)
  minimumCallsRequired: number; // Calls needed to complete program
  
  // Metadata
  version: number;
  tags: string[];
}

// BDR Call Classification
export interface BDRCallClassification {
  id: string;
  recordingId: string;
  trainingProgramId: string;
  userId: string;
  
  classifiedAt: string;
  classifiedBy?: string;
  classificationMethod: 'manual' | 'automatic' | 'batch';
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

// BDR Scorecard Evaluation (extends existing CoachingEvaluation)
export interface BDRScorecardEvaluation extends Omit<CoachingEvaluation, 'criteria'> {
  id: string;
  callClassificationId: string;
  recordingId: string;
  trainingProgramId: string;
  userId: string;
  
  // BDR-specific scoring
  overallScore: number; // 0-100
  criteriaScores: Record<string, {
    score: number;
    maxScore: number;
    weight: number;
    feedback: string;
    suggestions: string[];
  }>;
  
  // BDR insights
  bdrInsights: {
    keyStrengths: string[];
    improvementAreas: string[];
    coachingPriorities: string[];
    nextCallFocus: string[];
    competencyLevel: 'novice' | 'developing' | 'proficient' | 'advanced';
  };
  
  // Coaching feedback
  improvementAreas: string[];
  strengths: string[];
  coachingNotes?: string;
  
  // AI metadata
  aiModelVersion?: string;
  processingDurationMs?: number;
  confidenceScore?: number;
  
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

// BDR Training Progress Tracking
export interface BDRTrainingProgress {
  id: string;
  userId: string;
  trainingProgramId: string;
  
  // Progress metrics
  callsCompleted: number;
  averageScore?: number;
  latestScore?: number;
  bestScore?: number;
  
  // Status
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  completionPercentage: number;
  targetMet: boolean;
  
  // Timestamps
  startedAt?: string;
  lastActivityAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// BDR Coaching Session
export interface BDRCoachingSession {
  id: string;
  traineeId: string;
  coachId?: string;
  trainingProgramId: string;
  
  // Session details
  sessionType: 'review' | 'practice' | 'assessment' | 'feedback';
  sessionNotes?: string;
  actionItems: string[];
  evaluationIds: string[];
  
  // Scheduling
  scheduledAt?: string;
  conductedAt?: string;
  durationMinutes?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  
  createdAt: string;
  updatedAt: string;
}

// BDR Training Dashboard Data
export interface BDRTrainingDashboard {
  userId: string;
  programs: Array<{
    program: BDRTrainingProgram;
    progress: BDRTrainingProgress;
    recentEvaluations: BDRScorecardEvaluation[];
    upcomingSessions: BDRCoachingSession[];
  }>;
  
  // Summary metrics
  overallProgress: {
    totalPrograms: number;
    completedPrograms: number;
    inProgressPrograms: number;
    totalCalls: number;
    averageScore: number;
    improvementTrend: number;
  };
  
  // Recent activity
  recentActivity: Array<{
    type: 'evaluation' | 'session' | 'milestone';
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}

// Admin Dashboard Summary
export interface BDRAdminDashboard {
  organizationId?: string;
  
  // Program statistics
  programs: {
    total: number;
    active: number;
    totalParticipants: number;
  };
  
  // User progress overview
  userProgress: {
    totalUsers: number;
    activeUsers: number;
    completedUsers: number;
    averageCompletionRate: number;
  };
  
  // Recent evaluations
  recentEvaluations: Array<{
    evaluation: BDRScorecardEvaluation;
    userName: string;
    programName: string;
  }>;
  
  // Performance trends
  trends: {
    averageScoresByProgram: Record<string, number>;
    completionRatesByProgram: Record<string, number>;
    monthlyActivity: Array<{
      month: string;
      evaluations: number;
      completions: number;
    }>;
  };
}

// API Response Types
export interface BDRApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Utility type for BDR evaluation requests
export interface BDREvaluationRequest {
  recordingId: string;
  trainingProgramId: string;
  forceReprocess?: boolean;
}

// Type guards
export const isBDRScorecardEvaluation = (data: any): data is BDRScorecardEvaluation => {
  return data && 
         typeof data === 'object' && 
         'bdrInsights' in data &&
         'criteriaScores' in data &&
         typeof data.overallScore === 'number';
};

export const isBDRTrainingProgram = (data: any): data is BDRTrainingProgram => {
  return data && 
         typeof data === 'object' && 
         'scorecardCriteria' in data &&
         Array.isArray(data.scorecardCriteria) &&
         typeof data.targetScoreThreshold === 'number';
};

// Constants - Updated for 0-4 scoring scale
export const BDR_SCORING_THRESHOLDS = {
  EXCELLENT: 4,    // Best-in-Class: Flawless, high-impact execution
  GOOD: 3,         // Strong Performance: Above-average execution with impact  
  NEEDS_IMPROVEMENT: 2, // Meets Expectations: Competent execution
  POOR: 0          // Not Demonstrated: Absent or counterproductive
} as const;

// Score definitions for 0-4 scale
export const BDR_SCORE_DEFINITIONS = {
  4: 'Best-in-Class',
  3: 'Strong Performance', 
  2: 'Meets Expectations',
  1: 'Needs Improvement',
  0: 'Not Demonstrated'
} as const;

export const BDR_COMPETENCY_LEVELS = {
  NOVICE: { min: 0, max: 1.99, label: 'Novice' },        // 0-1.99 avg score
  DEVELOPING: { min: 2, max: 2.49, label: 'Developing' }, // 2-2.49 avg score
  PROFICIENT: { min: 2.5, max: 3.49, label: 'Proficient' }, // 2.5-3.49 avg score
  ADVANCED: { min: 3.5, max: 4, label: 'Advanced' }      // 3.5-4 avg score
} as const;

export const BDR_TRAINING_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  PAUSED: 'paused'
} as const;