
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { useFrameworkAnalytics } from '@/hooks/useFrameworkAnalytics';
import type { MEDDICComponents } from '@/types/salesFrameworks';

interface MEDDICAnalysisCardProps {
  recordingId?: string;
}

export default function MEDDICAnalysisCard({ recordingId }: MEDDICAnalysisCardProps) {
  const { analyses, loading, error } = useFrameworkAnalytics();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            MEDDIC Analysis
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
            MEDDIC Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading MEDDIC analysis: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meddicAnalysis = analyses.find(analysis => analysis.frameworkType === 'MEDDIC');

  if (!meddicAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            MEDDIC Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <p>No MEDDIC analysis available</p>
            <p className="text-sm">Upload a recording to see MEDDIC analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely convert component scores to MEDDIC format
  const meddicComponents: MEDDICComponents = {
    metrics: meddicAnalysis.componentScores.metrics || 0,
    economic_buyer: meddicAnalysis.componentScores.economic_buyer || 0,
    decision_criteria: meddicAnalysis.componentScores.decision_criteria || 0,
    decision_process: meddicAnalysis.componentScores.decision_process || 0,
    identify_pain: meddicAnalysis.componentScores.identify_pain || 0,
    champion: meddicAnalysis.componentScores.champion || 0
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
            MEDDIC Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{meddicAnalysis.overallScore}/100</p>
                <p className="text-sm text-gray-600">Overall MEDDIC Score</p>
              </div>
              <div className="text-right">
                <Badge variant={meddicAnalysis.overallScore >= 80 ? "default" : meddicAnalysis.overallScore >= 60 ? "secondary" : "destructive"}>
                  {meddicAnalysis.overallScore >= 80 ? "Qualified" : meddicAnalysis.overallScore >= 60 ? "Partially Qualified" : "Not Qualified"}
                </Badge>
              </div>
            </div>
            <Progress value={meddicAnalysis.overallScore} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* MEDDIC Components */}
      <Card>
        <CardHeader>
          <CardTitle>MEDDIC Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Metrics</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.metrics)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.metrics)}`}>
                    {meddicComponents.metrics}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.metrics} className="w-full" />
            </div>

            {/* Economic Buyer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Economic Buyer</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.economic_buyer)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.economic_buyer)}`}>
                    {meddicComponents.economic_buyer}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.economic_buyer} className="w-full" />
            </div>

            {/* Decision Criteria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Decision Criteria</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.decision_criteria)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.decision_criteria)}`}>
                    {meddicComponents.decision_criteria}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.decision_criteria} className="w-full" />
            </div>

            {/* Decision Process */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Decision Process</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.decision_process)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.decision_process)}`}>
                    {meddicComponents.decision_process}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.decision_process} className="w-full" />
            </div>

            {/* Identify Pain */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Identify Pain</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.identify_pain)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.identify_pain)}`}>
                    {meddicComponents.identify_pain}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.identify_pain} className="w-full" />
            </div>

            {/* Champion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Champion</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(meddicComponents.champion)}
                  <span className={`font-semibold ${getScoreColor(meddicComponents.champion)}`}>
                    {meddicComponents.champion}%
                  </span>
                </div>
              </div>
              <Progress value={meddicComponents.champion} className="w-full" />
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
            {meddicAnalysis.insights.map((insight, index) => (
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
            {meddicAnalysis.coachingActions.map((action, index) => (
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
