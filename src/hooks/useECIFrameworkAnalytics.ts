import { useState, useEffect, useMemo } from 'react';
import {
  parseECIAnalysis,
  getECIOverallScore,
  getECIEscalationRisk,
  getECIPrimaryStrength,
  getECIPrimaryImprovement,
  hasECIAnalysis,
  type ECIAnalysisResult
} from '@/utils/eciAnalysis';
import type { Recording } from '@/types/recording';

export interface ECIOverviewStats {
  averageECIScore: number;
  managerReviewRequired: number;
  totalAnalyzed: number;
  escalationRate: number;
  careExcellenceRate: number;
  resolutionEffectivenessRate: number;
  callFlowComplianceRate: number;
}

export interface ECIBehaviorTrend {
  date: string;
  extremeOwnership: number;
  activeListening: number;
  empathy: number;
  toneAndPace: number;
  professionalism: number;
  customerConnection: number;
  properProcedures: number;
  accurateInformation: number;
  opening: number;
  holdTransfer: number;
  closing: number;
  documentation: number;
}

export interface ECISectionPerformance {
  name: string;
  score: number;
  yesCount: number;
  noCount: number;
  uncertainCount: number;
  weight: number;
}

export interface ECIManagerReviewItem {
  recordingId: string;
  title: string;
  agentName?: string;
  analysisDate: string;
  uncertainBehaviors: string[];
  priorityLevel: 'low' | 'medium' | 'high';
}

export interface ECITeamPerformance {
  agentName: string;
  recordingsCount: number;
  averageScore: number;
  strengthArea: string;
  improvementArea: string;
  managerReviewCount: number;
}

export function useECIFrameworkAnalytics(
  recordings: Recording[],
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter recordings by time range and ECI analysis availability
  const filteredRecordings = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return recordings.filter(recording => {
      const recordingDate = new Date(recording.created_at);
      return recordingDate >= cutoffDate && hasECIAnalysis(recording);
    });
  }, [recordings, timeRange]);

  // Calculate overview statistics
  const overviewStats: ECIOverviewStats = useMemo(() => {
    if (filteredRecordings.length === 0) {
      return {
        averageECIScore: 0,
        managerReviewRequired: 0,
        totalAnalyzed: 0,
        escalationRate: 0,
        careExcellenceRate: 0,
        resolutionEffectivenessRate: 0,
        callFlowComplianceRate: 0
      };
    }

    const analyses = filteredRecordings
      .map(recording => parseECIAnalysis(recording))
      .filter((analysis): analysis is ECIAnalysisResult => analysis !== null);

    if (analyses.length === 0) {
      return {
        averageECIScore: 0,
        managerReviewRequired: 0,
        totalAnalyzed: 0,
        escalationRate: 0,
        careExcellenceRate: 0,
        resolutionEffectivenessRate: 0,
        callFlowComplianceRate: 0
      };
    }

    const totalScore = analyses.reduce((sum, analysis) => sum + getECIOverallScore(analysis), 0);
    const managerReviewCount = analyses.filter(analysis => analysis.summary.managerReviewRequired).length;
    const highEscalationCount = analyses.filter(analysis => getECIEscalationRisk(analysis) === 'high').length;

    // Calculate section performance
    const careScores: number[] = [];
    const resolutionScores: number[] = [];
    const flowScores: number[] = [];

    analyses.forEach(analysis => {
      // Care for Customer (6 behaviors)
      const careYes = Object.values(analysis.careForCustomer).filter(b => b.rating === 'YES').length;
      careScores.push((careYes / 6) * 100);

      // Call Resolution (2 behaviors)
      const resolutionYes = Object.values(analysis.callResolution).filter(b => b.rating === 'YES').length;
      resolutionScores.push((resolutionYes / 2) * 100);

      // Call Flow (4 behaviors)
      const flowYes = Object.values(analysis.callFlow).filter(b => b.rating === 'YES').length;
      flowScores.push((flowYes / 4) * 100);
    });

    return {
      averageECIScore: Math.round(totalScore / analyses.length),
      managerReviewRequired: managerReviewCount,
      totalAnalyzed: analyses.length,
      escalationRate: Math.round((highEscalationCount / analyses.length) * 100),
      careExcellenceRate: Math.round(careScores.reduce((sum, score) => sum + score, 0) / careScores.length),
      resolutionEffectivenessRate: Math.round(resolutionScores.reduce((sum, score) => sum + score, 0) / resolutionScores.length),
      callFlowComplianceRate: Math.round(flowScores.reduce((sum, score) => sum + score, 0) / flowScores.length)
    };
  }, [filteredRecordings]);

  // Calculate section performance breakdown
  const sectionPerformance: ECISectionPerformance[] = useMemo(() => {
    const analyses = filteredRecordings
      .map(recording => parseECIAnalysis(recording))
      .filter((analysis): analysis is ECIAnalysisResult => analysis !== null);

    if (analyses.length === 0) {
      return [
        { name: 'Care for Customer', score: 0, yesCount: 0, noCount: 0, uncertainCount: 0, weight: 60 },
        { name: 'Call Resolution', score: 0, yesCount: 0, noCount: 0, uncertainCount: 0, weight: 30 },
        { name: 'Call Flow', score: 0, yesCount: 0, noCount: 0, uncertainCount: 0, weight: 10 }
      ];
    }

    // Care for Customer
    let careYes = 0, careNo = 0, careUncertain = 0;
    analyses.forEach(analysis => {
      Object.values(analysis.careForCustomer).forEach(behavior => {
        if (behavior.rating === 'YES') careYes++;
        else if (behavior.rating === 'NO') careNo++;
        else careUncertain++;
      });
    });
    const careBehaviors = careYes + careNo + careUncertain;
    const careScore = careBehaviors > 0 ? Math.round((careYes / careBehaviors) * 100) : 0;

    // Call Resolution
    let resolutionYes = 0, resolutionNo = 0, resolutionUncertain = 0;
    analyses.forEach(analysis => {
      Object.values(analysis.callResolution).forEach(behavior => {
        if (behavior.rating === 'YES') resolutionYes++;
        else if (behavior.rating === 'NO') resolutionNo++;
        else resolutionUncertain++;
      });
    });
    const resolutionBehaviors = resolutionYes + resolutionNo + resolutionUncertain;
    const resolutionScore = resolutionBehaviors > 0 ? Math.round((resolutionYes / resolutionBehaviors) * 100) : 0;

    // Call Flow
    let flowYes = 0, flowNo = 0, flowUncertain = 0;
    analyses.forEach(analysis => {
      Object.values(analysis.callFlow).forEach(behavior => {
        if (behavior.rating === 'YES') flowYes++;
        else if (behavior.rating === 'NO') flowNo++;
        else flowUncertain++;
      });
    });
    const flowBehaviors = flowYes + flowNo + flowUncertain;
    const flowScore = flowBehaviors > 0 ? Math.round((flowYes / flowBehaviors) * 100) : 0;

    return [
      {
        name: 'Care for Customer',
        score: careScore,
        yesCount: careYes,
        noCount: careNo,
        uncertainCount: careUncertain,
        weight: 60
      },
      {
        name: 'Call Resolution',
        score: resolutionScore,
        yesCount: resolutionYes,
        noCount: resolutionNo,
        uncertainCount: resolutionUncertain,
        weight: 30
      },
      {
        name: 'Call Flow',
        score: flowScore,
        yesCount: flowYes,
        noCount: flowNo,
        uncertainCount: flowUncertain,
        weight: 10
      }
    ];
  }, [filteredRecordings]);

  // Calculate manager review queue
  const managerReviewQueue: ECIManagerReviewItem[] = useMemo(() => {
    const reviews: ECIManagerReviewItem[] = [];

    filteredRecordings.forEach(recording => {
      const analysis = parseECIAnalysis(recording);
      if (!analysis || !analysis.summary.managerReviewRequired) return;

      // Find uncertain behaviors
      const uncertainBehaviors: string[] = [];
      Object.entries(analysis.careForCustomer).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(key.replace(/([A-Z])/g, ' $1').trim());
        }
      });
      Object.entries(analysis.callResolution).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(key.replace(/([A-Z])/g, ' $1').trim());
        }
      });
      Object.entries(analysis.callFlow).forEach(([key, behavior]) => {
        if (behavior.rating === 'UNCERTAIN') {
          uncertainBehaviors.push(key.replace(/([A-Z])/g, ' $1').trim());
        }
      });

      // Determine priority level
      let priorityLevel: 'low' | 'medium' | 'high' = 'low';
      const escalationRisk = getECIEscalationRisk(analysis);
      if (escalationRisk === 'high' || uncertainBehaviors.length >= 4) {
        priorityLevel = 'high';
      } else if (escalationRisk === 'medium' || uncertainBehaviors.length >= 2) {
        priorityLevel = 'medium';
      }

      reviews.push({
        recordingId: recording.id,
        title: recording.title || 'Untitled Recording',
        agentName: recording.user_profiles?.full_name || 'Unknown Agent',
        analysisDate: analysis.analysisDate,
        uncertainBehaviors,
        priorityLevel
      });
    });

    // Sort by priority and date
    return reviews.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priorityLevel] !== priorityOrder[b.priorityLevel]) {
        return priorityOrder[b.priorityLevel] - priorityOrder[a.priorityLevel];
      }
      return new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime();
    });
  }, [filteredRecordings]);

  // Calculate trend data (simplified for now)
  const trendData: ECIBehaviorTrend[] = useMemo(() => {
    // This could be expanded to show trends over time
    // For now, return empty array as placeholder
    return [];
  }, [filteredRecordings]);

  // Calculate team performance
  const teamPerformance: ECITeamPerformance[] = useMemo(() => {
    const agentMap = new Map<string, {
      recordings: Recording[];
      analyses: ECIAnalysisResult[];
    }>();

    filteredRecordings.forEach(recording => {
      const agentName = recording.user_profiles?.full_name || 'Unknown Agent';
      const analysis = parseECIAnalysis(recording);

      if (!agentMap.has(agentName)) {
        agentMap.set(agentName, { recordings: [], analyses: [] });
      }

      agentMap.get(agentName)!.recordings.push(recording);
      if (analysis) {
        agentMap.get(agentName)!.analyses.push(analysis);
      }
    });

    const teamStats: ECITeamPerformance[] = [];

    agentMap.forEach((data, agentName) => {
      if (data.analyses.length === 0) return;

      const averageScore = Math.round(
        data.analyses.reduce((sum, analysis) => sum + getECIOverallScore(analysis), 0) / data.analyses.length
      );

      const strengthArea = getECIPrimaryStrength(data.analyses[0]) || 'Overall Performance';
      const improvementArea = getECIPrimaryImprovement(data.analyses[0]) || 'General Development';
      const managerReviewCount = data.analyses.filter(a => a.summary.managerReviewRequired).length;

      teamStats.push({
        agentName,
        recordingsCount: data.recordings.length,
        averageScore,
        strengthArea,
        improvementArea,
        managerReviewCount
      });
    });

    return teamStats.sort((a, b) => b.averageScore - a.averageScore);
  }, [filteredRecordings]);

  // Effect to simulate loading
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Simulate async loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredRecordings]);

  return {
    overviewStats,
    sectionPerformance,
    managerReviewQueue,
    teamPerformance,
    trendData,
    loading,
    error
  };
}