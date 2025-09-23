
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { useFrameworkAnalytics } from '@/hooks/useFrameworkAnalytics';
import type { SPICEDComponents } from '@/types/salesFrameworks';

interface SPICEDAnalysisCardProps {
  recordingId?: string;
}

export default function SPICEDAnalysisCard({ recordingId }: SPICEDAnalysisCardProps) {
  const { analyses, loading, error } = useFrameworkAnalytics();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SPICED Analysis
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
            SPICED Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading SPICED analysis: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const spicedAnalysis = analyses.find(analysis => analysis.frameworkType === 'SPICED');

  if (!spicedAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SPICED Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <p>No SPICED analysis available</p>
            <p className="text-sm">Upload a recording to see SPICED analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely convert component scores to SPICED format
  const spicedComponents: SPICEDComponents = {
    situation: spicedAnalysis.componentScores.situation || 0,
    problem: spicedAnalysis.componentScores.problem || 0,
    implication: spicedAnalysis.componentScores.implication || 0,
    complexity: spicedAnalysis.componentScores.complexity || 0,
    economic_impact: spicedAnalysis.componentScores.economic_impact || 0,
    decision: spicedAnalysis.componentScores.decision || 0
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
            SPICED Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{spicedAnalysis.overallScore}/100</p>
                <p className="text-sm text-gray-600">Overall SPICED Score</p>
              </div>
              <div className="text-right">
                <Badge variant={spicedAnalysis.overallScore >= 80 ? "default" : spicedAnalysis.overallScore >= 60 ? "secondary" : "destructive"}>
                  {spicedAnalysis.overallScore >= 80 ? "Qualified" : spicedAnalysis.overallScore >= 60 ? "Partially Qualified" : "Not Qualified"}
                </Badge>
              </div>
            </div>
            <Progress value={spicedAnalysis.overallScore} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* SPICED Components */}
      <Card>
        <CardHeader>
          <CardTitle>SPICED Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Situation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Situation</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.situation)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.situation)}`}>
                    {spicedComponents.situation}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.situation} className="w-full" />
            </div>

            {/* Problem */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Problem</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.problem)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.problem)}`}>
                    {spicedComponents.problem}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.problem} className="w-full" />
            </div>

            {/* Implication */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Implication</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.implication)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.implication)}`}>
                    {spicedComponents.implication}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.implication} className="w-full" />
            </div>

            {/* Complexity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Complexity</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.complexity)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.complexity)}`}>
                    {spicedComponents.complexity}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.complexity} className="w-full" />
            </div>

            {/* Economic Impact */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Economic Impact</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.economic_impact)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.economic_impact)}`}>
                    {spicedComponents.economic_impact}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.economic_impact} className="w-full" />
            </div>

            {/* Decision */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Decision</span>
                <div className="flex items-center gap-2">
                  {getScoreIcon(spicedComponents.decision)}
                  <span className={`font-semibold ${getScoreColor(spicedComponents.decision)}`}>
                    {spicedComponents.decision}%
                  </span>
                </div>
              </div>
              <Progress value={spicedComponents.decision} className="w-full" />
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
            {spicedAnalysis.insights.map((insight, index) => (
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
            {spicedAnalysis.coachingActions.map((action, index) => (
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
