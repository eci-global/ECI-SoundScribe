import type { ContentType } from '@/components/dashboard/UploadModal';

// Base coaching criteria interface
export interface BaseCoachingCriteria {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
}

// Sales-specific coaching criteria
export interface SalesCoachingCriteria extends BaseCoachingCriteria {
  talkTimeRatio: number; // 0-100% - rep vs customer talk time
  objectionHandling: number; // 0-10 score
  discoveryQuestions: number; // count of discovery questions asked
  valueArticulation: number; // 0-10 score
  activeListening: number; // 0-10 score
  nextSteps: boolean; // whether clear next steps were established
  rapport: number; // 0-10 score
}

// Customer Support coaching criteria
export interface SupportCoachingCriteria extends BaseCoachingCriteria {
  problemResolution: number; // 0-10 score
  empathy: number; // 0-10 score
  technicalAccuracy: number; // 0-10 score
  followUpClarity: number; // 0-10 score
  customerSatisfaction: number; // 0-10 score
  escalationHandling: number; // 0-10 score
  responseTime: number; // average response time in seconds
}

// Team Meeting coaching criteria
export interface MeetingCoachingCriteria extends BaseCoachingCriteria {
  participation: number; // 0-10 score
  decisionMaking: number; // 0-10 score
  communicationClarity: number; // 0-10 score
  actionItemsClarity: boolean; // whether action items were clearly defined
  timeManagement: number; // 0-10 score
  collaboration: number; // 0-10 score
  meetingObjectives: boolean; // whether meeting objectives were met
}

// Training Session coaching criteria
export interface TrainingCoachingCriteria extends BaseCoachingCriteria {
  knowledgeTransfer: number; // 0-10 score
  engagement: number; // 0-10 score
  questionHandling: number; // 0-10 score
  clarity: number; // 0-10 score
  interactivity: number; // 0-10 score
  comprehensionCheck: boolean; // whether understanding was verified
  practicalApplication: number; // 0-10 score
}

// Union type for all coaching criteria
export type DomainCoachingCriteria = 
  | SalesCoachingCriteria 
  | SupportCoachingCriteria 
  | MeetingCoachingCriteria 
  | TrainingCoachingCriteria;

// Enhanced coaching evaluation with domain-specific criteria
export interface EnhancedCoachingEvaluation {
  contentType: ContentType;
  overallScore: number;
  criteria: DomainCoachingCriteria;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  suggestedResponses: Array<{
    situation: string;
    currentResponse: string;
    improvedResponse: string;
  }>;
  coachingInsights: {
    primaryFocus: string;
    developmentPlan: string[];
    nextSessionGoals: string[];
  };
}

// Content type detection prompts
export const getContentDetectionPrompt = (transcript: string): string => {
  return `
Analyze the following transcript and determine the content type. Consider the context, participants, topics discussed, and communication patterns.

Content Types:
1. sales_call - Customer/prospect conversations, demos, negotiations, deal discussions
2. customer_support - Support tickets, troubleshooting, problem resolution, customer service
3. team_meeting - Internal meetings, planning sessions, team discussions, status updates
4. training_session - Training calls, coaching sessions, skill development, learning
5. other - General recordings, interviews, or other content

Transcript:
${transcript}

Respond with just the content type (one of: sales_call, customer_support, team_meeting, training_session, other) and a brief explanation (1-2 sentences).
Format: {content_type}: {explanation}
`;
};

// Domain-specific coaching analysis prompts
export const getSalesCoachingPrompt = (transcript: string): string => {
  return `
Analyze this sales call transcript and provide detailed coaching feedback based on these criteria:

1. Talk-Time Ratio (aim for 30-40% rep talk time)
2. Objection Handling (0-10): Clarity, empathy, redirection skill
3. Discovery Questions: Count and assess quality/depth
4. Value Articulation (0-10): Clear, concise value statement
5. Active Listening (0-10): Demonstrates understanding, follows up appropriately
6. Next Steps (boolean): Clear closing or calendar request
7. Rapport Building (0-10): Opening attention and connection

Transcript:
${transcript}

Provide specific scores, strengths, improvements, and action items for the next call.
`;
};

export const getSupportCoachingPrompt = (transcript: string): string => {
  return `
Analyze this customer support interaction and provide coaching feedback based on these criteria:

1. Problem Resolution (0-10): Effectiveness in solving the customer's issue
2. Empathy (0-10): Understanding and acknowledging customer emotions
3. Technical Accuracy (0-10): Correctness of information provided
4. Follow-up Clarity (0-10): Clear next steps and expectations
5. Customer Satisfaction (0-10): Overall customer experience
6. Escalation Handling (0-10): Appropriate escalation when needed

Transcript:
${transcript}

Provide specific scores, strengths, improvements, and action items for better customer service.
`;
};

export const getMeetingCoachingPrompt = (transcript: string): string => {
  return `
Analyze this team meeting transcript and provide coaching feedback based on these criteria:

1. Participation (0-10): Active contribution to discussions
2. Decision Making (0-10): Effective decision-making process
3. Communication Clarity (0-10): Clear and concise communication
4. Action Items Clarity (boolean): Whether action items were clearly defined
5. Time Management (0-10): Efficient use of meeting time
6. Collaboration (0-10): Teamwork and collaborative spirit
7. Meeting Objectives (boolean): Whether meeting objectives were achieved

Transcript:
${transcript}

Provide specific scores, strengths, improvements, and action items for more effective meetings.
`;
};

export const getTrainingCoachingPrompt = (transcript: string): string => {
  return `
Analyze this training session transcript and provide coaching feedback based on these criteria:

1. Knowledge Transfer (0-10): Effectiveness in conveying information
2. Engagement (0-10): Keeping participants engaged and interested
3. Question Handling (0-10): Responding to questions effectively
4. Clarity (0-10): Clear explanation of concepts
5. Interactivity (0-10): Encouraging participation and interaction
6. Comprehension Check (boolean): Verifying understanding
7. Practical Application (0-10): Relating concepts to real-world scenarios

Transcript:
${transcript}

Provide specific scores, strengths, improvements, and action items for better training delivery.
`;
};

// Helper function to get the appropriate coaching prompt based on content type
export const getCoachingPrompt = (contentType: ContentType, transcript: string): string => {
  switch (contentType) {
    case 'sales_call':
      return getSalesCoachingPrompt(transcript);
    case 'customer_support':
      return getSupportCoachingPrompt(transcript);
    case 'team_meeting':
      return getMeetingCoachingPrompt(transcript);
    case 'training_session':
      return getTrainingCoachingPrompt(transcript);
    default:
      return getSalesCoachingPrompt(transcript); // Default to sales for general analysis
  }
};

// Helper function to determine if content type should have coaching analysis
export const shouldEnableCoaching = (contentType: ContentType): boolean => {
  return contentType !== 'other';
};

// Get coaching criteria labels for a specific content type
export const getCoachingCriteriaLabels = (contentType: ContentType): string[] => {
  switch (contentType) {
    case 'sales_call':
      return ['Talk-time ratio', 'Objection handling', 'Discovery questions', 'Value articulation', 'Active listening', 'Next steps', 'Rapport building'];
    case 'customer_support':
      return ['Problem resolution', 'Empathy', 'Technical accuracy', 'Follow-up clarity', 'Customer satisfaction', 'Escalation handling'];
    case 'team_meeting':
      return ['Participation', 'Decision making', 'Communication clarity', 'Action items', 'Time management', 'Collaboration', 'Meeting objectives'];
    case 'training_session':
      return ['Knowledge transfer', 'Engagement', 'Question handling', 'Clarity', 'Interactivity', 'Comprehension check', 'Practical application'];
    default:
      return ['General analysis', 'Communication effectiveness'];
  }
};