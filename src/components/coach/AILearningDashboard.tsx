import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  Target,
  Star,
  Users,
  Award,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

type FrameworkRecording = Recording & { primary_framework?: string };

interface UserLearningProfile {
  learningProgress: number;
  callsAnalyzed: number;
  dominantStyle: string;
  currentFocusArea: string;
  weeklyImprovement: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  strongestFramework: string;
  recentTrend: 'improving' | 'stable' | 'declining';
}

interface AILearningDashboardProps {
  recordings: Recording[];
  userProfile?: UserLearningProfile;
}

export function AILearningDashboard({ recordings, userProfile }: AILearningDashboardProps) {
  const calculateLearningProfile = (): UserLearningProfile => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    const totalCalls = recordings.length;

    const frameworkScores = {
      BANT: 0,
      MEDDIC: 0,
      SPICED: 0,
    };

    const frameworkCounts = { BANT: 0, MEDDIC: 0, SPICED: 0 };

    analyzedRecordings.forEach(recording => {
      const framework = (recording as FrameworkRecording).primary_framework as keyof typeof frameworkScores | undefined;
      const score = recording.coaching_evaluation?.overallScore || 0;

      if (framework && frameworkScores[framework] !== undefined) {
        frameworkScores[framework] += score;
        frameworkCounts[framework] += 1;
      }
    });

    (Object.keys(frameworkScores) as Array<keyof typeof frameworkScores>).forEach(key => {
      if (frameworkCounts[key] > 0) {
        frameworkScores[key] = frameworkScores[key] / frameworkCounts[key];
      }
    });

    const strongestFramework = Object.entries(frameworkScores)
      .reduce((a, b) => frameworkScores[a[0] as keyof typeof frameworkScores] > frameworkScores[b[0] as keyof typeof frameworkScores] ? a : b)[0];

    const recentRecordings = analyzedRecordings.slice(0, 5);
    const olderRecordings = analyzedRecordings.slice(5, 10);

    const recentAvg = recentRecordings.length
      ? recentRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentRecordings.length
      : 0;

    const olderAvg = olderRecordings.length
      ? olderRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / olderRecordings.length
      : 0;

    const trendDirection = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    const weeklyImprovement = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    return {
      learningProgress: Math.min(100, Math.round((analyzedRecordings.length / Math.max(totalCalls, 1)) * 100)),
      callsAnalyzed: analyzedRecordings.length,
      dominantStyle: recentAvg > 7 ? 'Consultative' : recentAvg > 5 ? 'Challenger' : 'Relationship',
      currentFocusArea:
        frameworkScores.BANT < 6
          ? 'Qualification'
          : frameworkScores.MEDDIC < 6
            ? 'Champion Development'
            : 'Impact Quantification',
      weeklyImprovement,
      skillLevel:
        recentAvg > 8
          ? 'expert'
          : recentAvg > 6.5
            ? 'advanced'
            : recentAvg > 4
              ? 'intermediate'
              : 'beginner',
      strongestFramework,
      recentTrend: trendDirection,
    };
  };

  const profile = userProfile || calculateLearningProfile();
  const improvementMessage =
    profile.weeklyImprovement >= 0
      ? `Your ${profile.strongestFramework} calls outperform your recent average by ${Math.abs(profile.weeklyImprovement)}%.`
      : `Focus on ${profile.currentFocusArea}; scores dipped ${Math.abs(profile.weeklyImprovement)}% week over week.`;

  if (profile.callsAnalyzed === 0) {
    return (
      <Card className="rounded-xl border border-gray-200 shadow-sm">
        <CardContent className="py-10 text-center space-y-3">
          <Brain className="mx-auto h-8 w-8 text-red-500" />
          <p className="text-lg font-semibold text-gray-900">Kick off your AI coaching journey</p>
          <p className="text-sm text-gray-600">
            Upload a call and run coaching analysis to see personalized learning insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'advanced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'beginner':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4" />;
      case 'declining':
        return <TrendingUp className="w-4 h-4 rotate-180" />;
      case 'stable':
        return <Target className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm">
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <Brain className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Learning Intelligence</h2>
              <p className="text-sm text-gray-600">AI summary of your recent sales performance</p>
            </div>
          </div>
          <Badge className={cn('border', getSkillLevelColor(profile.skillLevel))}>
            <Star className="w-3 h-3 mr-1" />
            {profile.skillLevel} level
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center mb-2">
              <div className="w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - profile.learningProgress / 100)}`}
                    className="text-red-600 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-red-600">{profile.learningProgress}%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Learning Progress</div>
            <div className="text-sm font-medium text-gray-900">{profile.callsAnalyzed} calls analyzed</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">Sales Style</div>
            <div className="text-sm font-bold text-green-600">{profile.dominantStyle}</div>
            <div className="text-xs text-gray-500">+ Data-Driven</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">Focus Area</div>
            <div className="text-sm font-bold text-orange-600">{profile.currentFocusArea}</div>
            <div className="text-xs text-gray-500">Active Goal</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div
                className={cn(
                  'p-3 rounded-lg',
                  profile.recentTrend === 'improving'
                    ? 'bg-gradient-to-br from-green-100 to-green-200'
                    : profile.recentTrend === 'declining'
                      ? 'bg-gradient-to-br from-red-100 to-red-200'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200',
                )}
              >
                <div className={getTrendColor(profile.recentTrend)}>{getTrendIcon(profile.recentTrend)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Weekly Trend</div>
            <div className={cn('text-sm font-bold', getTrendColor(profile.recentTrend))}>
              {profile.weeklyImprovement > 0 ? '+' : ''}
              {profile.weeklyImprovement}%
            </div>
            <div className="text-xs text-gray-500 capitalize">{profile.recentTrend}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">Best Framework</div>
            <div className="text-sm font-bold text-purple-600">{profile.strongestFramework}</div>
            <div className="text-xs text-gray-500">Top Performer</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-red-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{improvementMessage}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600 text-xs">AI is learning your patterns - next insight in 2 calls</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




