
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { useFrameworkAnalytics } from '@/hooks/useFrameworkAnalytics';
import type { BANTComponents } from '@/types/salesFrameworks';

interface BANTAnalysisCardProps {
  recordingId?: string;
}

export default function BANTAnalysisCard({ recordingId }: BANTAnalysisCardProps) {
  const { analyses, loading, error } = useFrameworkAnalytics();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            BANT Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            BANT Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading BANT analysis: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bantAnalysis = analyses.find(analysis => analysis.frameworkType === 'BANT');

  if (!bantAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            BANT Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <p>No BANT analysis available</p>
            <p className="text-sm">Upload a recording to see BANT analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely convert component scores to BANT format
  const bantComponents: BANTComponents = {
    budget: bantAnalysis.componentScores.budget || 0,
    authority: bantAnalysis.componentScores.authority || 0,
    need: bantAnalysis.componentScores.need || 0,
    timeline: bantAnalysis.componentScores.timeline || 0
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            BANT Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{bantAnalysis.overallScore}/100</p>
                <p className="text-sm text-gray-600">Overall BANT Score</p>
              </div>
              <div className="text-right">
                <Badge variant={bantAnalysis.overallScore >= 80 ? "default" : bantAnalysis.overallScore >= 60 ? "secondary" : "destructive"}>
                  {bantAnalysis.overallScore >= 80 ? "Qualified" : bantAnalysis.overallScore >= 60 ? "Partially Qualified" : "Not Qualified"}
                </Badge>
              </div>
            </div>
            <Progress value={bantAnalysis.overallScore} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* BANT Components */}
      <Card>
        <CardHeader>
          <CardTitle>BANT Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Budget</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(bantComponents.budget)}
                  <span className={`font-semibold ${getScoreColor(bantComponents.budget)}`}>
                    {bantComponents.budget}%
                  </span>
                </div>
              </div>
              <Progress value={bantComponents.budget} className="w-full" />
            </div>

            {/* Authority */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Authority</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(bantComponents.authority)}
                  <span className={`font-semibold ${getScoreColor(bantComponents.authority)}`}>
                    {bantComponents.authority}%
                  </span>
                </div>
              </div>
              <Progress value={bantComponents.authority} className="w-full" />
            </div>

            {/* Need */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Need</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(bantComponents.need)}
                  <span className={`font-semibold ${getScoreColor(bantComponents.need)}`}>
                    {bantComponents.need}%
                  </span>
                </div>
              </div>
              <Progress value={bantComponents.need} className="w-full" />
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Timeline</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(bantComponents.timeline)}
                  <span className={`font-semibold ${getScoreColor(bantComponents.timeline)}`}>
                    {bantComponents.timeline}%
                  </span>
                </div>
              </div>
              <Progress value={bantComponents.timeline} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bantAnalysis.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {insight.type === 'strength' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{insight.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {insight.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bantAnalysis.coachingActions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900">{action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
