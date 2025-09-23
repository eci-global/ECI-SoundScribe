
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, Award } from 'lucide-react';
import { useCoachingInsights } from '@/hooks/useCoachingInsights';

interface AICoachingInsightsProps {
  userId: string;
}

export default function AICoachingInsights({ userId }: AICoachingInsightsProps) {
  const { insights, stats, loading, error } = useCoachingInsights();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI Coaching Insights
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
            <TrendingUp className="h-5 w-5" />
            AI Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading insights: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const strengthInsights = insights.filter(insight => insight.type === 'strength');
  const improvementInsights = insights.filter(insight => insight.type === 'improvement');

  return (
    <div className="space-y-6">
      {/* Overview Cards - Optimized for narrow column */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card className="bg-white/70 backdrop-blur-md border-white/20">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="p-2 bg-primary/10 rounded-lg w-fit mx-auto mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-lg font-bold">{stats.averageScore.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-white/20">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="p-2 bg-green-100 rounded-lg w-fit mx-auto mb-2">
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">Strengths</p>
              <p className="text-lg font-bold">{strengthInsights.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-white/20">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="p-2 bg-orange-100 rounded-lg w-fit mx-auto mb-2">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-xs text-muted-foreground">Areas</p>
              <p className="text-lg font-bold">{improvementInsights.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-white/20">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="p-2 bg-purple-100 rounded-lg w-fit mx-auto mb-2">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground">Insights</p>
              <p className="text-lg font-bold">{stats.totalInsights}</p>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
