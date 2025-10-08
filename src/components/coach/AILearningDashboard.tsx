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
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

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
  // Calculate learning profile from recordings if not provided
  const calculateLearningProfile = (): UserLearningProfile => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    const totalCalls = recordings.length;
    
    // Calculate average scores for each framework
    const frameworkScores = {
      BANT: 0,
      MEDDIC: 0,
      SPICED: 0
    };
    
    let frameworkCounts = { BANT: 0, MEDDIC: 0, SPICED: 0 };
    
    analyzedRecordings.forEach(recording => {
      const framework = (recording as any).primary_framework;
      const score = recording.coaching_evaluation?.overallScore || 0;
      
      if (framework && frameworkScores.hasOwnProperty(framework)) {
        frameworkScores[framework as keyof typeof frameworkScores] += score;
        frameworkCounts[framework as keyof typeof frameworkCounts]++;
      }
    });

    // Calculate averages
    Object.keys(frameworkScores).forEach(framework => {
      const key = framework as keyof typeof frameworkScores;
      if (frameworkCounts[key] > 0) {
        frameworkScores[key] = frameworkScores[key] / frameworkCounts[key];
      }
    });

    // Find strongest framework
    const strongestFramework = Object.entries(frameworkScores)
      .reduce((a, b) => frameworkScores[a[0] as keyof typeof frameworkScores] > frameworkScores[b[0] as keyof typeof frameworkScores] ? a : b)[0];

    // Calculate recent trend
    const recentRecordings = analyzedRecordings.slice(0, 5);
    const olderRecordings = analyzedRecordings.slice(5, 10);
    
    const recentAvg = recentRecordings.length > 0 
      ? recentRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentRecordings.length
      : 0;
    
    const olderAvg = olderRecordings.length > 0
      ? olderRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / olderRecordings.length
      : 0;

    const trendDirection = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    const weeklyImprovement = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    return {
      learningProgress: Math.min(100, Math.round((analyzedRecordings.length / Math.max(totalCalls, 1)) * 100)),
      callsAnalyzed: analyzedRecordings.length,
      dominantStyle: recentAvg > 7 ? 'Consultative' : recentAvg > 5 ? 'Challenger' : 'Relationship',
      currentFocusArea: frameworkScores.BANT < 6 ? 'Qualification' : frameworkScores.MEDDIC < 6 ? 'Champion Development' : 'Impact Quantification',
      weeklyImprovement,
      skillLevel: recentAvg > 8 ? 'expert' : recentAvg > 6.5 ? 'advanced' : recentAvg > 4 ? 'intermediate' : 'beginner',
      strongestFramework,
      recentTrend: trendDirection
    };
  };

  const profile = userProfile || calculateLearningProfile();

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'advanced': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'beginner': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
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

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Learning Intelligence</h2>
              <p className="text-sm text-gray-600">Your personalized sales coaching progress</p>
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
                    className="text-blue-600 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">{profile.learningProgress}%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">Learning Progress</div>
            <div className="text-sm font-medium text-gray-900">{profile.callsAnalyzed} calls analyzed</div>
          </div>

          {/* Sales Style */}
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

          {/* Current Focus */}
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

          {/* Performance Trend */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className={cn("p-3 rounded-lg", profile.recentTrend === 'improving' ? 'bg-gradient-to-br from-green-100 to-green-200' : profile.recentTrend === 'declining' ? 'bg-gradient-to-br from-red-100 to-red-200' : 'bg-gradient-to-br from-gray-100 to-gray-200')}>
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

          {/* Strongest Framework */}
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

        {/* Quick Insights */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                🎯 Your {profile.strongestFramework} calls perform {Math.abs(profile.weeklyImprovement)}% better than average
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600 text-xs">
                AI is learning your patterns • Next insight in 2 calls
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}