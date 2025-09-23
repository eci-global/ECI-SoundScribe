import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Zap,
  BarChart3,
  Trophy,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesPerformanceCardProps {
  overallScore: number;
  frameworkScores: {
    BANT: number;
    MEDDIC: number;
    SPICED: number;
  };
  improvementTrend: number;
  industryBenchmark: number;
  timeRange: '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void;
}

export function SalesPerformanceCard({
  overallScore,
  frameworkScores,
  improvementTrend,
  industryBenchmark,
  timeRange,
  onTimeRangeChange
}: SalesPerformanceCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getTrendIcon = () => {
    if (improvementTrend > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (improvementTrend < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 85) return { level: 'Elite Performer', icon: Trophy, color: 'text-purple-600' };
    if (score >= 75) return { level: 'Top Performer', icon: Award, color: 'text-green-600' };
    if (score >= 60) return { level: 'Solid Performer', icon: Target, color: 'text-yellow-600' };
    if (score >= 40) return { level: 'Developing', icon: BarChart3, color: 'text-orange-600' };
    return { level: 'Getting Started', icon: Zap, color: 'text-red-600' };
  };

  const performance = getPerformanceLevel(overallScore);
  const PerformanceIcon = performance.icon;

  // Calculate relative performance
  const benchmarkDiff = overallScore - industryBenchmark;
  const isAboveBenchmark = benchmarkDiff >= 0;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <PerformanceIcon className={cn("w-6 h-6", performance.color)} />
            </div>
            <span>Your Sales Performance</span>
          </CardTitle>
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Main Score Display */}
        <div className="text-center mb-8">
          {/* Circular Progress Indicator */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - overallScore / 100)}`}
                  className={cn("transition-all duration-1000", getScoreColor(overallScore))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn("text-5xl font-bold", getScoreColor(overallScore))}>
                  {overallScore}
                </div>
                <div className="text-gray-600 text-sm">out of 100</div>
              </div>
            </div>
          </div>

          {/* Performance Level */}
          <Badge className={cn("mb-3", performance.color.replace('text-', 'bg-').replace('600', '100'), performance.color)} variant="outline">
            {performance.level}
          </Badge>

          {/* Trend Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {getTrendIcon()}
            <span className={cn(
              "text-sm font-medium",
              improvementTrend > 0 ? "text-green-600" : improvementTrend < 0 ? "text-red-600" : "text-gray-600"
            )}>
              {improvementTrend > 0 ? '+' : ''}{improvementTrend}% this period
            </span>
          </div>
        </div>

        {/* Framework Breakdown */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Framework Performance</h3>
          
          <div className="space-y-3">
            {/* BANT */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-medium">BANT</span>
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-xs ml-4">
                <Progress value={frameworkScores.BANT} className="flex-1" />
                <span className={cn("text-sm font-bold w-10 text-right", getScoreColor(frameworkScores.BANT))}>
                  {Math.round(frameworkScores.BANT)}
                </span>
              </div>
            </div>

            {/* MEDDIC */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Award className="w-5 h-5 text-purple-600" />
                <span className="font-medium">MEDDIC</span>
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-xs ml-4">
                <Progress value={frameworkScores.MEDDIC} className="flex-1" />
                <span className={cn("text-sm font-bold w-10 text-right", getScoreColor(frameworkScores.MEDDIC))}>
                  {Math.round(frameworkScores.MEDDIC)}
                </span>
              </div>
            </div>

            {/* SPICED */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-orange-600" />
                <span className="font-medium">SPICED</span>
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-xs ml-4">
                <Progress value={frameworkScores.SPICED} className="flex-1" />
                <span className={cn("text-sm font-bold w-10 text-right", getScoreColor(frameworkScores.SPICED))}>
                  {Math.round(frameworkScores.SPICED)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Industry Comparison */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Industry Benchmark</p>
              <p className="text-2xl font-bold text-gray-900">{industryBenchmark}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Position</p>
              <p className={cn("text-2xl font-bold", isAboveBenchmark ? "text-green-600" : "text-red-600")}>
                {isAboveBenchmark ? '+' : ''}{benchmarkDiff}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gray-400 rounded-full transition-all duration-500"
                style={{ width: `${industryBenchmark}%` }}
              />
              <div 
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-700",
                  `bg-gradient-to-r ${getScoreGradient(overallScore)}`
                )}
                style={{ width: `${overallScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0</span>
              <span>Industry Avg</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}