// Support Signal Analysis Utilities for Customer Support Framework
import type { Recording } from '@/types/recording';

export interface SupportSignalAnalysis {
  escalationRisk: 'low' | 'medium' | 'high';
  customerSatisfaction: number;
  resolutionEffectiveness: number;
  empathyScore: number;
  professionalismScore: number;
  responsivenessScore: number;
  escalationIndicators: string[];
  satisfactionSignals: string[];
  servqualMetrics: {
    tangibles: number;
    reliability: number;
    responsiveness: number;
    assurance: number;
    empathy: number;
  };
  // New Support Performance KPIs
  performanceMetrics: {
    firstContactResolution: number;
    averageHandleTime: number;
    customerEffortScore: number;
    callResolutionStatus: 'resolved' | 'pending' | 'escalated' | 'follow-up';
    responseTimeQuality: number;
    issueComplexity: 'simple' | 'medium' | 'complex';
  };
  // Enhanced Quality Metrics
  qualityMetrics: {
    communicationSkills: number;
    problemSolvingEffectiveness: number;
    deEscalationTechniques: number;
    knowledgeBaseUsage: number;
    complianceAdherence: number;
  };
  // Customer Journey Analysis
  journeyAnalysis: {
    issueIdentificationSpeed: number;
    rootCauseAnalysisDepth: number;
    solutionClarityScore: number;
    customerEducationProvided: boolean;
    followUpPlanning: boolean;
  };
}

export interface SupportMoment {
  id: string;
  timestamp: number;
  type: 'escalation' | 'satisfaction' | 'resolution' | 'empathy';
  severity: 'low' | 'medium' | 'high';
  description: string;
  speaker: string;
  confidence: number;
}

// Analyze recording for support-specific signals
export function analyzeAllSupportSignals(recording: Recording): SupportSignalAnalysis {
  if (!recording?.transcript) {
    return getDefaultSupportAnalysis();
  }

  const transcript = recording.transcript.toLowerCase();
  
  // Escalation indicators
  const escalationKeywords = [
    'frustrated', 'angry', 'supervisor', 'manager', 'complaint', 
    'unacceptable', 'ridiculous', 'terrible', 'worst', 'cancel',
    'refund', 'lawyer', 'better business bureau', 'review'
  ];
  
  // Satisfaction indicators
  const satisfactionKeywords = [
    'thank you', 'thanks', 'appreciate', 'helpful', 'great',
    'excellent', 'perfect', 'wonderful', 'amazing', 'solved',
    'resolved', 'happy', 'satisfied', 'pleased'
  ];
  
  // Empathy indicators
  const empathyKeywords = [
    'understand', 'sorry', 'apologize', 'feel', 'hear you',
    'i see', 'that must be', 'i can imagine', 'sympathize'
  ];
  
  // Professionalism indicators
  const professionalismKeywords = [
    'please', 'may i', 'would you like', 'i will', 'let me',
    'certainly', 'absolutely', 'of course', 'right away'
  ];

  // Count indicators
  const escalationCount = countKeywords(transcript, escalationKeywords);
  const satisfactionCount = countKeywords(transcript, satisfactionKeywords);
  const empathyCount = countKeywords(transcript, empathyKeywords);
  const professionalismCount = countKeywords(transcript, professionalismKeywords);

  // Calculate scores (0-100)
  const wordCount = transcript.split(' ').length;
  const escalationRatio = escalationCount / Math.max(wordCount / 100, 1);
  const satisfactionRatio = satisfactionCount / Math.max(wordCount / 100, 1);
  
  // Determine escalation risk
  let escalationRisk: 'low' | 'medium' | 'high' = 'low';
  if (escalationRatio > 3) escalationRisk = 'high';
  else if (escalationRatio > 1.5) escalationRisk = 'medium';

  // Calculate metrics
  const customerSatisfaction = Math.min(100, Math.max(0, 50 + (satisfactionRatio * 10) - (escalationRatio * 15)));
  const empathyScore = Math.min(100, Math.max(30, 60 + (empathyCount * 8)));
  const professionalismScore = Math.min(100, Math.max(40, 70 + (professionalismCount * 5)));
  const responsivenessScore = Math.min(100, Math.max(50, 80 - (escalationRatio * 10)));
  const resolutionEffectiveness = Math.min(100, Math.max(20, customerSatisfaction - (escalationRisk === 'high' ? 30 : escalationRisk === 'medium' ? 15 : 0)));

  // Generate specific indicators
  const escalationIndicators = generateEscalationIndicators(escalationCount, transcript);
  const satisfactionSignals = generateSatisfactionSignals(satisfactionCount, transcript);

  // Calculate new performance metrics
  const performanceMetrics = calculatePerformanceMetrics(recording, transcript, escalationRisk, satisfactionRatio);
  const qualityMetrics = calculateQualityMetrics(transcript, empathyCount, professionalismCount, escalationCount);
  const journeyAnalysis = calculateJourneyAnalysis(transcript, recording);

  return {
    escalationRisk,
    customerSatisfaction: Math.round(customerSatisfaction),
    resolutionEffectiveness: Math.round(resolutionEffectiveness),
    empathyScore: Math.round(empathyScore),
    professionalismScore: Math.round(professionalismScore),
    responsivenessScore: Math.round(responsivenessScore),
    escalationIndicators,
    satisfactionSignals,
    servqualMetrics: {
      tangibles: Math.round(professionalismScore * 0.9), // Based on professionalism
      reliability: Math.round(resolutionEffectiveness),
      responsiveness: Math.round(responsivenessScore),
      assurance: Math.round((professionalismScore + empathyScore) / 2),
      empathy: Math.round(empathyScore)
    },
    performanceMetrics,
    qualityMetrics,
    journeyAnalysis
  };
}

// Extract support moments from recording
export function extractSupportMoments(recording: Recording): SupportMoment[] {
  if (!recording?.transcript || !recording?.duration) {
    return [];
  }

  const moments: SupportMoment[] = [];
  const transcript = recording.transcript.toLowerCase();
  const duration = recording.duration;
  
  // Simulate moment extraction based on keywords and timing
  const escalationPhrases = ['frustrated', 'angry', 'supervisor', 'manager'];
  const satisfactionPhrases = ['thank you', 'helpful', 'resolved', 'perfect'];
  
  escalationPhrases.forEach((phrase, index) => {
    if (transcript.includes(phrase)) {
      moments.push({
        id: `escalation-${index}`,
        timestamp: Math.floor((duration / escalationPhrases.length) * (index + 1)),
        type: 'escalation',
        severity: phrase === 'angry' || phrase === 'supervisor' ? 'high' : 'medium',
        description: `Escalation indicator detected: "${phrase}"`,
        speaker: index % 2 === 0 ? 'Customer' : 'Agent',
        confidence: 0.8
      });
    }
  });
  
  satisfactionPhrases.forEach((phrase, index) => {
    if (transcript.includes(phrase)) {
      moments.push({
        id: `satisfaction-${index}`,
        timestamp: Math.floor((duration / satisfactionPhrases.length) * (index + 1)),
        type: 'satisfaction',
        severity: 'low',
        description: `Positive feedback detected: "${phrase}"`,
        speaker: index % 2 === 0 ? 'Customer' : 'Agent',
        confidence: 0.85
      });
    }
  });

  return moments.sort((a, b) => a.timestamp - b.timestamp);
}

// Helper functions
function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const matches = text.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function generateEscalationIndicators(count: number, transcript: string): string[] {
  const indicators: string[] = [];
  
  if (transcript.includes('supervisor') || transcript.includes('manager')) {
    indicators.push('Customer requested to speak with supervisor');
  }
  if (transcript.includes('frustrated') || transcript.includes('angry')) {
    indicators.push('Customer expressed frustration or anger');
  }
  if (transcript.includes('complaint') || transcript.includes('unacceptable')) {
    indicators.push('Formal complaint language detected');
  }
  if (count > 5) {
    indicators.push('High frequency of escalation language');
  }
  
  return indicators.slice(0, 3); // Limit to top 3 indicators
}

function generateSatisfactionSignals(count: number, transcript: string): string[] {
  const signals: string[] = [];
  
  if (transcript.includes('thank you') || transcript.includes('thanks')) {
    signals.push('Customer expressed gratitude');
  }
  if (transcript.includes('helpful') || transcript.includes('great')) {
    signals.push('Positive feedback about service quality');
  }
  if (transcript.includes('resolved') || transcript.includes('solved')) {
    signals.push('Issue resolution confirmed');
  }
  if (count > 3) {
    signals.push('Multiple positive sentiment indicators');
  }
  
  return signals.slice(0, 3); // Limit to top 3 signals
}

function getDefaultSupportAnalysis(): SupportSignalAnalysis {
  return {
    escalationRisk: 'low',
    customerSatisfaction: 75,
    resolutionEffectiveness: 70,
    empathyScore: 80,
    professionalismScore: 85,
    responsivenessScore: 75,
    escalationIndicators: [],
    satisfactionSignals: [],
    servqualMetrics: {
      tangibles: 75,
      reliability: 70,
      responsiveness: 75,
      assurance: 82,
      empathy: 80
    },
    performanceMetrics: {
      firstContactResolution: 85,
      averageHandleTime: 75,
      customerEffortScore: 80,
      callResolutionStatus: 'resolved',
      responseTimeQuality: 85,
      issueComplexity: 'medium'
    },
    qualityMetrics: {
      communicationSkills: 80,
      problemSolvingEffectiveness: 75,
      deEscalationTechniques: 70,
      knowledgeBaseUsage: 85,
      complianceAdherence: 90
    },
    journeyAnalysis: {
      issueIdentificationSpeed: 80,
      rootCauseAnalysisDepth: 75,
      solutionClarityScore: 85,
      customerEducationProvided: true,
      followUpPlanning: false
    }
  };
}

// Calculate performance metrics based on call analysis
function calculatePerformanceMetrics(
  recording: Recording, 
  transcript: string, 
  escalationRisk: 'low' | 'medium' | 'high',
  satisfactionRatio: number
) {
  const duration = recording.duration || 300; // Default 5 minutes
  
  // Resolution indicators
  const resolutionKeywords = ['resolved', 'solved', 'fixed', 'completed', 'done', 'working now'];
  const resolutionCount = countKeywords(transcript, resolutionKeywords);
  
  // First Contact Resolution (FCR) - based on resolution language and no escalation
  const fcrScore = escalationRisk === 'low' && resolutionCount > 0 ? 
    Math.min(100, 70 + (resolutionCount * 10) + (satisfactionRatio * 5)) : 
    Math.max(20, 50 - (escalationRisk === 'high' ? 30 : 15));

  // Average Handle Time scoring (industry benchmark: 6-8 minutes for typical support)
  const ahtScore = duration <= 300 ? 90 : // Under 5 min - excellent
                  duration <= 480 ? 80 : // 5-8 min - good  
                  duration <= 600 ? 70 : // 8-10 min - average
                  duration <= 900 ? 60 : // 10-15 min - below average
                  40; // Over 15 min - needs improvement

  // Customer Effort Score - how easy was it for customer
  const effortKeywords = ['easy', 'simple', 'quick', 'straightforward', 'clear'];
  const difficultyKeywords = ['complicated', 'confusing', 'difficult', 'hard', 'unclear'];
  const effortCount = countKeywords(transcript, effortKeywords);
  const difficultyCount = countKeywords(transcript, difficultyKeywords);
  const cesScore = Math.min(100, Math.max(30, 70 + (effortCount * 8) - (difficultyCount * 12)));

  // Determine call resolution status
  let callResolutionStatus: 'resolved' | 'pending' | 'escalated' | 'follow-up' = 'resolved';
  if (escalationRisk === 'high') callResolutionStatus = 'escalated';
  else if (transcript.includes('follow up') || transcript.includes('call back')) callResolutionStatus = 'follow-up';
  else if (resolutionCount === 0) callResolutionStatus = 'pending';

  // Response Time Quality - how quickly agent responded to customer needs
  const responseKeywords = ['right away', 'immediately', 'let me check', 'one moment'];
  const delayKeywords = ['hold on', 'wait', 'give me time', 'later', 'busy'];
  const responseCount = countKeywords(transcript, responseKeywords);
  const delayCount = countKeywords(transcript, delayKeywords);
  const responseTimeScore = Math.min(100, Math.max(40, 75 + (responseCount * 8) - (delayCount * 10)));

  // Issue Complexity Assessment
  const complexKeywords = ['multiple', 'several', 'various', 'complex', 'technical', 'advanced'];
  const simpleKeywords = ['simple', 'basic', 'quick', 'easy fix', 'standard'];
  const complexCount = countKeywords(transcript, complexKeywords);
  const simpleCount = countKeywords(transcript, simpleKeywords);
  
  let issueComplexity: 'simple' | 'medium' | 'complex' = 'medium';
  if (simpleCount > complexCount && duration < 300) issueComplexity = 'simple';
  else if (complexCount > 2 || duration > 600) issueComplexity = 'complex';

  return {
    firstContactResolution: Math.round(fcrScore),
    averageHandleTime: Math.round(ahtScore),
    customerEffortScore: Math.round(cesScore),
    callResolutionStatus,
    responseTimeQuality: Math.round(responseTimeScore),
    issueComplexity
  };
}

// Calculate quality metrics for support agent performance
function calculateQualityMetrics(
  transcript: string, 
  empathyCount: number, 
  professionalismCount: number,
  escalationCount: number
) {
  // Communication Skills Assessment
  const communicationKeywords = ['understand', 'explain', 'clarify', 'confirm', 'repeat back'];
  const communicationCount = countKeywords(transcript, communicationKeywords);
  const communicationScore = Math.min(100, Math.max(50, 70 + (communicationCount * 6) + (professionalismCount * 3)));

  // Problem-Solving Effectiveness
  const problemSolvingKeywords = ['investigate', 'check', 'analyze', 'troubleshoot', 'diagnose', 'solution'];
  const problemSolvingCount = countKeywords(transcript, problemSolvingKeywords);
  const problemSolvingScore = Math.min(100, Math.max(40, 65 + (problemSolvingCount * 8)));

  // De-escalation Techniques
  const deEscalationKeywords = ['calm', 'understand your concern', 'i apologize', 'let me help', 'work together'];
  const deEscalationCount = countKeywords(transcript, deEscalationKeywords);
  const deEscalationScore = escalationCount > 0 ? 
    Math.min(100, Math.max(30, 50 + (deEscalationCount * 15) - (escalationCount * 5))) :
    Math.min(100, 80 + (deEscalationCount * 5));

  // Knowledge Base Usage
  const knowledgeKeywords = ['according to', 'documentation shows', 'policy states', 'procedure is', 'let me look up'];
  const knowledgeCount = countKeywords(transcript, knowledgeKeywords);
  const knowledgeScore = Math.min(100, Math.max(50, 70 + (knowledgeCount * 10)));

  // Compliance Adherence
  const complianceKeywords = ['verify', 'confirm identity', 'security', 'policy', 'procedure', 'terms'];
  const complianceCount = countKeywords(transcript, complianceKeywords);
  const complianceScore = Math.min(100, Math.max(60, 80 + (complianceCount * 5)));

  return {
    communicationSkills: Math.round(communicationScore),
    problemSolvingEffectiveness: Math.round(problemSolvingScore),
    deEscalationTechniques: Math.round(deEscalationScore),
    knowledgeBaseUsage: Math.round(knowledgeScore),
    complianceAdherence: Math.round(complianceScore)
  };
}

// Analyze customer journey through the support interaction
function calculateJourneyAnalysis(transcript: string, recording: Recording) {
  // Issue Identification Speed
  const identificationKeywords = ['problem is', 'issue with', 'having trouble', 'not working'];
  const identificationCount = countKeywords(transcript, identificationKeywords);
  const wordCount = transcript.split(' ').length;
  const identificationSpeed = identificationCount > 0 ? 
    Math.min(100, Math.max(40, 85 - (wordCount / identificationCount / 20))) : 60;

  // Root Cause Analysis Depth
  const analysisKeywords = ['why', 'cause', 'reason', 'investigate', 'check logs', 'examine'];
  const analysisCount = countKeywords(transcript, analysisKeywords);
  const rootCauseScore = Math.min(100, Math.max(30, 50 + (analysisCount * 12)));

  // Solution Clarity Score
  const clarityKeywords = ['step by step', 'first', 'then', 'next', 'finally', 'clear instructions'];
  const clarityCount = countKeywords(transcript, clarityKeywords);
  const solutionClarityScore = Math.min(100, Math.max(40, 60 + (clarityCount * 10)));

  // Customer Education Provided
  const educationKeywords = ['prevent', 'avoid', 'in future', 'tip', 'best practice', 'recommend'];
  const customerEducationProvided = countKeywords(transcript, educationKeywords) > 0;

  // Follow-up Planning
  const followUpKeywords = ['follow up', 'call back', 'check in', 'monitor', 'contact you'];
  const followUpPlanning = countKeywords(transcript, followUpKeywords) > 0;

  return {
    issueIdentificationSpeed: Math.round(identificationSpeed),
    rootCauseAnalysisDepth: Math.round(rootCauseScore),
    solutionClarityScore: Math.round(solutionClarityScore),
    customerEducationProvided,
    followUpPlanning
  };
}

// Additional utility functions for support analytics aggregation

// Aggregate support metrics across multiple recordings
export function aggregateSupportMetrics(recordings: Recording[]): {
  avgSatisfaction: number;
  avgFCR: number;
  avgCES: number;
  avgAHT: number;
  escalationDistribution: { low: number; medium: number; high: number };
  qualityMetrics: {
    communication: number;
    problemSolving: number;
    deEscalation: number;
    knowledge: number;
    compliance: number;
  };
  servqualAverages: {
    reliability: number;
    assurance: number;
    tangibles: number;
    empathy: number;
    responsiveness: number;
  };
  journeyMetrics: {
    issueIdentificationSpeed: number;
    rootCauseDepth: number;
    solutionClarity: number;
    customerEducation: number;
    followUpPlanning: number;
  };
} {
  const supportRecordings = recordings.filter(r => 
    r.status === 'completed' && (r.support_analysis || r.transcript)
  );

  if (supportRecordings.length === 0) {
    return {
      avgSatisfaction: 0,
      avgFCR: 0,
      avgCES: 0,
      avgAHT: 0,
      escalationDistribution: { low: 0, medium: 0, high: 0 },
      qualityMetrics: {
        communication: 0,
        problemSolving: 0,
        deEscalation: 0,
        knowledge: 0,
        compliance: 0
      },
      servqualAverages: {
        reliability: 0,
        assurance: 0,
        tangibles: 0,
        empathy: 0,
        responsiveness: 0
      },
      journeyMetrics: {
        issueIdentificationSpeed: 0,
        rootCauseDepth: 0,
        solutionClarity: 0,
        customerEducation: 0,
        followUpPlanning: 0
      }
    };
  }

  let totalSatisfaction = 0;
  let totalFCR = 0;
  let totalCES = 0;
  let totalAHT = 0;
  let escalationCounts = { low: 0, medium: 0, high: 0 };
  let qualityTotals = { communication: 0, problemSolving: 0, deEscalation: 0, knowledge: 0, compliance: 0 };
  let servqualTotals = { reliability: 0, assurance: 0, tangibles: 0, empathy: 0, responsiveness: 0 };
  let journeyTotals = { issueIdentificationSpeed: 0, rootCauseDepth: 0, solutionClarity: 0, customerEducation: 0, followUpPlanning: 0 };

  supportRecordings.forEach(recording => {
    let analysis: SupportSignalAnalysis;
    if (recording.support_analysis) {
      analysis = typeof recording.support_analysis === 'string' 
        ? JSON.parse(recording.support_analysis)
        : recording.support_analysis;
    } else {
      analysis = analyzeAllSupportSignals(recording);
    }

    totalSatisfaction += analysis.customerSatisfaction || 0;
    totalFCR += analysis.performanceMetrics?.firstContactResolution || 0;
    totalCES += analysis.performanceMetrics?.customerEffortScore || 0;
    totalAHT += analysis.performanceMetrics?.averageHandleTime || 0;
    escalationCounts[analysis.escalationRisk || 'low']++;

    if (analysis.qualityMetrics) {
      qualityTotals.communication += analysis.qualityMetrics.communicationSkills || 0;
      qualityTotals.problemSolving += analysis.qualityMetrics.problemSolvingEffectiveness || 0;
      qualityTotals.deEscalation += analysis.qualityMetrics.deEscalationTechniques || 0;
      qualityTotals.knowledge += analysis.qualityMetrics.knowledgeBaseUsage || 0;
      qualityTotals.compliance += analysis.qualityMetrics.complianceAdherence || 0;
    }

    if (analysis.servqualMetrics) {
      servqualTotals.reliability += analysis.servqualMetrics.reliability || 0;
      servqualTotals.assurance += analysis.servqualMetrics.assurance || 0;
      servqualTotals.tangibles += analysis.servqualMetrics.tangibles || 0;
      servqualTotals.empathy += analysis.servqualMetrics.empathy || 0;
      servqualTotals.responsiveness += analysis.servqualMetrics.responsiveness || 0;
    }

    if (analysis.journeyAnalysis) {
      journeyTotals.issueIdentificationSpeed += analysis.journeyAnalysis.issueIdentificationSpeed || 0;
      journeyTotals.rootCauseDepth += analysis.journeyAnalysis.rootCauseAnalysisDepth || 0;
      journeyTotals.solutionClarity += analysis.journeyAnalysis.solutionClarityScore || 0;
      journeyTotals.customerEducation += analysis.journeyAnalysis.customerEducationProvided ? 100 : 0;
      journeyTotals.followUpPlanning += analysis.journeyAnalysis.followUpPlanning ? 100 : 0;
    }
  });

  const count = supportRecordings.length;
  return {
    avgSatisfaction: Math.round(totalSatisfaction / count),
    avgFCR: Math.round(totalFCR / count),
    avgCES: Math.round(totalCES / count),
    avgAHT: Math.round(totalAHT / count),
    escalationDistribution: escalationCounts,
    qualityMetrics: {
      communication: Math.round(qualityTotals.communication / count),
      problemSolving: Math.round(qualityTotals.problemSolving / count),
      deEscalation: Math.round(qualityTotals.deEscalation / count),
      knowledge: Math.round(qualityTotals.knowledge / count),
      compliance: Math.round(qualityTotals.compliance / count)
    },
    servqualAverages: {
      reliability: Math.round(servqualTotals.reliability / count),
      assurance: Math.round(servqualTotals.assurance / count),
      tangibles: Math.round(servqualTotals.tangibles / count),
      empathy: Math.round(servqualTotals.empathy / count),
      responsiveness: Math.round(servqualTotals.responsiveness / count)
    },
    journeyMetrics: {
      issueIdentificationSpeed: Math.round(journeyTotals.issueIdentificationSpeed / count),
      rootCauseDepth: Math.round(journeyTotals.rootCauseDepth / count),
      solutionClarity: Math.round(journeyTotals.solutionClarity / count),
      customerEducation: Math.round(journeyTotals.customerEducation / count),
      followUpPlanning: Math.round(journeyTotals.followUpPlanning / count)
    }
  };
}

// Generate support quality trends over time
export function generateSupportTrends(recordings: Recording[], days: number = 7): Array<{
  date: string;
  satisfaction: number;
  fcr: number;
  ces: number;
  calls: number;
}> {
  const trends = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayRecordings = recordings.filter(r => {
      const recordingDate = new Date(r.created_at);
      return recordingDate.toDateString() === date.toDateString() &&
             r.status === 'completed' && 
             (r.support_analysis || r.transcript);
    });

    if (dayRecordings.length === 0) {
      trends.push({ date: dateStr, satisfaction: 0, fcr: 0, ces: 0, calls: 0 });
      continue;
    }

    const dayMetrics = aggregateSupportMetrics(dayRecordings);
    trends.push({
      date: dateStr,
      satisfaction: dayMetrics.avgSatisfaction,
      fcr: dayMetrics.avgFCR,
      ces: dayMetrics.avgCES,
      calls: dayRecordings.length
    });
  }

  return trends;
}

// Calculate support quality score based on multiple factors
export function calculateOverallSupportScore(analysis: SupportSignalAnalysis): number {
  const weights = {
    satisfaction: 0.25,
    fcr: 0.20,
    ces: 0.15,
    servqual: 0.25,
    quality: 0.15
  };

  const servqualAvg = Object.values(analysis.servqualMetrics).reduce((a, b) => a + b, 0) / 5;
  const qualityAvg = Object.values(analysis.qualityMetrics).reduce((a, b) => a + b, 0) / 5;

  return Math.round(
    (analysis.customerSatisfaction * weights.satisfaction) +
    (analysis.performanceMetrics.firstContactResolution * weights.fcr) +
    (analysis.performanceMetrics.customerEffortScore * weights.ces) +
    (servqualAvg * weights.servqual) +
    (qualityAvg * weights.quality)
  );
}

// Generate support coaching recommendations
export function generateSupportCoachingRecommendations(analysis: SupportSignalAnalysis): Array<{
  category: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  score: number;
}> {
  const recommendations = [];

  // Customer satisfaction
  if (analysis.customerSatisfaction < 70) {
    recommendations.push({
      category: 'Customer Satisfaction',
      priority: 'high' as const,
      recommendation: 'Focus on active listening and empathy. Use positive language and confirm customer understanding.',
      score: analysis.customerSatisfaction
    });
  }

  // First Contact Resolution
  if (analysis.performanceMetrics.firstContactResolution < 80) {
    recommendations.push({
      category: 'First Contact Resolution',
      priority: 'high' as const,
      recommendation: 'Improve diagnostic skills and solution knowledge. Ask clarifying questions early.',
      score: analysis.performanceMetrics.firstContactResolution
    });
  }

  // Escalation risk
  if (analysis.escalationRisk === 'high') {
    recommendations.push({
      category: 'De-escalation',
      priority: 'high' as const,
      recommendation: 'Practice de-escalation techniques. Acknowledge concerns and offer multiple solutions.',
      score: analysis.qualityMetrics.deEscalationTechniques
    });
  }

  // SERVQUAL dimensions
  Object.entries(analysis.servqualMetrics).forEach(([dimension, score]) => {
    if (score < 75) {
      recommendations.push({
        category: `SERVQUAL - ${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`,
        priority: score < 60 ? 'high' as const : 'medium' as const,
        recommendation: getSERVQUALRecommendation(dimension, score),
        score
      });
    }
  });

  // Quality metrics
  Object.entries(analysis.qualityMetrics).forEach(([metric, score]) => {
    if (score < 70) {
      recommendations.push({
        category: formatCamelCase(metric),
        priority: score < 50 ? 'high' as const : 'medium' as const,
        recommendation: getQualityRecommendation(metric, score),
        score
      });
    }
  });

  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || a.score - b.score;
    })
    .slice(0, 8); // Limit to top 8 recommendations
}

// Helper functions for recommendations
function getSERVQUALRecommendation(dimension: string, score: number): string {
  const recommendations = {
    reliability: 'Improve consistency in service delivery. Follow through on commitments and provide accurate information.',
    assurance: 'Build customer confidence through knowledge demonstration and professional communication.',
    tangibles: 'Enhance professional presentation and improve documentation quality.',
    empathy: 'Show more understanding and concern for customer needs. Use empathetic language.',
    responsiveness: 'Respond more quickly to customer requests. Communicate wait times clearly.'
  };
  return recommendations[dimension as keyof typeof recommendations] || 'Focus on improving this service dimension.';
}

function getQualityRecommendation(metric: string, score: number): string {
  const recommendations = {
    communicationSkills: 'Practice active listening and clear explanations. Confirm understanding regularly.',
    problemSolvingEffectiveness: 'Develop systematic troubleshooting approaches. Ask diagnostic questions.',
    deEscalationTechniques: 'Learn de-escalation strategies. Remain calm and acknowledge concerns.',
    knowledgeBaseUsage: 'Utilize knowledge resources more effectively. Stay updated on procedures.',
    complianceAdherence: 'Follow established procedures and verify customer information properly.'
  };
  return recommendations[metric as keyof typeof recommendations] || 'Focus on improving this quality aspect.';
}

function formatCamelCase(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}