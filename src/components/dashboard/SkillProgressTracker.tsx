import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Award, 
  Zap,
  TrendingUp,
  TrendingDown,
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { format, subDays } from 'date-fns';

interface SkillMetric {
  name: string;
  framework: 'BANT' | 'MEDDIC' | 'SPICED' | 'general';
  currentScore: number;
  previousScore: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  improvement: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nextMilestone: string;
  weeklyGoal: number;
}

interface SkillProgressTrackerProps {
  recordings: Recording[];
  timeRange: '7d' | '30d' | '90d';
}

export function SkillProgressTracker({ recordings, timeRange }: SkillProgressTrackerProps) {
  // Calculate skill metrics based on recent recordings
  const calculateSkillMetrics = (): SkillMetric[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoffDate = subDays(new Date(), days);
    
    const recentRecordings = recordings.filter(r => 
      new Date(r.created_at) >= cutoffDate && r.coaching_evaluation
    );

    const previousPeriodRecordings = recordings.filter(r => {
      const recordingDate = new Date(r.created_at);
      return recordingDate < cutoffDate && 
             recordingDate >= subDays(cutoffDate, days) && 
             r.coaching_evaluation;
    });

    // Helper function to calculate average score for a specific component
    const getComponentScore = (recordings: Recording[], framework: string, component?: string) => {
      const frameworkRecordings = recordings.filter(r => 
        (r as any).primary_framework === framework
      );
      
      if (frameworkRecordings.length === 0) return 0;
      
      return frameworkRecordings.reduce((acc, r) => {
        if (component && r.coaching_evaluation?.componentScores) {
          const score = (r.coaching_evaluation.componentScores as any)[component];
          return acc + (score || 0);
        }
        return acc + (r.coaching_evaluation?.overallScore || 0);
      }, 0) / frameworkRecordings.length;
    };

    const skills: SkillMetric[] = [
      {
        name: 'Discovery & Qualification',
        framework: 'BANT',
        currentScore: getComponentScore(recentRecordings, 'BANT') * 10,
        previousScore: getComponentScore(previousPeriodRecordings, 'BANT') * 10,
        target: 85,
        trend: 'up',
        improvement: 12,
        skillLevel: 'intermediate',
        nextMilestone: 'Master pain identification techniques',
        weeklyGoal: 5
      },
      {
        name: 'Champion Development',
        framework: 'MEDDIC',
        currentScore: getComponentScore(recentRecordings, 'MEDDIC') * 10,
        previousScore: getComponentScore(previousPeriodRecordings, 'MEDDIC') * 10,
        target: 80,
        trend: 'up',
        improvement: 8,
        skillLevel: 'intermediate',
        nextMilestone: 'Build multi-threading skills',
        weeklyGoal: 3
      },
      {
        name: 'Impact Quantification',
        framework: 'SPICED',
        currentScore: getComponentScore(recentRecordings, 'SPICED') * 10,
        previousScore: getComponentScore(previousPeriodRecordings, 'SPICED') * 10,
        target: 75,
        trend: 'stable',
        improvement: 2,
        skillLevel: 'beginner',
        nextMilestone: 'Learn ROI calculation methods',
        weeklyGoal: 7
      },
      {
        name: 'Objection Handling',
        framework: 'general',
        currentScore: Math.min(100, Math.max(0, 
          recentRecordings.length > 0 
            ? recentRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentRecordings.length * 8.5 // Scale to general skill level
            : 0
        )),
        previousScore: Math.min(100, Math.max(0,
          previousPeriodRecordings.length > 0
            ? previousPeriodRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / previousPeriodRecordings.length * 8.0
            : 0
        )),
        target: 90,
        trend: 'up',
        improvement: 0, // Will be calculated later
        skillLevel: recentRecordings.length > 10 ? 'advanced' : recentRecordings.length > 5 ? 'intermediate' : 'beginner',
        nextMilestone: 'Master price objection responses',
        weeklyGoal: Math.max(1, Math.min(5, Math.ceil(recentRecordings.length / 10))) // Adaptive weekly goal
      },
      {
        name: 'Closing Techniques',
        framework: 'general',
        currentScore: Math.min(100, Math.max(0,
          recentRecordings.length > 0
            ? recentRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentRecordings.length * 7.8 // Scale for closing skills
            : 0
        )),
        previousScore: Math.min(100, Math.max(0,
          previousPeriodRecordings.length > 0
            ? previousPeriodRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / previousPeriodRecordings.length * 7.2
            : 0
        )),
        target: 85,
        trend: 'up',
        improvement: 0, // Will be calculated later
        skillLevel: recentRecordings.length > 8 ? 'advanced' : recentRecordings.length > 3 ? 'intermediate' : 'beginner',
        nextMilestone: 'Practice assumptive closing',
        weeklyGoal: Math.max(1, Math.min(4, Math.ceil(recentRecordings.length / 8))) // Adaptive weekly goal
      }
    ];

    return skills.map(skill => ({
      ...skill,
      trend: skill.currentScore > skill.previousScore ? 'up' : 
             skill.currentScore < skill.previousScore ? 'down' : 'stable',
      improvement: Math.round(((skill.currentScore - skill.previousScore) / skill.previousScore) * 100)
    }));
  };

  const skills = calculateSkillMetrics();

  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'BANT':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'MEDDIC':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'SPICED':
        return <Zap className="w-4 h-4 text-orange-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      case 'advanced':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate overall progress
  const overallProgress = skills.reduce((acc, skill) => acc + skill.currentScore, 0) / skills.length;
  const weeklyGoalTotal = skills.reduce((acc, skill) => acc + skill.weeklyGoal, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-600" />
            <span>Skill Development</span>
          </CardTitle>
          <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
            {Math.round(overallProgress)}/100 avg
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Track your sales skills growth and practice goals
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Weekly Progress</h3>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{weeklyGoalTotal} practice sessions this week</span>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Your Average: {Math.round(overallProgress)}</span>
            <span>Target: 85</span>
          </div>
        </div>

        {/* Individual Skills */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Individual Skills</h3>
          
          {skills.map((skill, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    {getFrameworkIcon(skill.framework)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{skill.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={cn("text-xs", getSkillLevelColor(skill.skillLevel))}>
                        {skill.skillLevel}
                      </Badge>
                      {skill.framework !== 'general' && (
                        <Badge variant="outline" className="text-xs">
                          {skill.framework}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <span className={cn("text-lg font-bold", getScoreColor(skill.currentScore))}>
                      {Math.round(skill.currentScore)}
                    </span>
                    <span className="text-sm text-gray-500">/{skill.target}</span>
                    {getTrendIcon(skill.trend)}
                  </div>
                  {skill.improvement !== 0 && (
                    <div className={cn(
                      "text-xs",
                      skill.improvement > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {skill.improvement > 0 ? '+' : ''}{skill.improvement}%
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={(skill.currentScore / skill.target) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Current: {Math.round(skill.currentScore)}</span>
                  <span>Target: {skill.target}</span>
                </div>
              </div>

              {/* Next Milestone */}
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Next Milestone</span>
                    </div>
                    <p className="text-sm text-gray-700">{skill.nextMilestone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Weekly Goal</div>
                    <div className="text-sm font-bold text-blue-600">{skill.weeklyGoal} sessions</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Practice 3 more sessions to hit your weekly goal!
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 text-left bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
              <div className="text-sm font-medium text-blue-900">Role Practice</div>
              <div className="text-xs text-blue-700">Start mock calls</div>
            </button>
            <button className="p-3 text-left bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
              <div className="text-sm font-medium text-purple-900">Study Materials</div>
              <div className="text-xs text-purple-700">Framework guides</div>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}