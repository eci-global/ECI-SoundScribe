// ECI Analysis Utilities
// Helper functions for parsing and displaying ECI Support Call Scoring Framework data

import type { Recording } from '@/types/recording';

export interface ECIBehaviorEvidence {
  timestamp: number;
  quote: string;
  context: string;
  type: 'positive' | 'negative';
}

export interface ECIBehaviorEvaluation {
  rating: 'YES' | 'NO' | 'UNCERTAIN';
  evidence: ECIBehaviorEvidence[];
  briefTip: string;
  detailedRecommendation: string;
  confidence: number;
  definition: string;
}

export interface ECIAnalysisResult {
  framework: 'ECI';
  analysisDate: string;
  recordingId: string;
  careForCustomer: {
    extremeOwnershipAndHelpfulness: ECIBehaviorEvaluation;
    activeListening: ECIBehaviorEvaluation;
    empathy: ECIBehaviorEvaluation;
    toneAndPace: ECIBehaviorEvaluation;
    professionalism: ECIBehaviorEvaluation;
    customerConnection: ECIBehaviorEvaluation;
  };
  callResolution: {
    followedProperProcedures: ECIBehaviorEvaluation;
    accurateInformation: ECIBehaviorEvaluation;
  };
  callFlow: {
    opening: ECIBehaviorEvaluation;
    holdTransferProcedures: ECIBehaviorEvaluation;
    closing: ECIBehaviorEvaluation;
    documentation: ECIBehaviorEvaluation;
  };
  nonNegotiables: {
    noDocumentation: { violated: boolean; evidence?: ECIBehaviorEvidence[] };
    securityVerification: { violated: boolean; evidence?: ECIBehaviorEvidence[] };
    unprofessionalism: { violated: boolean; evidence?: ECIBehaviorEvidence[] };
  };
  summary: {
    strengths: string[];
    improvementAreas: string[];
    briefOverallCoaching: string;
    detailedOverallCoaching: string;
    managerReviewRequired: boolean;
    behaviorCounts: {
      yes: number;
      no: number;
      uncertain: number;
    };
  };
  metadata: {
    model: string;
    processingTime: number;
    segmentsAnalyzed: number;
    transcriptLength: number;
  };
}

/**
 * Parse ECI analysis from recording data
 */
export function parseECIAnalysis(recording: Recording): ECIAnalysisResult | null {
  try {
    if (!recording.support_analysis) return null;

    const analysis = typeof recording.support_analysis === 'string'
      ? JSON.parse(recording.support_analysis)
      : recording.support_analysis;

    // Check if it's ECI framework
    if (analysis.framework === 'ECI') {
      return analysis as ECIAnalysisResult;
    }

    return null;
  } catch (error) {
    console.error('Error parsing ECI analysis:', error);
    return null;
  }
}

/**
 * Get overall ECI performance score (0-100)
 * Based on weighted sections: Care 60%, Resolution 30%, Flow 10%
 */
export function getECIOverallScore(analysis: ECIAnalysisResult): number {
  const behaviorToScore = (rating: string): number => {
    switch (rating) {
      case 'YES': return 100;
      case 'NO': return 0;
      case 'UNCERTAIN': return 50; // Neutral for scoring purposes
      default: return 50;
    }
  };

  // Care for Customer (60% weight) - 6 behaviors
  const careScores = [
    behaviorToScore(analysis.careForCustomer.extremeOwnershipAndHelpfulness.rating),
    behaviorToScore(analysis.careForCustomer.activeListening.rating),
    behaviorToScore(analysis.careForCustomer.empathy.rating),
    behaviorToScore(analysis.careForCustomer.toneAndPace.rating),
    behaviorToScore(analysis.careForCustomer.professionalism.rating),
    behaviorToScore(analysis.careForCustomer.customerConnection.rating)
  ];
  const careAvg = careScores.reduce((sum, score) => sum + score, 0) / careScores.length;

  // Call Resolution (30% weight) - 2 behaviors
  const resolutionScores = [
    behaviorToScore(analysis.callResolution.followedProperProcedures.rating),
    behaviorToScore(analysis.callResolution.accurateInformation.rating)
  ];
  const resolutionAvg = resolutionScores.reduce((sum, score) => sum + score, 0) / resolutionScores.length;

  // Call Flow (10% weight) - 4 behaviors
  const flowScores = [
    behaviorToScore(analysis.callFlow.opening.rating),
    behaviorToScore(analysis.callFlow.holdTransferProcedures.rating),
    behaviorToScore(analysis.callFlow.closing.rating),
    behaviorToScore(analysis.callFlow.documentation.rating)
  ];
  const flowAvg = flowScores.reduce((sum, score) => sum + score, 0) / flowScores.length;

  // Calculate weighted score
  const overallScore = (careAvg * 0.6) + (resolutionAvg * 0.3) + (flowAvg * 0.1);

  return Math.round(overallScore);
}

/**
 * Get escalation risk based on ECI analysis
 */
export function getECIEscalationRisk(analysis: ECIAnalysisResult): 'low' | 'medium' | 'high' {
  // Check for non-negotiables first
  if (analysis.nonNegotiables.unprofessionalism.violated ||
      analysis.nonNegotiables.securityVerification.violated) {
    return 'high';
  }

  // Count NO ratings (problems)
  const allBehaviors = [
    ...Object.values(analysis.careForCustomer),
    ...Object.values(analysis.callResolution),
    ...Object.values(analysis.callFlow)
  ];

  const noCount = allBehaviors.filter(b => b.rating === 'NO').length;
  const uncertainCount = allBehaviors.filter(b => b.rating === 'UNCERTAIN').length;

  // High risk: 4+ NO ratings or 3+ NO with UNCERTAIN behaviors
  if (noCount >= 4 || (noCount >= 3 && uncertainCount > 0)) {
    return 'high';
  }

  // Medium risk: 2-3 NO ratings or significant UNCERTAIN behaviors
  if (noCount >= 2 || uncertainCount >= 4) {
    return 'medium';
  }

  return 'low';
}

/**
 * Get primary strength from ECI analysis
 */
export function getECIPrimaryStrength(analysis: ECIAnalysisResult): string | null {
  if (analysis.summary.strengths.length > 0) {
    return analysis.summary.strengths[0];
  }

  // Fallback: find highest performing section
  const careYes = Object.values(analysis.careForCustomer).filter(b => b.rating === 'YES').length;
  const resolutionYes = Object.values(analysis.callResolution).filter(b => b.rating === 'YES').length;
  const flowYes = Object.values(analysis.callFlow).filter(b => b.rating === 'YES').length;

  if (careYes >= 4) return 'Customer Care Excellence';
  if (resolutionYes === 2) return 'Issue Resolution';
  if (flowYes >= 3) return 'Call Management';

  return null;
}

/**
 * Get primary improvement area from ECI analysis
 */
export function getECIPrimaryImprovement(analysis: ECIAnalysisResult): string | null {
  if (analysis.summary.improvementAreas.length > 0) {
    return analysis.summary.improvementAreas[0];
  }

  // Fallback: find section with most NO ratings
  const careNo = Object.values(analysis.careForCustomer).filter(b => b.rating === 'NO').length;
  const resolutionNo = Object.values(analysis.callResolution).filter(b => b.rating === 'NO').length;
  const flowNo = Object.values(analysis.callFlow).filter(b => b.rating === 'NO').length;

  if (careNo >= 2) return 'Customer Care Skills';
  if (resolutionNo >= 1) return 'Problem Resolution';
  if (flowNo >= 2) return 'Call Process';

  return null;
}

/**
 * Check if ECI analysis is available for recording
 */
export function hasECIAnalysis(recording: Recording): boolean {
  const analysis = parseECIAnalysis(recording);
  return analysis !== null;
}

/**
 * Get behavior count summary for display
 */
export function getECIBehaviorSummary(analysis: ECIAnalysisResult): string {
  const { yes, no, uncertain } = analysis.summary.behaviorCounts;
  const total = yes + no + uncertain;

  if (total === 0) return 'No behaviors analyzed';

  return `${yes}/${total} behaviors demonstrated`;
}

/**
 * Format timestamp for display (converts seconds to MM:SS)
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get behavior rating color class for UI
 */
export function getBehaviorRatingColor(rating: 'YES' | 'NO' | 'UNCERTAIN'): string {
  switch (rating) {
    case 'YES': return 'text-green-600';
    case 'NO': return 'text-red-600';
    case 'UNCERTAIN': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
}

/**
 * Get behavior rating icon name for UI
 */
export function getBehaviorRatingIcon(rating: 'YES' | 'NO' | 'UNCERTAIN'): string {
  switch (rating) {
    case 'YES': return 'CheckCircle';
    case 'NO': return 'XCircle';
    case 'UNCERTAIN': return 'HelpCircle';
    default: return 'Circle';
  }
}