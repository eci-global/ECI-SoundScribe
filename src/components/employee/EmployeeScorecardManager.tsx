import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Star,
  AlertCircle,
  CheckCircle,
  Calendar,
  MessageSquare,
  Award,
  Users,
  Filter
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import type { EmployeeScorecard, EmployeePerformanceSummary } from '@/types/employee';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface EmployeeScorecardManagerProps {
  employeeId: string;
  onScorecardUpdate?: (scorecard: EmployeeScorecard) => void;
}

const EmployeeScorecardManager: React.FC<EmployeeScorecardManagerProps> = ({
  employeeId,
  onScorecardUpdate
}) => {
  const [scorecards, setScorecards] = useState<EmployeeScorecard[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<EmployeePerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadScorecardData();
  }, [employeeId, selectedPeriod]);

  const loadScorecardData = async () => {
    try {
      setLoading(true);
      const [scorecardsData, summaryData] = await Promise.all([
        EmployeeService.getEmployeeScorecards(employeeId, 50),
        EmployeeService.getEmployeePerformanceSummary(employeeId)
      ]);
      setScorecards(scorecardsData);
      setPerformanceSummary(summaryData);
    } catch (error) {
      console.error('Failed to load scorecard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
  };

  const getScoreTrendText = (trend: number) => {
    if (trend > 0.1) return 'Improving';
    if (trend < -0.1) return 'Declining';
    return 'Stable';
  };

  const getScoreTrendColor = (trend: number) => {
    if (trend > 0.1) return 'text-green-600';
    if (trend < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  // Prepare data for charts
  const scoreTrendData = scorecards.map(card => ({
    date: new Date(card.evaluation_date).toLocaleDateString(),
    score: card.overall_score,
    recording: card.recording_id
  }));

  const criteriaData = performanceSummary ? Object.entries(performanceSummary).map(([key, value]) => ({
    criteria: key,
    score: typeof value === 'number' ? value : 0
  })) : [];

  const strengthsData = scorecards.flatMap(card => card.strengths).reduce((acc, strength) => {
    acc[strength] = (acc[strength] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const improvementsData = scorecards.flatMap(card => card.improvements).reduce((acc, improvement) => {
    acc[improvement] = (acc[improvement] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      {performanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.current_score.toFixed(1)}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {getScoreTrendIcon(performanceSummary.score_trend)}
                <span className={getScoreTrendColor(performanceSummary.score_trend)}>
                  {getScoreTrendText(performanceSummary.score_trend)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.total_calls}</div>
              <p className="text-xs text-muted-foreground">
                Last: {new Date(performanceSummary.last_evaluation_date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.coaching_notes_count}</div>
              <p className="text-xs text-muted-foreground">
                Active feedback sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Rank</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#3</div>
              <p className="text-xs text-muted-foreground">
                Out of 12 team members
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scorecard Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Score Trends</TabsTrigger>
          <TabsTrigger value="criteria">Criteria Analysis</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
        </TabsList>

        {/* Score Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score Progression</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={scoreTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-blue-600">
                              Score: {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Scorecards */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scorecards</CardTitle>
              <CardDescription>Latest performance evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scorecards.slice(0, 5).map((scorecard) => (
                  <div key={scorecard.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">Recording #{scorecard.recording_id.slice(-8)}</h4>
                        <Badge variant="outline">
                          {new Date(scorecard.evaluation_date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Score: {scorecard.overall_score.toFixed(1)}</span>
                        <span>Strengths: {scorecard.strengths.length}</span>
                        <span>Improvements: {scorecard.improvements.length}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{scorecard.overall_score.toFixed(1)}</div>
                      <div className="text-sm text-gray-600">
                        {scorecard.strengths.length > 0 && (
                          <span className="text-green-600">
                            {scorecard.strengths[0].slice(0, 30)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Criteria Analysis Tab */}
        <TabsContent value="criteria" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criteria Performance</CardTitle>
              <CardDescription>Performance across different evaluation criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(scorecards[0]?.criteria_scores || {}).map(([criteria, data]) => (
                  <div key={criteria} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">
                        {criteria.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span>{data.score.toFixed(1)}/{data.maxScore}</span>
                    </div>
                    <Progress 
                      value={(data.score / data.maxScore) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-600">{data.feedback}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strengths Tab */}
        <TabsContent value="strengths" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-green-500" />
                <span>Top Strengths</span>
              </CardTitle>
              <CardDescription>Most frequently identified strengths</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(strengthsData)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([strength, count]) => (
                    <div key={strength} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{strength}</span>
                      </div>
                      <Badge variant="outline">{count} times</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-500" />
                <span>Improvement Areas</span>
              </CardTitle>
              <CardDescription>Areas that need the most attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(improvementsData)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([improvement, count]) => (
                    <div key={improvement} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">{improvement}</span>
                      </div>
                      <Badge variant="outline">{count} times</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeScorecardManager;
