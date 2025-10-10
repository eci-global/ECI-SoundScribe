import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, Target } from 'lucide-react';
import { EmployeeSummary } from '@/utils/managerAnalytics';

interface ManagerKpis {
  totalCalls: number;
  averageScore: number;
  topPerformer: {
    id: string;
    name: string;
    score: number;
  } | null;
  employeeCount: number;
}

interface InsightHighlightsProps {
  kpis: ManagerKpis;
  employees: EmployeeSummary[];
}

export function InsightHighlights({ kpis, employees }: InsightHighlightsProps) {
  // Generate insights based on data
  const generateInsights = () => {
    const insights = [];

    // Performance insights
    if (kpis.averageScore >= 4.0) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Strong Team Performance',
        description: `Team average score of ${kpis.averageScore.toFixed(1)}/5.0 indicates excellent call quality.`,
        action: 'Continue current training approach',
      });
    } else if (kpis.averageScore < 3.0) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Performance Opportunity',
        description: `Team average score of ${kpis.averageScore.toFixed(1)}/5.0 suggests room for improvement.`,
        action: 'Consider additional coaching sessions',
      });
    }

    // Volume insights
    if (kpis.totalCalls > 100) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        title: 'High Call Volume',
        description: `${kpis.totalCalls} calls processed shows active team engagement.`,
        action: 'Monitor for burnout and capacity planning',
      });
    }

    // Employee distribution insights
    const topPerformers = employees.filter(e => e.averageScore >= 4.0).length;
    const needsImprovement = employees.filter(e => e.averageScore < 3.0).length;

    if (topPerformers > 0) {
      insights.push({
        type: 'success',
        icon: Target,
        title: 'Top Performers Identified',
        description: `${topPerformers} employees scoring 4.0+ can mentor others.`,
        action: 'Create peer mentoring program',
      });
    }

    if (needsImprovement > 0) {
      insights.push({
        type: 'warning',
        icon: Lightbulb,
        title: 'Coaching Opportunities',
        description: `${needsImprovement} employees would benefit from focused coaching.`,
        action: 'Schedule one-on-one coaching sessions',
      });
    }

    // Strengths and improvements analysis
    const allStrengths = employees.flatMap(e => e.strengths);
    const allImprovements = employees.flatMap(e => e.improvements);

    if (allStrengths.length > 0) {
      const topStrength = allStrengths
        .reduce((acc, strength) => {
          acc[strength] = (acc[strength] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const mostCommonStrength = Object.entries(topStrength)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostCommonStrength) {
        insights.push({
          type: 'info',
          icon: CheckCircle,
          title: 'Team Strength',
          description: `${mostCommonStrength[1]} employees excel at "${mostCommonStrength[0]}".`,
          action: 'Leverage this strength in training materials',
        });
      }
    }

    if (allImprovements.length > 0) {
      const topImprovement = allImprovements
        .reduce((acc, improvement) => {
          acc[improvement] = (acc[improvement] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const mostCommonImprovement = Object.entries(topImprovement)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostCommonImprovement) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'Common Challenge',
          description: `${mostCommonImprovement[1]} employees need help with "${mostCommonImprovement[0]}".`,
          action: 'Create targeted training module',
        });
      }
    }

    return insights.slice(0, 6); // Limit to 6 insights
  };

  const insights = generateInsights();

  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          iconColor: 'text-green-600',
          badgeColor: 'bg-green-100 text-green-700',
        };
      case 'warning':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-100 text-yellow-700',
        };
      case 'info':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-700',
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-gray-50',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-700',
        };
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Lightbulb className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
            <p className="text-sm">More data is needed to generate meaningful insights.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          Key Insights & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((insight, index) => {
            const styles = getInsightStyles(insight.type);
            const Icon = insight.icon;

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border ${styles.border} ${styles.bg}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`rounded-full p-1 ${styles.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${styles.badgeColor}`}
                      >
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700">
                      {insight.description}
                    </p>
                    <div className="pt-1.5 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600">
                        💡 Recommended Action:
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {insight.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-base font-semibold text-green-600">
                {insights.filter(i => i.type === 'success').length}
              </p>
              <p className="text-xs text-gray-500">Strengths</p>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-yellow-600">
                {insights.filter(i => i.type === 'warning').length}
              </p>
              <p className="text-xs text-gray-500">Opportunities</p>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-blue-600">
                {insights.filter(i => i.type === 'info').length}
              </p>
              <p className="text-xs text-gray-500">Observations</p>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-900">
                {insights.length}
              </p>
              <p className="text-xs text-gray-500">Total Insights</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}