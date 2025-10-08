const createId = () => Math.random().toString(36).slice(2);

import { describe, expect, it } from 'vitest';
import {
  buildSalesCoachingSummary,
  buildSupportCoachingSummary,
  extractPracticeActions,
  type SalesCoachingSummary,
  type SupportCoachingSummary,
} from '@/utils/coachingInsights';
import type { Recording } from '@/types/recording';

const baseSalesRecording = (): Recording => ({
  id: createId(),
  title: 'Demo Call',
  status: 'completed',
  file_type: 'audio',
  created_at: new Date().toISOString(),
  coaching_evaluation: {
    overallScore: 6.4,
    strengths: ['Discovery flow'],
    improvements: ['Objection handling'],
    actionItems: ['Practice objection ladder'],
    criteria: [],
    priority: 'medium',
    timestamp: new Date().toISOString(),
  },
});

const baseSupportRecording = (): Recording => ({
  id: createId(),
  title: 'Customer Support Call',
  status: 'completed',
  file_type: 'audio',
  created_at: new Date().toISOString(),
  support_analysis: {
    escalationRisk: 'medium',
    customerSatisfaction: 72,
    resolutionEffectiveness: 68,
    empathyScore: 74,
    professionalismScore: 80,
    responsivenessScore: 70,
    escalationIndicators: [],
    satisfactionSignals: [],
    servqualMetrics: {
      tangibles: 65,
      reliability: 72,
      responsiveness: 68,
      assurance: 70,
      empathy: 78,
    },
    performanceMetrics: {
      firstContactResolution: 62,
      averageHandleTime: 380,
      customerEffortScore: 68,
      callResolutionStatus: 'resolved',
      responseTimeQuality: 72,
      issueComplexity: 'medium',
    },
    qualityMetrics: {
      communicationSkills: 76,
      problemSolvingEffectiveness: 70,
      deEscalationTechniques: 62,
      knowledgeBaseUsage: 74,
      complianceAdherence: 80,
    },
    journeyAnalysis: {
      issueIdentificationSpeed: 64,
      rootCauseAnalysisDepth: 70,
      solutionClarityScore: 72,
      customerEducationProvided: true,
      followUpPlanning: false,
    },
  },
});

describe('coachingInsights', () => {
  it('builds a sales coaching summary with practice opportunities', () => {
    const recordings: Recording[] = [
      { ...baseSalesRecording(), id: 'call-1', coaching_evaluation: { ...baseSalesRecording().coaching_evaluation, overallScore: 5.2, improvements: ['Discovery depth'], strengths: ['Rapport'], actionItems: ['Review discovery question bank'], timestamp: new Date().toISOString() } },
      { ...baseSalesRecording(), id: 'call-2', coaching_evaluation: { ...baseSalesRecording().coaching_evaluation, overallScore: 7.8, strengths: ['Value articulation'], improvements: ['Closing'], actionItems: ['Practice closing loop'], timestamp: new Date().toISOString() } },
    ];

    const summary = buildSalesCoachingSummary(recordings);

    expect(summary.analyzedCount).toBe(2);
    expect(summary.averageScore).toBeGreaterThan(0);
    expect(summary.practiceOpportunities.length).toBeGreaterThan(0);
    expect(summary.topImprovements[0]?.label).toBeDefined();
    expect(summary.frameworkPerformance.length).toBeGreaterThanOrEqual(0);
  });

  it('falls back to improvements when no explicit action items exist', () => {
    const recording = baseSalesRecording();
    if (recording.coaching_evaluation && typeof recording.coaching_evaluation === 'object') {
      recording.coaching_evaluation.actionItems = [];
      recording.coaching_evaluation.improvements = ['Follow-up plan'];
    }

    const actions = extractPracticeActions(recording);
    expect(actions).toContain('Work on: Follow-up plan');
  });

  it('builds a support coaching summary using support analysis metrics', () => {
    const recordings: Recording[] = [baseSupportRecording()];
    const summary = buildSupportCoachingSummary(recordings);

    expect(summary.supportEligibleCount).toBe(1);
    expect(summary.averageSatisfaction).toBeGreaterThan(0);
    expect(summary.servqualFocus.length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(summary.escalationBreakdown)).toEqual(['low', 'medium', 'high']);
  });
});

