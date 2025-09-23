import type { 
  SalesFrameworkType, 
  CallType, 
  FrameworkAnalysis,
  FrameworkAnalysisRequest,
  FrameworkAnalysisResponse,
  SalesFrameworkSettings
} from '@/types/salesFrameworks';

export const DEFAULT_FRAMEWORK_SETTINGS: SalesFrameworkSettings = {
  enabled: true,
  defaultFramework: 'BANT',
  autoSelectFramework: false,
  multiFrameworkAnalysis: false,
  confidenceThreshold: 70
};

export function selectOptimalFramework(
  transcript: string, 
  callType: CallType = 'discovery',
  industry?: string
): SalesFrameworkType {
  // Simple heuristic-based framework selection
  const transcriptLower = transcript.toLowerCase();
  
  if (transcriptLower.includes('budget') || transcriptLower.includes('timeline')) {
    return 'BANT';
  }
  if (transcriptLower.includes('metric') || transcriptLower.includes('roi')) {
    return 'MEDDIC';
  }
  if (transcriptLower.includes('problem') || transcriptLower.includes('pain')) {
    return 'SPICED';
  }
  
  // Default fallback based on call type
  switch (callType) {
    case 'discovery':
      return 'SPIN';
    case 'demo':
      return 'MEDDIC';
    case 'negotiation':
      return 'BANT';
    case 'closing':
      return 'CHALLENGER';
    default:
      return 'BANT';
  }
}

export async function analyzeWithFramework(
  request: FrameworkAnalysisRequest
): Promise<FrameworkAnalysisResponse> {
  // Mock implementation - replace with actual AI analysis
  const mockAnalysis: FrameworkAnalysis = {
    frameworkType: request.framework,
    overallScore: Math.floor(Math.random() * 40) + 60, // 60-100
    confidence: Math.floor(Math.random() * 30) + 70, // 70-100
    componentScores: generateMockComponentScores(request.framework),
    insights: [
      {
        type: 'strength',
        description: `Strong ${request.framework} execution in key areas`,
        confidence: 85,
        category: 'methodology'
      },
      {
        type: 'improvement',
        description: 'Consider asking more qualifying questions',
        confidence: 78,
        category: 'discovery'
      }
    ],
    evidence: [
      'Clear budget discussion around minute 15',
      'Decision maker identified early in call',
      'Timeline established for next steps'
    ],
    strengths: [
      'Effective discovery questions',
      'Good rapport building',
      'Clear value proposition'
    ],
    improvements: [
      'More detailed pain exploration needed',
      'Quantify business impact better',
      'Confirm decision process'
    ],
    coachingActions: [
      'Practice SPIN questioning techniques',
      'Develop better pain point discovery',
      'Improve objection handling'
    ],
    benchmarkComparison: {
      industryAverage: 72,
      userScore: 85,
      percentile: 78
    },
    analysisTimestamp: new Date().toISOString(),
    aiModelVersion: 'mock-v1.0',
    callType: request.callType || 'discovery',
    callOutcome: 'qualified'
  };

  return {
    analysis: mockAnalysis,
    success: true
  };
}

function generateMockComponentScores(framework: SalesFrameworkType): Record<string, number> {
  const baseScore = Math.floor(Math.random() * 30) + 60; // 60-90
  
  switch (framework) {
    case 'BANT':
      return {
        budget: baseScore + Math.floor(Math.random() * 10),
        authority: baseScore + Math.floor(Math.random() * 10),
        need: baseScore + Math.floor(Math.random() * 10),
        timeline: baseScore + Math.floor(Math.random() * 10)
      };
    case 'MEDDIC':
      return {
        metrics: baseScore + Math.floor(Math.random() * 10),
        economic_buyer: baseScore + Math.floor(Math.random() * 10),
        decision_criteria: baseScore + Math.floor(Math.random() * 10),
        decision_process: baseScore + Math.floor(Math.random() * 10),
        identify_pain: baseScore + Math.floor(Math.random() * 10),
        champion: baseScore + Math.floor(Math.random() * 10)
      };
    case 'SPICED':
      return {
        situation: baseScore + Math.floor(Math.random() * 10),
        problem: baseScore + Math.floor(Math.random() * 10),
        implication: baseScore + Math.floor(Math.random() * 10),
        complexity: baseScore + Math.floor(Math.random() * 10),
        economic_impact: baseScore + Math.floor(Math.random() * 10),
        decision: baseScore + Math.floor(Math.random() * 10)
      };
    default:
      return {
        overall: baseScore
      };
  }
}