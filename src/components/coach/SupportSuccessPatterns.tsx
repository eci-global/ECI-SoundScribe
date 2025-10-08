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
  CheckCircle,
  Heart,
  Shield,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { format, parseISO, getHours, getDay } from 'date-fns';
import { analyzeAllSupportSignals, aggregateSupportMetrics } from '@/utils/supportSignals';

interface SupportSuccessPattern {
  id: string;
  title: string;
  description: string;
  metric: string;
  improvement: number;
  confidence: number;
  category: 'timing' | 'servqual' | 'customer_journey' | 'behavioral';
  examples: string[];
}

interface SupportBenchmark {
  metric: string;
  yourScore: number;
  industryAverage: number;
  topPerformers: number;
  trend: 'up' | 'down' | 'stable';
}

interface SupportAchievement {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
  type: 'milestone' | 'streak' | 'improvement' | 'mastery';
  icon: React.ComponentType<any>;
}

interface SupportSuccessPatternsProps {
  recordings: Recording[];
}

export function SupportSuccessPatterns({ recordings }: SupportSuccessPatternsProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  // Analyze user's support success patterns
  const analyzeSupportSuccessPatterns = (): SupportSuccessPattern[] => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    
    if (supportRecordings.length < 3) {
      return [
        {
          id: 'early-support-insights',
          title: 'Building Your Support Pattern Database',
          description: 'Need more support calls to identify your unique service excellence patterns. Upload 2-3 more customer service calls to unlock personalized insights.',
          metric: 'Analysis Pending',
          improvement: 0,
          confidence: 0,
          category: 'behavioral',
          examples: ['Continue uploading support calls to discover your patterns']
        }
      ];
    }

    const patterns: SupportSuccessPattern[] = [];
    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);

    // Timing patterns for customer satisfaction
    const callsByHour = supportRecordings.reduce((acc, recording) => {
      try {
        const analysis = recording.support_analysis 
          ? (typeof recording.support_analysis === 'string' ? JSON.parse(recording.support_analysis) : recording.support_analysis)
          : analyzeAllSupportSignals(recording);
        
        const hour = getHours(parseISO(recording.created_at));
        const satisfaction = analysis?.customerSatisfaction || 0;
        
        if (!acc[hour]) acc[hour] = { total: 0, count: 0 };
        acc[hour].total += satisfaction;
        acc[hour].count += 1;
      } catch (error) {
        // Skip this recording if there's an error
      }
      
      return acc;
    }, {} as Record<number, { total: number; count: number }>);

    const hourlyAverages = Object.entries(callsByHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      average: data.total / data.count,
      count: data.count
    })).filter(h => h.count >= 2);

    const bestHour = hourlyAverages.sort((a, b) => b.average - a.average)[0];
    const overallSatisfactionAvg = aggregatedMetrics.avgSatisfication;

    if (bestHour && bestHour.average > overallSatisfactionAvg * 1.15) {
      patterns.push({
        id: 'support-timing-optimal',
        title: 'Peak Customer Satisfaction Hours',
        description: `Your customer satisfaction scores are significantly higher during specific hours. This timing insight could transform your service delivery.`,
        metric: `${bestHour.hour}:00-${bestHour.hour + 1}:00`,
        improvement: Math.round(((bestHour.average - overallSatisfactionAvg) / overallSatisfactionAvg) * 100),
        confidence: Math.min(95, bestHour.count * 15),
        category: 'timing',
        examples: [
          `${bestHour.count} calls analyzed during this window`,
          `Average satisfaction: ${bestHour.average.toFixed(1)}% vs ${overallSatisfactionAvg.toFixed(1)}% overall`,
          'Consider scheduling complex support calls during this time'
        ]
      });
    }

    // SERVQUAL dimension mastery patterns
    const servqualScores = {
      Reliability: aggregatedMetrics.servqualAverages.reliability,
      Assurance: aggregatedMetrics.servqualAverages.assurance,
      Tangibles: aggregatedMetrics.servqualAverages.tangibles,
      Empathy: aggregatedMetrics.servqualAverages.empathy,
      Responsiveness: aggregatedMetrics.servqualAverages.responsiveness
    };

    const strongestDimension = Object.entries(servqualScores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a)[0];

    if (strongestDimension && strongestDimension[1] > 80) {
      patterns.push({
        id: 'servqual-mastery',
        title: `${strongestDimension[0]} SERVQUAL Excellence`,
        description: `You've developed exceptional ${strongestDimension[0]} skills. This is your customer service superpower and competitive advantage.`,
        metric: `${strongestDimension[1].toFixed(1)}/100 avg`,
        improvement: Math.round((strongestDimension[1] - 75) / 75 * 100),
        confidence: Math.min(90, supportRecordings.length * 10),
        category: 'servqual',
        examples: [
          `${supportRecordings.length} calls analyzed for SERVQUAL dimensions`,
          `${Math.round((strongestDimension[1] - 75) / 75 * 100)}% better than industry benchmark (75%)`,
          `Consider mentoring others in ${strongestDimension[0]} best practices`
        ]
      });
    }

    // First Contact Resolution patterns
    if (aggregatedMetrics.avgFCR > 0) {
      const fcrCalls = supportRecordings.filter(r => {
        try {
          const analysis = r.support_analysis 
            ? (typeof r.support_analysis === 'string' ? JSON.parse(r.support_analysis) : r.support_analysis)
            : analyzeAllSupportSignals(r);
          return analysis?.firstContactResolution !== undefined;
        } catch {
          return false;
        }
      });

      if (fcrCalls.length >= 3) {
        const shortCalls = fcrCalls.filter(r => (r.duration || 0) < 900); // < 15 min
        const longCalls = fcrCalls.filter(r => (r.duration || 0) > 1800); // > 30 min

        if (shortCalls.length >= 2 && longCalls.length >= 2) {
          const shortFCR = shortCalls.reduce((acc, r) => {
            try {
              const analysis = r.support_analysis 
                ? (typeof r.support_analysis === 'string' ? JSON.parse(r.support_analysis) : r.support_analysis)
                : analyzeAllSupportSignals(r);
              return acc + (analysis?.firstContactResolution ? 100 : 0);
            } catch {
              return acc;
            }
          }, 0) / shortCalls.length;

          const longFCR = longCalls.reduce((acc, r) => {
            try {
              const analysis = r.support_analysis 
                ? (typeof r.support_analysis === 'string' ? JSON.parse(r.support_analysis) : r.support_analysis)
                : analyzeAllSupportSignals(r);
              return acc + (analysis?.firstContactResolution ? 100 : 0);
            } catch {
              return acc;
            }
          }, 0) / longCalls.length;

          if (Math.abs(shortFCR - longFCR) > 20) {
            const betterType = shortFCR > longFCR ? 'efficient' : 'thorough';
            const betterRate = betterType === 'efficient' ? shortFCR : longFCR;
            const worseRate = betterType === 'efficient' ? longFCR : shortFCR;

            patterns.push({
              id: 'fcr-call-style',
              title: `${betterType === 'efficient' ? 'Efficient' : 'Thorough'} Resolution Style`,
              description: `Your ${betterType} support approach consistently achieves better first contact resolution. This reveals your natural customer service rhythm.`,
              metric: `${betterType === 'efficient' ? '<15 min' : '>30 min'} calls`,
              improvement: Math.round(((betterRate - worseRate) / worseRate) * 100),
              confidence: 75,
              category: 'behavioral',
              examples: [
                `${betterType === 'efficient' ? shortCalls.length : longCalls.length} ${betterType} calls analyzed`,
                `FCR rate: ${betterRate.toFixed(1)}% vs ${worseRate.toFixed(1)}%`,
                `Your natural ${betterType === 'efficient' ? 'efficiency' : 'thoroughness'} drives better outcomes`
              ]
            });
          }
        }
      }
    }

    // Customer journey optimization patterns
    if (aggregatedMetrics.journeyMetrics && supportRecordings.length >= 5) {
      const journeyScores = {
        'Issue Understanding': aggregatedMetrics.journeyMetrics.issueUnderstanding,
        'Solution Clarity': aggregatedMetrics.journeyMetrics.solutionClarity,
        'Follow-up Quality': aggregatedMetrics.journeyMetrics.followUpQuality
      };

      const strongestJourneyAspect = Object.entries(journeyScores)
        .filter(([_, score]) => score > 0)
        .sort(([_, a], [__, b]) => b - a)[0];

      if (strongestJourneyAspect && strongestJourneyAspect[1] > 85) {
        patterns.push({
          id: 'customer-journey-excellence',
          title: `${strongestJourneyAspect[0]} Excellence`,
          description: `You consistently excel at ${strongestJourneyAspect[0].toLowerCase()}. Customers appreciate your systematic approach to their support journey.`,
          metric: `${strongestJourneyAspect[1].toFixed(1)}/100 avg`,
          improvement: Math.round((strongestJourneyAspect[1] - 80) / 80 * 100),
          confidence: 80,
          category: 'customer_journey',
          examples: [
            `Strong performance across ${supportRecordings.length} customer interactions`,
            `Consistently outperforms 80% benchmark in this area`,
            `Customers report high satisfaction with your ${strongestJourneyAspect[0].toLowerCase()}`
          ]
        });
      }
    }

    return patterns;
  };

  // Generate support benchmarks
  const generateSupportBenchmarks = (): SupportBenchmark[] => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    
    if (supportRecordings.length === 0) {
      return [];
    }

    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
    const recentCalls = supportRecordings.slice(0, 5);
    const recentMetrics = recentCalls.length > 0 ? aggregateSupportMetrics(recentCalls) : aggregatedMetrics;

    return [
      {
        metric: 'Customer Satisfaction',
        yourScore: Math.round(aggregatedMetrics.avgSatisfacion),
        industryAverage: 75,
        topPerformers: 90,
        trend: recentMetrics.avgSatisfacion > aggregatedMetrics.avgSatisfication ? 'up' : 
               recentMetrics.avgSatisfacion < aggregatedMetrics.avgSatisfication ? 'down' : 'stable'
      },
      {
        metric: 'First Contact Resolution',
        yourScore: Math.round(aggregatedMetrics.avgFCR),
        industryAverage: 70,
        topPerformers: 85,
        trend: recentMetrics.avgFCR > aggregatedMetrics.avgFCR ? 'up' :
               recentMetrics.avgFCR < aggregatedMetrics.avgFCR ? 'down' : 'stable'
      },
      {
        metric: 'Support Call Volume',
        yourScore: supportRecordings.length,
        industryAverage: 15,
        topPerformers: 30,
        trend: 'up'
      },
      {
        metric: 'SERVQUAL Excellence',
        yourScore: Math.round((aggregatedMetrics.servqualAverages.reliability + 
                              aggregatedMetrics.servqualAverages.assurance + 
                              aggregatedMetrics.servqualAverages.tangibles + 
                              aggregatedMetrics.servqualAverages.empathy + 
                              aggregatedMetrics.servqualAverages.responsiveness) / 5),
        industryAverage: 70,
        topPerformers: 85,
        trend: 'stable'
      }
    ];
  };

  // Generate support achievements
  const generateSupportAchievements = (): SupportAchievement[] => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    const achievements: SupportAchievement[] = [];

    if (recordings.length >= 5) {
      achievements.push({
        id: 'support-commitment',
        title: 'Dedicated Service Professional',
        description: 'Uploaded 5+ customer service calls for analysis',
        earnedDate: recordings[4].created_at,
        type: 'milestone',
        icon: Headphones
      });
    }

    if (supportRecordings.length >= 3) {
      const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
      if (aggregatedMetrics.avgSatisfication >= 80) {
        achievements.push({
          id: 'satisfaction-champion',
          title: 'Customer Satisfaction Champion',
          description: 'Achieved 80%+ average customer satisfaction',
          earnedDate: supportRecordings[0].created_at,
          type: 'mastery',
          icon: Heart
        });
      }
    }

    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
    if (aggregatedMetrics.avgFCR >= 85) {
      achievements.push({
        id: 'resolution-expert',
        title: 'First Contact Resolution Expert',
        description: 'Achieved 85%+ first contact resolution rate',
        earnedDate: new Date().toISOString(),
        type: 'mastery',
        icon: Shield
      });
    }

    if (supportRecordings.length >= 3) {
      const servqualTotal = aggregatedMetrics.servqualAverages.reliability + 
                           aggregatedMetrics.servqualAverages.assurance + 
                           aggregatedMetrics.servqualAverages.tangibles + 
                           aggregatedMetrics.servqualAverages.empathy + 
                           aggregatedMetrics.servqualAverages.responsiveness;
      
      if (servqualTotal / 5 >= 85) {
        achievements.push({
          id: 'servqual-master',
          title: 'SERVQUAL Master',
          description: 'Achieved 85%+ across all SERVQUAL dimensions',
          earnedDate: new Date().toISOString(),
          type: 'mastery',
          icon: Award
        });
      }
    }

    return achievements;
  };

  const successPatterns = analyzeSupportSuccessPatterns();
  const benchmarks = generateSupportBenchmarks();
  const achievements = generateSupportAchievements();

  const getPatternColor = (category: string) => {
    switch (category) {
      case 'timing': return 'text-red-600 bg-red-100';
      case 'servqual': return 'text-purple-600 bg-purple-100';
      case 'customer_journey': return 'text-green-600 bg-green-100';
      case 'behavioral': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Support Success Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>Your Support Success Patterns</span>
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
                        {pattern.category === 'servqual' ? 'SERVQUAL' : 
                         pattern.category === 'customer_journey' ? 'Customer Journey' : 
                         pattern.category}
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

      {/* Support Performance Benchmarks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-red-600" />
            <span>Support Performance Benchmarks</span>
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

      {/* Support Achievements */}
      {achievements.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span>Recent Support Achievements</span>
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

      {/* Quick Support Stats */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <span>Support Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{recordings.length}</div>
              <div className="text-xs text-gray-600">Total Calls</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {recordings.filter(r => r.support_analysis || r.transcript).length}
              </div>
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


