/**
 * Team Analytics Component
 * 
 * Team-wide performance analytics for BDR training programs,
 * including comparative analysis, team trends, and collaborative insights.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram } from '@/types/bdr-training';
import { toast } from 'sonner';

interface TeamAnalyticsComponentProps {
  trainingProgram: BDRTrainingProgram;
}

interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  averageScore: number;
  teamImprovement: number;
  completionRate: number;
  targetAchievementRate: number;
  collaborationScore: number;
  diversityIndex: number;
}

interface TeamTrend {
  week: string;
  teamAverage: number;
  participationRate: number;
  improvementRate: number;
  topPerformerScore: number;
  bottomPerformerScore: number;
}

interface CriteriaComparison {
  criteria: string;
  teamAverage: number;
  industryBenchmark: number;
  targetScore: number;
  improvement: number;
  topPerformers: string[];
  strugglingMembers: string[];
}

interface TeamInsight {
  type: 'strength' | 'opportunity' | 'risk' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  affectedMembers: number;
  timeframe: string;
}

interface CollaborationMetric {
  peerLearningScore: number;
  knowledgeSharingRate: number;
  mentorshipConnections: number;
  teamCohesionIndex: number;
  crossTrainingParticipation: number;
}

// Mock data removed - using real data from API

// Mock data removed - using real data from API

// Mock data removed - using real data from API

// Mock data removed - using real data from API

// Mock data removed - using real data from API

export function TeamAnalyticsComponent({ trainingProgram }: TeamAnalyticsComponentProps) {
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [teamTrends, setTeamTrends] = useState<TeamTrend[]>([]);
  const [criteriaComparison, setCriteriaComparison] = useState<CriteriaComparison[]>([]);
  const [teamInsights, setTeamInsights] = useState<TeamInsight[]>([]);
  const [collaborationMetrics, setCollaborationMetrics] = useState<CollaborationMetric | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('4w');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTeamAnalytics();
  }, [trainingProgram.id, selectedTimeframe]);

  const loadTeamAnalytics = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('get-training-analytics', {
        body: {
          type: 'team_analytics',
          trainingProgramId: trainingProgram.id,
          options: {
            timeframe: selectedTimeframe,
            includeBenchmarks: true,
            includeCollaboration: true
          }
        }
      });

      if (error) throw error;

      // Set real data from API response
      setTeamMetrics(data?.teamMetrics || null);
      setTeamTrends(data?.teamTrends || []);
      setCriteriaComparison(data?.criteriaComparison || []);
      setTeamInsights(data?.teamInsights || []);
      setCollaborationMetrics(data?.collaborationMetrics || null);
      
    } catch (error) {
      console.error('Error loading team analytics:', error);
      toast.error('Failed to load team analytics');
      
      // Reset to empty states on error
      setTeamMetrics(null);
      setTeamTrends([]);
      setCriteriaComparison([]);
      setTeamInsights([]);
      setCollaborationMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'opportunity': return <Target className="h-4 w-4 text-blue-600" />;
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'achievement': return <Award className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'strength': return 'border-l-green-500 bg-green-50';
      case 'opportunity': return 'border-l-blue-500 bg-blue-50';
      case 'risk': return 'border-l-red-500 bg-red-50';
      case 'achievement': return 'border-l-purple-500 bg-purple-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getComparisonColor = (teamAvg: number, benchmark: number) => {
    if (teamAvg > benchmark) return 'text-green-600';
    if (teamAvg < benchmark) return 'text-red-600';
    return 'text-gray-600';
  };

  const exportTeamData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-training-analytics', {
        body: {
          type: 'export_team_data',
          trainingProgramId: trainingProgram.id,
          options: {
            format: 'comprehensive',
            timeframe: selectedTimeframe
          }
        }
      });

      if (error) throw error;

      // Mock export for now
      const exportData = {
        teamMetrics,
        trends: teamTrends,
        criteriaComparison,
        insights: teamInsights,
        collaboration: collaborationMetrics
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `team-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Team analytics exported successfully');
    } catch (error) {
      console.error('Error exporting team data:', error);
      toast.error('Failed to export team analytics');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Team Performance Analytics</h3>
          <p className="text-gray-600">Comprehensive team insights and collaborative metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1w">Last Week</SelectItem>
              <SelectItem value="4w">Last 4 Weeks</SelectItem>
              <SelectItem value="12w">Last 12 Weeks</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportTeamData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadTeamAnalytics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Team Metrics */}
      {teamMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Average</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.averageScore}</p>
                  <div className="flex items-center text-sm">
                    {teamMetrics.teamImprovement > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className={teamMetrics.teamImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
                      {teamMetrics.teamImprovement > 0 ? '+' : ''}{teamMetrics.teamImprovement}%
                    </span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMetrics.activeMembers}/{teamMetrics.totalMembers}
                  </p>
                  <p className="text-sm text-gray-600">
                    {Math.round((teamMetrics.activeMembers / teamMetrics.totalMembers) * 100)}% participation
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Target Achievement</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.targetAchievementRate}%</p>
                  <p className="text-sm text-gray-600">
                    {teamMetrics.totalMembers - Math.round(teamMetrics.totalMembers * teamMetrics.targetAchievementRate / 100)} members need support
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Collaboration Score</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.collaborationScore}</p>
                  <p className="text-sm text-gray-600">Team synergy index</p>
                </div>
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Analytics Data Available</h3>
            <p className="text-gray-600 mb-4">Team performance metrics will appear here once training data is processed and analyzed.</p>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p><strong>To see team analytics:</strong></p>
              <ul className="mt-2 text-left space-y-1">
                <li>• Upload BDR scorecard training data</li>
                <li>• Ensure multiple team members participate in training</li>
                <li>• Wait for batch processing to complete</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            <span>Team Performance Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900">
                    Week of {new Date(trend.week).toLocaleDateString()}
                  </div>
                  <Badge variant="outline">
                    Avg: {trend.teamAverage}
                  </Badge>
                  <Badge variant="outline">
                    Participation: {trend.participationRate}%
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Top</div>
                    <div className="font-medium text-green-600">{trend.topPerformerScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Bottom</div>
                    <div className="font-medium text-red-600">{trend.bottomPerformerScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Improvement</div>
                    <div className={`font-medium ${trend.improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.improvementRate > 0 ? '+' : ''}{trend.improvementRate}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Criteria Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            <span>Performance vs Industry Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteriaComparison.map((criteria, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{criteria.criteria}</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Team</div>
                    <div className={`font-bold ${getComparisonColor(criteria.teamAverage, criteria.industryBenchmark)}`}>
                      {criteria.teamAverage}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Benchmark</div>
                    <div className="font-medium text-gray-900">{criteria.industryBenchmark}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Target</div>
                    <div className="font-medium text-blue-600">{criteria.targetScore}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress to target</span>
                  <span>{Math.round((criteria.teamAverage / criteria.targetScore) * 100)}%</span>
                </div>
                <Progress value={(criteria.teamAverage / criteria.targetScore) * 100} className="w-full" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-gray-600 mr-2">Top performers:</span>
                  {criteria.topPerformers.map((performer, i) => (
                    <Badge key={i} variant="outline" className="text-green-700 border-green-300 text-xs">
                      {performer}
                    </Badge>
                  ))}
                </div>
                {criteria.strugglingMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm text-gray-600 mr-2">Needs support:</span>
                    {criteria.strugglingMembers.slice(0, 2).map((member, i) => (
                      <Badge key={i} variant="outline" className="text-orange-700 border-orange-300 text-xs">
                        {member}
                      </Badge>
                    ))}
                    {criteria.strugglingMembers.length > 2 && (
                      <Badge variant="outline" className="text-gray-700 border-gray-300 text-xs">
                        +{criteria.strugglingMembers.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Collaboration Metrics */}
      {collaborationMetrics ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Team Collaboration Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{collaborationMetrics.peerLearningScore}</div>
                <div className="text-sm text-gray-600">Peer Learning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{collaborationMetrics.knowledgeSharingRate}%</div>
                <div className="text-sm text-gray-600">Knowledge Sharing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{collaborationMetrics.mentorshipConnections}</div>
                <div className="text-sm text-gray-600">Mentorship Pairs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{collaborationMetrics.teamCohesionIndex}</div>
                <div className="text-sm text-gray-600">Team Cohesion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{collaborationMetrics.crossTrainingParticipation}%</div>
                <div className="text-sm text-gray-600">Cross Training</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Team Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Team Insights & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamInsights.map((insight, index) => (
            <div key={index} className={`border-l-4 p-4 rounded-lg ${getInsightColor(insight.type)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getInsightIcon(insight.type)}
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'outline'}>
                    {insight.impact} impact
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">{insight.timeframe}</div>
              </div>
              
              <p className="text-gray-700 mb-3">{insight.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">Action Items:</span>
                  <span className="text-gray-600">{insight.affectedMembers} members affected</span>
                </div>
                <ul className="space-y-1">
                  {insight.actionItems.map((action, actionIndex) => (
                    <li key={actionIndex} className="flex items-start space-x-2 text-sm">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}