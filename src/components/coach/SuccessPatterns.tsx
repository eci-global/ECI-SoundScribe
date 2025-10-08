import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Award,
  Clock,
  Users,
  Calendar,
  BarChart3,
  Trophy,
  Zap,
  Star,
  ChevronRight,
  Eye,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { format, parseISO, getHours, getDay } from 'date-fns';

interface SuccessPattern {
  id: string;
  title: string;
  description: string;
  metric: string;
  improvement: number;
  confidence: number;
  category: 'timing' | 'technique' | 'framework' | 'behavioral';
  examples: string[];
}

interface PersonalBenchmark {
  metric: string;
  yourScore: number;
  industryAverage: number;
  topPerformers: number;
  trend: 'up' | 'down' | 'stable';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
  type: 'milestone' | 'streak' | 'improvement' | 'mastery';
  icon: React.ComponentType<any>;
}

interface SuccessPatternsProps {
  recordings: Recording[];
}

export function SuccessPatterns({ recordings }: SuccessPatternsProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  // Analyze user's success patterns
  const analyzeSuccessPatterns = (): SuccessPattern[] => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    
    if (analyzedRecordings.length < 3) {
      return [
        {
          id: 'early-insights',
          title: 'Building Your Pattern Database',
          description: 'Need more calls to identify your unique success patterns. Upload 2-3 more calls to unlock personalized insights.',
          metric: 'Analysis Pending',
          improvement: 0,
          confidence: 0,
          category: 'behavioral',
          examples: ['Continue uploading calls to discover your patterns']
        }
      ];
    }

    const patterns: SuccessPattern[] = [];

    // Timing patterns
    const callsByHour = analyzedRecordings.reduce((acc, recording) => {
      const hour = getHours(parseISO(recording.created_at));
      const score = recording.coaching_evaluation?.overallScore || 0;
      
      if (!acc[hour]) acc[hour] = { total: 0, count: 0 };
      acc[hour].total += score;
      acc[hour].count += 1;
      
      return acc;
    }, {} as Record<number, { total: number; count: number }>);

    const hourlyAverages = Object.entries(callsByHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      average: data.total / data.count,
      count: data.count
    })).filter(h => h.count >= 2);

    const bestHour = hourlyAverages.sort((a, b) => b.average - a.average)[0];
    const overallAvg = analyzedRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / analyzedRecordings.length;

    if (bestHour && bestHour.average > overallAvg * 1.15) {
      patterns.push({
        id: 'timing-optimal',
        title: 'Peak Performance Hours',
        description: `Your calls perform significantly better during specific hours. This timing advantage could be game-changing.`,
        metric: `${bestHour.hour}:00-${bestHour.hour + 1}:00`,
        improvement: Math.round(((bestHour.average - overallAvg) / overallAvg) * 100),
        confidence: Math.min(95, bestHour.count * 15),
        category: 'timing',
        examples: [
          `${bestHour.count} calls analyzed during this window`,
          `Average score: ${bestHour.average.toFixed(1)} vs ${overallAvg.toFixed(1)} overall`,
          'Consider scheduling important calls during this time'
        ]
      });
    }

    // Framework effectiveness patterns
    const frameworkPerformance = { BANT: [], MEDDIC: [], SPICED: [] } as Record<string, number[]>;
    
    analyzedRecordings.forEach(recording => {
      const framework = (recording as any).primary_framework as string;
      const score = recording.coaching_evaluation?.overallScore || 0;
      
      if (framework && frameworkPerformance[framework]) {
        frameworkPerformance[framework].push(score);
      }
    });

    const frameworkAverages = Object.entries(frameworkPerformance)
      .filter(([_, scores]) => scores.length >= 2)
      .map(([framework, scores]) => ({
        framework,
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length
      }));

    const bestFramework = frameworkAverages.sort((a, b) => b.average - a.average)[0];
    
    if (bestFramework && bestFramework.average > overallAvg * 1.1) {
      patterns.push({
        id: 'framework-mastery',
        title: `${bestFramework.framework} Framework Mastery`,
        description: `You've developed exceptional skill with ${bestFramework.framework}. This is your competitive advantage.`,
        metric: `${bestFramework.average.toFixed(1)}/10 avg`,
        improvement: Math.round(((bestFramework.average - overallAvg) / overallAvg) * 100),
        confidence: Math.min(90, bestFramework.count * 20),
        category: 'framework',
        examples: [
          `${bestFramework.count} ${bestFramework.framework} calls analyzed`,
          `${Math.round(((bestFramework.average - overallAvg) / overallAvg) * 100)}% better than your other frameworks`,
          `Consider leading with ${bestFramework.framework} for similar prospects`
        ]
      });
    }

    // Call length patterns
    const callsWithDuration = analyzedRecordings.filter(r => r.duration);
    if (callsWithDuration.length >= 3) {
      const shortCalls = callsWithDuration.filter(r => (r.duration || 0) < 1800); // < 30 min
      const longCalls = callsWithDuration.filter(r => (r.duration || 0) > 2700); // > 45 min

      if (shortCalls.length >= 2 && longCalls.length >= 2) {
        const shortAvg = shortCalls.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / shortCalls.length;
        const longAvg = longCalls.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / longCalls.length;

        if (Math.abs(shortAvg - longAvg) > 0.5) {
          const betterType = shortAvg > longAvg ? 'short' : 'long';
          const betterAvg = betterType === 'short' ? shortAvg : longAvg;
          const worseAvg = betterType === 'short' ? longAvg : shortAvg;

          patterns.push({
            id: 'call-duration',
            title: `${betterType === 'short' ? 'Efficient' : 'Thorough'} Call Style`,
            description: `Your ${betterType} calls consistently outperform. This reveals your natural selling rhythm.`,
            metric: `${betterType === 'short' ? '<30 min' : '>45 min'} calls`,
            improvement: Math.round(((betterAvg - worseAvg) / worseAvg) * 100),
            confidence: 75,
            category: 'behavioral',
            examples: [
              `${betterType === 'short' ? shortCalls.length : longCalls.length} ${betterType} calls analyzed`,
              `Average score: ${betterAvg.toFixed(1)} vs ${worseAvg.toFixed(1)}`,
              `Your natural ${betterType === 'short' ? 'efficiency' : 'thoroughness'} drives better outcomes`
            ]
          });
        }
      }
    }

    return patterns;
  };

  // Generate personal benchmarks
  const generateBenchmarks = (): PersonalBenchmark[] => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    
    if (analyzedRecordings.length === 0) {
      return [];
    }

    const avgScore = analyzedRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / analyzedRecordings.length;
    const recentCalls = analyzedRecordings.slice(0, 5);
    const recentAvg = recentCalls.length > 0 
      ? recentCalls.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentCalls.length
      : avgScore;

    return [
      {
        metric: 'Overall Performance',
        yourScore: Math.round(avgScore * 10),
        industryAverage: 65,
        topPerformers: 85,
        trend: recentAvg > avgScore ? 'up' : recentAvg < avgScore ? 'down' : 'stable'
      },
      {
        metric: 'Call Frequency',
        yourScore: recordings.length,
        industryAverage: 12,
        topPerformers: 25,
        trend: 'up'
      },
      {
        metric: 'Analysis Completion',
        yourScore: Math.round((analyzedRecordings.length / recordings.length) * 100),
        industryAverage: 60,
        topPerformers: 90,
        trend: 'stable'
      }
    ];
  };

  // Generate achievements
  const generateAchievements = (): Achievement[] => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    const achievements: Achievement[] = [];

    if (recordings.length >= 5) {
      achievements.push({
        id: 'first-milestone',
        title: 'Committed Learner',
        description: 'Uploaded 5+ calls for analysis',
        earnedDate: recordings[4].created_at,
        type: 'milestone',
        icon: Target
      });
    }

    if (analyzedRecordings.length >= 3) {
      const recentScores = analyzedRecordings.slice(0, 3).map(r => r.coaching_evaluation?.overallScore || 0);
      if (recentScores.every(score => score >= 7)) {
        achievements.push({
          id: 'performance-streak',
          title: 'Consistency Champion',
          description: '3 consecutive calls scoring 7+',
          earnedDate: analyzedRecordings[0].created_at,
          type: 'streak',
          icon: Trophy
        });
      }
    }

    const avgScore = analyzedRecordings.length > 0 
      ? analyzedRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / analyzedRecordings.length
      : 0;

    if (avgScore >= 8) {
      achievements.push({
        id: 'expert-level',
        title: 'Sales Expert',
        description: 'Achieved 8+ average performance score',
        earnedDate: new Date().toISOString(),
        type: 'mastery',
        icon: Award
      });
    }

    return achievements;
  };

  const successPatterns = analyzeSuccessPatterns();
  const benchmarks = generateBenchmarks();
  const achievements = generateAchievements();

  const getPatternColor = (category: string) => {
    switch (category) {
      case 'timing': return 'text-red-600 bg-red-100';
      case 'technique': return 'text-green-600 bg-green-100';
      case 'framework': return 'text-purple-600 bg-purple-100';
      case 'behavioral': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>Your Success Patterns</span>
            <Badge variant="outline" className="text-xs">
              AI Discovered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {successPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-all duration-200",
                  selectedPattern === pattern.id ? "ring-2 ring-green-500 bg-green-50/50" : "hover:bg-gray-50"
                )}
                onClick={() => setSelectedPattern(selectedPattern === pattern.id ? null : pattern.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{pattern.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={cn("text-xs", getPatternColor(pattern.category))}>
                        {pattern.category}
                      </Badge>
                      {pattern.improvement > 0 && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          +{pattern.improvement}%
                        </Badge>
                      )}
                      {pattern.confidence > 0 && (
                        <span className="text-xs text-gray-500">{pattern.confidence}% confidence</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{pattern.metric}</div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-2">{pattern.description}</p>

                {selectedPattern === pattern.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <h5 className="font-medium text-gray-900 text-xs">Key Insights:</h5>
                    <ul className="space-y-1">
                      {pattern.examples.map((example, index) => (
                        <li key={index} className="flex items-start space-x-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personal Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-red-600" />
            <span>Performance Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {benchmarks.map((benchmark, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{benchmark.metric}</span>
                  <div className="flex items-center space-x-1">
                    {benchmark.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                    {benchmark.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />}
                    <span className="text-sm font-bold text-gray-900">{benchmark.yourScore}</span>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress value={(benchmark.yourScore / benchmark.topPerformers) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>You: {benchmark.yourScore}</span>
                    <span>Avg: {benchmark.industryAverage}</span>
                    <span>Top: {benchmark.topPerformers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span>Recent Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-start space-x-3 p-2 bg-white/50 rounded-lg">
                  <div className="p-1.5 bg-yellow-100 rounded-lg">
                    <achievement.icon className="w-3 h-3 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">{achievement.title}</h4>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(achievement.earnedDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{recordings.length}</div>
              <div className="text-xs text-gray-600">Total Calls</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{recordings.filter(r => r.coaching_evaluation).length}</div>
              <div className="text-xs text-gray-600">Analyzed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{successPatterns.length}</div>
              <div className="text-xs text-gray-600">Patterns Found</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{achievements.length}</div>
              <div className="text-xs text-gray-600">Achievements</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


