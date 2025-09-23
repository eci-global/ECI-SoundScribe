import { useMemo } from 'react';
import type { Recording } from '@/types/recording';
import { 
  aggregateSupportMetrics, 
  generateSupportTrends,
  analyzeAllSupportSignals,
  type SupportSignalAnalysis
} from '@/utils/supportSignals';
import { subDays } from 'date-fns';

interface SupportFrameworkAnalytics {
  // Overview stats
  overviewStats: {
    averageServqual: number;
    customerSatisfaction: number;
    resolutionRate: number;
    escalationRate: number;
  };
  
  // Chart data
  servqualData: Array<{
    dimension: string;
    score: number;
    target: number;
  }>;
  
  journeyStageData: Array<{
    stage: string;
    satisfaction: number;
    efficiency: number;
  }>;
  
  resolutionMetrics: Array<{
    category: string;
    resolution: number;
    avgTime: number;
    satisfaction: number;
    volume: number;
    complexity: 'simple' | 'medium' | 'complex';
  }>;
  
  trendData: Array<{
    date: string;
    servqual: number;
    satisfaction: number;
    resolution: number;
  }>;
  
  // Component data
  servqualDimensions: Array<{
    name: string;
    score: number;
    description: string;
    strengths: string[];
    improvements: string[];
  }>;
  
  journeyStages: Array<{
    name: string;
    satisfaction: number;
    efficiency: number;
    avgDuration: string;
    keyMetrics: string[];
    insights: string[];
  }>;
  
  resolutionCategories: Array<{
    category: string;
    resolution: number;
    avgTime: number;
    satisfaction: number;
    volume: number;
    complexity: 'simple' | 'medium' | 'complex';
    topIssues: string[];
  }>;
  
  loading: boolean;
  error: string | null;
}

export function useSupportFrameworkAnalytics(
  recordings: Recording[], 
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): SupportFrameworkAnalytics {
  
  return useMemo(() => {
    try {
      // Filter recordings by time range and support capability
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const cutoffDate = subDays(new Date(), days);
      
      const filteredRecordings = recordings.filter(r => {
        const recordingDate = new Date(r.created_at);
        return recordingDate >= cutoffDate && 
               r.status === 'completed' && 
               (r.support_analysis || r.transcript);
      });

      if (filteredRecordings.length === 0) {
        return getEmptyAnalytics();
      }

      // Get aggregated metrics
      const aggregatedMetrics = aggregateSupportMetrics(filteredRecordings);
      
      // Calculate overview stats
      const overviewStats = {
        averageServqual: Math.round(
          (aggregatedMetrics.servqualAverages.reliability + 
           aggregatedMetrics.servqualAverages.assurance + 
           aggregatedMetrics.servqualAverages.tangibles + 
           aggregatedMetrics.servqualAverages.empathy + 
           aggregatedMetrics.servqualAverages.responsiveness) / 5
        ),
        customerSatisfaction: aggregatedMetrics.avgSatisfaction,
        resolutionRate: aggregatedMetrics.avgFCR,
        escalationRate: Math.round(
          (aggregatedMetrics.escalationDistribution.medium * 0.5 + 
           aggregatedMetrics.escalationDistribution.high * 1) / 
          (aggregatedMetrics.escalationDistribution.low + 
           aggregatedMetrics.escalationDistribution.medium + 
           aggregatedMetrics.escalationDistribution.high) * 100
        )
      };

      // Prepare SERVQUAL chart data
      const servqualData = [
        { dimension: 'Reliability', score: aggregatedMetrics.servqualAverages.reliability, target: 85 },
        { dimension: 'Assurance', score: aggregatedMetrics.servqualAverages.assurance, target: 85 },
        { dimension: 'Tangibles', score: aggregatedMetrics.servqualAverages.tangibles, target: 85 },
        { dimension: 'Empathy', score: aggregatedMetrics.servqualAverages.empathy, target: 85 },
        { dimension: 'Responsiveness', score: aggregatedMetrics.servqualAverages.responsiveness, target: 85 }
      ];

      // Prepare journey stage data
      const journeyStageData = [
        { stage: 'Issue Identification', satisfaction: aggregatedMetrics.journeyMetrics.issueIdentificationSpeed, efficiency: aggregatedMetrics.journeyMetrics.issueIdentificationSpeed },
        { stage: 'Problem Analysis', satisfaction: aggregatedMetrics.journeyMetrics.rootCauseDepth, efficiency: aggregatedMetrics.journeyMetrics.rootCauseDepth },
        { stage: 'Solution Development', satisfaction: aggregatedMetrics.journeyMetrics.solutionClarity, efficiency: aggregatedMetrics.journeyMetrics.solutionClarity },
        { stage: 'Implementation', satisfaction: Math.round((aggregatedMetrics.avgSatisfaction + aggregatedMetrics.avgFCR) / 2), efficiency: aggregatedMetrics.avgFCR },
        { stage: 'Follow-up', satisfaction: aggregatedMetrics.journeyMetrics.followUpPlanning, efficiency: aggregatedMetrics.journeyMetrics.followUpPlanning }
      ];

      // Calculate resolution metrics by categorizing recordings
      const resolutionMetrics = calculateResolutionMetrics(filteredRecordings);

      // Generate trend data
      const trends = generateSupportTrends(filteredRecordings, Math.min(days, 30));
      const trendData = trends.map(trend => ({
        date: trend.date,
        servqual: Math.round((trend.satisfaction + trend.fcr + trend.ces) / 3), // Approximate SERVQUAL from available metrics
        satisfaction: trend.satisfaction,
        resolution: trend.fcr
      }));

      // Prepare detailed SERVQUAL dimensions
      const servqualDimensions = [
        {
          name: 'Reliability',
          score: aggregatedMetrics.servqualAverages.reliability,
          description: 'Ability to perform promised service dependably and accurately',
          strengths: generateServqualStrengths('reliability', aggregatedMetrics.servqualAverages.reliability),
          improvements: generateServqualImprovements('reliability', aggregatedMetrics.servqualAverages.reliability)
        },
        {
          name: 'Assurance',
          score: aggregatedMetrics.servqualAverages.assurance,
          description: 'Knowledge and courtesy of employees and ability to inspire trust',
          strengths: generateServqualStrengths('assurance', aggregatedMetrics.servqualAverages.assurance),
          improvements: generateServqualImprovements('assurance', aggregatedMetrics.servqualAverages.assurance)
        },
        {
          name: 'Tangibles',
          score: aggregatedMetrics.servqualAverages.tangibles,
          description: 'Physical facilities, equipment, and appearance of personnel',
          strengths: generateServqualStrengths('tangibles', aggregatedMetrics.servqualAverages.tangibles),
          improvements: generateServqualImprovements('tangibles', aggregatedMetrics.servqualAverages.tangibles)
        },
        {
          name: 'Empathy',
          score: aggregatedMetrics.servqualAverages.empathy,
          description: 'Caring, individualized attention provided to customers',
          strengths: generateServqualStrengths('empathy', aggregatedMetrics.servqualAverages.empathy),
          improvements: generateServqualImprovements('empathy', aggregatedMetrics.servqualAverages.empathy)
        },
        {
          name: 'Responsiveness',
          score: aggregatedMetrics.servqualAverages.responsiveness,
          description: 'Willingness to help customers and provide prompt service',
          strengths: generateServqualStrengths('responsiveness', aggregatedMetrics.servqualAverages.responsiveness),
          improvements: generateServqualImprovements('responsiveness', aggregatedMetrics.servqualAverages.responsiveness)
        }
      ];

      // Prepare detailed journey stages
      const journeyStages = [
        {
          name: 'Issue Identification',
          satisfaction: aggregatedMetrics.journeyMetrics.issueIdentificationSpeed,
          efficiency: aggregatedMetrics.journeyMetrics.issueIdentificationSpeed,
          avgDuration: calculateAvgDurationForStage(filteredRecordings, 0.2),
          keyMetrics: ['Time to understand issue', 'Clarity of problem statement', 'Customer comfort level'],
          insights: generateJourneyInsights('identification', aggregatedMetrics.journeyMetrics.issueIdentificationSpeed)
        },
        {
          name: 'Problem Analysis',
          satisfaction: aggregatedMetrics.journeyMetrics.rootCauseDepth,
          efficiency: aggregatedMetrics.journeyMetrics.rootCauseDepth,
          avgDuration: calculateAvgDurationForStage(filteredRecordings, 0.3),
          keyMetrics: ['Diagnostic accuracy', 'Information gathering', 'Root cause identification'],
          insights: generateJourneyInsights('analysis', aggregatedMetrics.journeyMetrics.rootCauseDepth)
        },
        {
          name: 'Solution Development',
          satisfaction: aggregatedMetrics.journeyMetrics.solutionClarity,
          efficiency: aggregatedMetrics.journeyMetrics.solutionClarity,
          avgDuration: calculateAvgDurationForStage(filteredRecordings, 0.25),
          keyMetrics: ['Solution appropriateness', 'Customer involvement', 'Alternative options'],
          insights: generateJourneyInsights('solution', aggregatedMetrics.journeyMetrics.solutionClarity)
        },
        {
          name: 'Implementation',
          satisfaction: Math.round((aggregatedMetrics.avgSatisfaction + aggregatedMetrics.avgFCR) / 2),
          efficiency: aggregatedMetrics.avgFCR,
          avgDuration: calculateAvgDurationForStage(filteredRecordings, 0.2),
          keyMetrics: ['Implementation success', 'Customer guidance', 'Verification steps'],
          insights: generateJourneyInsights('implementation', aggregatedMetrics.avgFCR)
        },
        {
          name: 'Follow-up',
          satisfaction: aggregatedMetrics.journeyMetrics.followUpPlanning,
          efficiency: aggregatedMetrics.journeyMetrics.followUpPlanning,
          avgDuration: calculateAvgDurationForStage(filteredRecordings, 0.05),
          keyMetrics: ['Resolution confirmation', 'Additional needs', 'Relationship building'],
          insights: generateJourneyInsights('followup', aggregatedMetrics.journeyMetrics.followUpPlanning)
        }
      ];

      // Prepare detailed resolution categories
      const resolutionCategories = resolutionMetrics.map(metric => ({
        ...metric,
        topIssues: generateTopIssuesForCategory(metric.category, filteredRecordings)
      }));

      return {
        overviewStats,
        servqualData,
        journeyStageData,
        resolutionMetrics,
        trendData,
        servqualDimensions,
        journeyStages,
        resolutionCategories,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error calculating support framework analytics:', error);
      return {
        ...getEmptyAnalytics(),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics'
      };
    }
  }, [recordings, timeRange]);
}

// Helper functions
function getEmptyAnalytics(): SupportFrameworkAnalytics {
  return {
    overviewStats: {
      averageServqual: 0,
      customerSatisfaction: 0,
      resolutionRate: 0,
      escalationRate: 0
    },
    servqualData: [],
    journeyStageData: [],
    resolutionMetrics: [],
    trendData: [],
    servqualDimensions: [],
    journeyStages: [],
    resolutionCategories: [],
    loading: false,
    error: null
  };
}

function calculateResolutionMetrics(recordings: Recording[]) {
  // Group recordings by issue complexity and calculate metrics
  const categories = {
    'Technical Issues': recordings.filter(r => {
      const analysis = getAnalysisFromRecording(r);
      return analysis?.performanceMetrics?.issueComplexity === 'complex' || 
             r.transcript?.toLowerCase().includes('technical') ||
             r.transcript?.toLowerCase().includes('bug') ||
             r.transcript?.toLowerCase().includes('error');
    }),
    'Account Questions': recordings.filter(r => {
      const analysis = getAnalysisFromRecording(r);
      return analysis?.performanceMetrics?.issueComplexity === 'simple' || 
             r.transcript?.toLowerCase().includes('account') ||
             r.transcript?.toLowerCase().includes('login') ||
             r.transcript?.toLowerCase().includes('password');
    }),
    'Billing Issues': recordings.filter(r => {
      return r.transcript?.toLowerCase().includes('billing') ||
             r.transcript?.toLowerCase().includes('payment') ||
             r.transcript?.toLowerCase().includes('invoice');
    }),
    'Feature Requests': recordings.filter(r => {
      return r.transcript?.toLowerCase().includes('feature') ||
             r.transcript?.toLowerCase().includes('request') ||
             r.transcript?.toLowerCase().includes('enhancement');
    })
  };

  return Object.entries(categories).map(([category, categoryRecordings]) => {
    if (categoryRecordings.length === 0) {
      return {
        category,
        resolution: 0,
        avgTime: 0,
        satisfaction: 0,
        volume: 0,
        complexity: 'medium' as const
      };
    }

    const aggregatedMetrics = aggregateSupportMetrics(categoryRecordings);
    const avgDuration = categoryRecordings.reduce((sum, r) => sum + (r.duration || 0), 0) / categoryRecordings.length;
    
    return {
      category,
      resolution: aggregatedMetrics.avgFCR,
      avgTime: Math.round(avgDuration / 60), // Convert to minutes
      satisfaction: aggregatedMetrics.avgSatisfaction,
      volume: categoryRecordings.length,
      complexity: avgDuration > 600 ? 'complex' as const : avgDuration > 300 ? 'medium' as const : 'simple' as const
    };
  }).filter(metric => metric.volume > 0);
}

function getAnalysisFromRecording(recording: Recording): SupportSignalAnalysis | null {
  if (recording.support_analysis) {
    return typeof recording.support_analysis === 'string' 
      ? JSON.parse(recording.support_analysis)
      : recording.support_analysis;
  } else if (recording.transcript) {
    return analyzeAllSupportSignals(recording);
  }
  return null;
}

function generateServqualStrengths(dimension: string, score: number): string[] {
  const strengthMap = {
    reliability: score >= 85 ? ['Consistent call quality', 'Accurate information provided'] : ['Basic reliability maintained'],
    assurance: score >= 85 ? ['Professional communication', 'Technical expertise demonstrated'] : ['Professional demeanor present'],
    tangibles: score >= 85 ? ['Quality audio/video calls', 'Professional presentation'] : ['Standard presentation quality'],
    empathy: score >= 85 ? ['Active listening skills', 'Personalized responses'] : ['Shows understanding'],
    responsiveness: score >= 85 ? ['Quick response times', 'Urgency awareness'] : ['Responsive to requests']
  };
  return strengthMap[dimension as keyof typeof strengthMap] || ['Adequate performance'];
}

function generateServqualImprovements(dimension: string, score: number): string[] {
  if (score >= 85) return ['Maintain current excellence'];
  
  const improvementMap = {
    reliability: ['Reduce callback rates', 'Improve first-call resolution'],
    assurance: ['Confidence in complex scenarios', 'Clearer explanations'],
    tangibles: ['Standardize call environments', 'Improve documentation'],
    empathy: ['Proactive check-ins', 'Enhanced emotional intelligence'],
    responsiveness: ['Peak hour coverage', 'Faster escalation process']
  };
  return improvementMap[dimension as keyof typeof improvementMap] || ['Focus on improvement'];
}

function generateJourneyInsights(stage: string, score: number): string[] {
  const insightMap = {
    identification: score >= 80 ? ['Customers feel heard during initial explanation', 'Clear questioning process established'] : ['Improve initial listening', 'Clarify problem identification'],
    analysis: score >= 80 ? ['Strong technical analysis skills', 'Thorough investigation process'] : ['Enhance diagnostic skills', 'Improve root cause analysis'],
    solution: score >= 80 ? ['Collaborative problem-solving approach', 'Clear explanation of solutions'] : ['Better solution communication', 'Involve customer in solution'],
    implementation: score >= 80 ? ['Effective implementation guidance', 'Clear step-by-step process'] : ['Improve implementation steps', 'Better verification process'],
    followup: score >= 80 ? ['Excellent closing process', 'Strong customer relationship focus'] : ['Enhance follow-up planning', 'Improve closure process']
  };
  return insightMap[stage as keyof typeof insightMap] || ['Continue monitoring performance'];
}

function calculateAvgDurationForStage(recordings: Recording[], percentage: number): string {
  if (recordings.length === 0) return '0.0 mins';
  
  const avgTotalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / recordings.length;
  const stageDuration = avgTotalDuration * percentage;
  const minutes = stageDuration / 60;
  
  return `${minutes.toFixed(1)} mins`;
}

function generateTopIssuesForCategory(category: string, recordings: Recording[]): string[] {
  // Analyze transcripts for common issue patterns
  const issueMap = {
    'Technical Issues': ['Software bugs', 'Configuration problems', 'Performance issues'],
    'Account Questions': ['Login problems', 'Password resets', 'Profile updates'],
    'Billing Issues': ['Payment processing', 'Invoice questions', 'Subscription changes'],
    'Feature Requests': ['New functionality', 'Integration requests', 'Customization needs']
  };
  
  return issueMap[category as keyof typeof issueMap] || ['General support requests'];
}