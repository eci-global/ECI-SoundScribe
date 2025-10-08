import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Star,
  Users,
  Award,
  Zap,
  Heart,
  Shield,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { analyzeAllSupportSignals, aggregateSupportMetrics } from '@/utils/supportSignals';

interface SupportLearningProfile {
  learningProgress: number;
  callsAnalyzed: number;
  dominantStyle: string;
  currentFocusArea: string;
  weeklyImprovement: number;
  skillLevel: 'developing' | 'competent' | 'proficient' | 'expert';
  strongestDimension: string;
  recentTrend: 'improving' | 'stable' | 'declining';
}

interface SupportAILearningDashboardProps {
  recordings: Recording[];
  userProfile?: SupportLearningProfile;
}

export function SupportAILearningDashboard({ recordings, userProfile }: SupportAILearningDashboardProps) {
  // Calculate support learning profile from recordings if not provided
  const calculateSupportLearningProfile = (): SupportLearningProfile => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    const totalCalls = recordings.length;
    
    if (supportRecordings.length === 0) {
      return {
        learningProgress: 0,
        callsAnalyzed: 0,
        dominantStyle: 'Getting Started',
        currentFocusArea: 'Customer Service Fundamentals',
        weeklyImprovement: 0,
        skillLevel: 'developing',
        strongestDimension: 'Building Skills',
        recentTrend: 'stable'
      };
    }

    // Aggregate support metrics
    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
    
    // Calculate SERVQUAL dimension scores
    const servqualScores = {
      Reliability: aggregatedMetrics.servqualAverages.reliability,
      Assurance: aggregatedMetrics.servqualAverages.assurance,
      Tangibles: aggregatedMetrics.servqualAverages.tangibles,
      Empathy: aggregatedMetrics.servqualAverages.empathy,
      Responsiveness: aggregatedMetrics.servqualAverages.responsiveness
    };

    // Find strongest SERVQUAL dimension
    const strongestDimension = Object.entries(servqualScores)
      .reduce((a, b) => servqualScores[a[0] as keyof typeof servqualScores] > servqualScores[b[0] as keyof typeof servqualScores] ? a : b)[0];

    // Calculate recent trend
    const recentRecordings = supportRecordings.slice(0, 5);
    const olderRecordings = supportRecordings.slice(5, 10);
    
    const recentAvg = recentRecordings.length > 0 
      ? recentRecordings.reduce((acc, r) => {
          const analysis = r.support_analysis 
            ? (typeof r.support_analysis === 'string' ? JSON.parse(r.support_analysis) : r.support_analysis)
            : analyzeAllSupportSignals(r);
          return acc + (analysis?.customerSatisfaction || 0);
        }, 0) / recentRecordings.length
      : 0;
    
    const olderAvg = olderRecordings.length > 0
      ? olderRecordings.reduce((acc, r) => {
          const analysis = r.support_analysis 
            ? (typeof r.support_analysis === 'string' ? JSON.parse(r.support_analysis) : r.support_analysis)
            : analyzeAllSupportSignals(r);
          return acc + (analysis?.customerSatisfaction || 0);
        }, 0) / olderRecordings.length
      : 0;

    const trendDirection = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    const weeklyImprovement = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    // Determine support style based on performance
    let dominantStyle = 'Service Professional';
    if (aggregatedMetrics.servqualAverages.empathy >= 85) {
      dominantStyle = 'Empathetic Listener';
    } else if (aggregatedMetrics.qualityMetrics.problemSolving >= 85) {
      dominantStyle = 'Technical Problem Solver';
    } else if (aggregatedMetrics.servqualAverages.reliability >= 85) {
      dominantStyle = 'Process Expert';
    }

    // Determine focus area
    let currentFocusArea = 'Customer Satisfaction';
    const avgSatisfaction = aggregatedMetrics.avgSatisfaction;
    const avgFCR = aggregatedMetrics.avgFCR;
    
    if (avgSatisfaction < 70) {
      currentFocusArea = 'Customer Satisfaction';
    } else if (avgFCR < 80) {
      currentFocusArea = 'First Contact Resolution';
    } else if (aggregatedMetrics.qualityMetrics.deEscalation < 75) {
      currentFocusArea = 'De-escalation Skills';
    } else {
      currentFocusArea = 'Advanced Techniques';
    }

    // Determine skill level
    let skillLevel: 'developing' | 'competent' | 'proficient' | 'expert' = 'developing';
    if (avgSatisfaction >= 90 && avgFCR >= 85) {
      skillLevel = 'expert';
    } else if (avgSatisfaction >= 80 && avgFCR >= 75) {
      skillLevel = 'proficient';
    } else if (avgSatisfaction >= 70 && avgFCR >= 65) {
      skillLevel = 'competent';
    }

    return {
      learningProgress: Math.min(100, Math.round((supportRecordings.length / Math.max(totalCalls, 1)) * 100)),
      callsAnalyzed: supportRecordings.length,
      dominantStyle,
      currentFocusArea,
      weeklyImprovement,
      skillLevel,
      strongestDimension,
      recentTrend: trendDirection
    };
  };

  const profile = userProfile || calculateSupportLearningProfile();

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'proficient': return 'bg-green-100 text-green-800 border-green-200';
      case 'competent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'developing': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4" />;
      case 'declining': return <TrendingUp className="w-4 h-4 rotate-180" />;
      case 'stable': return <Target className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'Empathetic Listener': return <Heart className="w-6 h-6 text-pink-600" />;
      case 'Technical Problem Solver': return <Shield className="w-6 h-6 text-blue-600" />;
      case 'Process Expert': return <Clock className="w-6 h-6 text-green-600" />;
      default: return <Users className="w-6 h-6 text-indigo-600" />;
    }
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-lg mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Support Learning Intelligence</h2>
              <p className="text-sm text-gray-600">Your personalized customer service coaching progress</p>
            </div>
          </div>
          
          <Badge className={cn("border", getSkillLevelColor(profile.skillLevel))}>
            <Star className="w-3 h-3 mr-1" />
            {profile.skillLevel} level
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Learning Progress */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center mb-2">
              <div className="w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - profile.learningProgress / 100)}`}
                    className="text-indigo-600 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-600">{profile.learningProgress}%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Learning Progress</div>
            <div className="text-sm font-medium text-gray-900">{profile.callsAnalyzed} calls analyzed</div>
          </div>

          {/* Support Style */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-blue-200 rounded-lg">
                {getStyleIcon(profile.dominantStyle)}
              </div>
            </div>
            <div className="text-xs text-gray-600">Support Style</div>
            <div className="text-sm font-bold text-indigo-600">{profile.dominantStyle}</div>
            <div className="text-xs text-gray-500">+ Customer-Focused</div>
          </div>

          {/* Current Focus */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-200 rounded-lg">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">Focus Area</div>
            <div className="text-sm font-bold text-emerald-600">{profile.currentFocusArea}</div>
            <div className="text-xs text-gray-500">Active Goal</div>
          </div>

          {/* Performance Trend */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className={cn("p-3 rounded-lg", 
                profile.recentTrend === 'improving' ? 'bg-gradient-to-br from-green-100 to-emerald-200' : 
                profile.recentTrend === 'declining' ? 'bg-gradient-to-br from-red-100 to-pink-200' : 
                'bg-gradient-to-br from-blue-100 to-indigo-200'
              )}>
                <div className={getTrendColor(profile.recentTrend)}>
                  {getTrendIcon(profile.recentTrend)}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Weekly Trend</div>
            <div className={cn("text-sm font-bold", getTrendColor(profile.recentTrend))}>
              {profile.weeklyImprovement > 0 ? '+' : ''}{profile.weeklyImprovement}%
            </div>
            <div className="text-xs text-gray-500 capitalize">{profile.recentTrend}</div>
          </div>

          {/* Strongest SERVQUAL Dimension */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-violet-200 rounded-lg">
                <Award className="w-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">Best SERVQUAL</div>
            <div className="text-sm font-bold text-purple-600">{profile.strongestDimension}</div>
            <div className="text-xs text-gray-500">Top Dimension</div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                🎯 Your {profile.strongestDimension} skills perform {Math.abs(profile.weeklyImprovement)}% better than average
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600 text-xs">
                AI is learning your service patterns • Next insight in 2 calls
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}