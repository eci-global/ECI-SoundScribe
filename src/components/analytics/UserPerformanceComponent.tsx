/**
 * User Performance Component
 * 
 * Individual user performance analytics for BDR training programs,
 * including detailed score breakdowns, progress tracking, and coaching insights.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Calendar,
  Star,
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram } from '@/types/bdr-training';
import { toast } from 'sonner';

interface UserPerformanceComponentProps {
  trainingProgram: BDRTrainingProgram;
}

interface UserPerformance {
  userId: string;
  userName: string;
  overallScore: number;
  improvement: number;
  participationCount: number;
  lastActivity: string;
  rankingPosition: number;
  trendDirection: 'up' | 'down' | 'stable';
  criteriaScores: {
    opening: number;
    clearConfident: number;
    patternInterrupt: number;
    toneEnergy: number;
    closing: number;
  };
  weeklyProgress: Array<{
    week: string;
    score: number;
    participationCount: number;
  }>;
  strengths: string[];
  improvementAreas: string[];
  coachingNotes?: string;
  goals: {
    targetScore: number;
    completionDate: string;
    progress: number;
  };
}

interface PerformanceFilters {
  searchTerm: string;
  sortBy: 'score' | 'improvement' | 'participation' | 'name';
  sortDirection: 'asc' | 'desc';
  performanceLevel: 'all' | 'high' | 'medium' | 'low';
  showOnlyActive: boolean;
}

// Mock data removed - component now shows real data or proper empty states

export function UserPerformanceComponent({ trainingProgram }: UserPerformanceComponentProps) {
  const [userPerformances, setUserPerformances] = useState<UserPerformance[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null);
  const [filters, setFilters] = useState<PerformanceFilters>({
    searchTerm: '',
    sortBy: 'score',
    sortDirection: 'desc',
    performanceLevel: 'all',
    showOnlyActive: false
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserPerformances();
  }, [trainingProgram.id, filters]);

  const loadUserPerformances = async () => {
    try {
      setIsLoading(true);

      // In real implementation, would call Edge Function
      const { data, error } = await supabase.functions.invoke('get-training-analytics', {
        body: {
          type: 'user_performance',
          trainingProgramId: trainingProgram.id,
          options: {
            filters,
            includeProgress: true,
            includeGoals: true
          }
        }
      });

      if (error) throw error;

      // Set real data from API response
      setUserPerformances(data?.userPerformances || []);
      
    } catch (error) {
      console.error('Error loading user performances:', error);
      toast.error('Failed to load user performance data');
      setUserPerformances([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filters are now handled by the backend API

  const getPerformanceLevel = (score: number): { level: string; color: string } => {
    if (score >= 85) return { level: 'High', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Low', color: 'bg-red-100 text-red-800' };
  };

  const getTrendIcon = (trend: string, improvement: number) => {
    if (trend === 'up' || improvement > 0) {
      return <ArrowUp className="h-4 w-4 text-green-600" />;
    } else if (trend === 'down' || improvement < 0) {
      return <ArrowDown className="h-4 w-4 text-red-600" />;
    }
    return <div className="h-4 w-4" />;
  };

  const exportUserData = async (userId?: string) => {
    try {
      const exportData = userId 
        ? userPerformances.filter(u => u.userId === userId)
        : userPerformances;

      const csvContent = generateCSV(exportData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-performance-${userId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Performance data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export performance data');
    }
  };

  const generateCSV = (data: UserPerformance[]): string => {
    const headers = [
      'Name', 'Overall Score', 'Improvement %', 'Participation Count', 'Ranking',
      'Opening Score', 'Clear & Confident', 'Pattern Interrupt', 'Tone & Energy', 'Closing Score',
      'Last Activity', 'Target Score', 'Goal Progress %'
    ];

    const rows = data.map(user => [
      user.userName,
      user.overallScore,
      user.improvement,
      user.participationCount,
      user.rankingPosition,
      user.criteriaScores.opening,
      user.criteriaScores.clearConfident,
      user.criteriaScores.patternInterrupt,
      user.criteriaScores.toneEnergy,
      user.criteriaScores.closing,
      new Date(user.lastActivity).toLocaleDateString(),
      user.goals.targetScore,
      user.goals.progress
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Individual Performance</h3>
          <p className="text-gray-600">Track and analyze individual user progress and achievements</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportUserData()}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button
            variant="outline"
            onClick={loadUserPerformances}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.sortBy}
              onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sort by Score</SelectItem>
                <SelectItem value="improvement">Sort by Improvement</SelectItem>
                <SelectItem value="participation">Sort by Participation</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.performanceLevel}
              onValueChange={(value: any) => setFilters(prev => ({ ...prev, performanceLevel: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance Levels</SelectItem>
                <SelectItem value="high">High Performers (85+)</SelectItem>
                <SelectItem value="medium">Medium Performers (70-84)</SelectItem>
                <SelectItem value="low">Needs Improvement ({"<"}70)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activeOnly"
                checked={filters.showOnlyActive}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyActive: e.target.checked }))}
              />
              <label htmlFor="activeOnly" className="text-sm text-gray-700">Active only</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Performance List */}
      <div className="grid grid-cols-1 gap-4">
        {userPerformances.map((user) => (
          <Card key={user.userId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{user.userName}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>Rank #{user.rankingPosition}</span>
                        <span>•</span>
                        <span>{user.participationCount} participations</span>
                        <span>•</span>
                        <span>Last active {new Date(user.lastActivity).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Overall Score */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{user.overallScore}</div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                      <Badge className={getPerformanceLevel(user.overallScore).color}>
                        {getPerformanceLevel(user.overallScore).level}
                      </Badge>
                    </div>

                    {/* Improvement */}
                    <div className="text-center">
                      <div className={`text-2xl font-bold flex items-center justify-center ${
                        user.improvement > 0 ? 'text-green-600' : user.improvement < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {getTrendIcon(user.trendDirection, user.improvement)}
                        {user.improvement > 0 ? '+' : ''}{user.improvement}%
                      </div>
                      <div className="text-sm text-gray-600">Improvement</div>
                    </div>

                    {/* Goal Progress */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{user.goals.progress}%</div>
                      <div className="text-sm text-gray-600">Goal Progress</div>
                      <div className="text-xs text-gray-500">Target: {user.goals.targetScore}</div>
                    </div>

                    {/* Strengths */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{user.strengths.length}</div>
                      <div className="text-sm text-gray-600">Strengths</div>
                    </div>
                  </div>

                  {/* Criteria Breakdown */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {Object.entries(user.criteriaScores).map(([key, score]) => (
                      <div key={key} className="text-center">
                        <div className="text-lg font-medium">{score}</div>
                        <div className="text-xs text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths and Areas for Improvement */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Strengths:</span>
                    </div>
                    {user.strengths.map((strength, index) => (
                      <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                        {strength}
                      </Badge>
                    ))}
                  </div>

                  {user.improvementAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Focus Areas:</span>
                      </div>
                      {user.improvementAreas.map((area, index) => (
                        <Badge key={index} variant="outline" className="text-orange-700 border-orange-300">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Coaching Notes */}
                  {user.coachingNotes && (
                    <div className="bg-blue-50 rounded p-3 text-sm">
                      <span className="font-medium text-blue-900">Coaching Notes: </span>
                      <span className="text-blue-800">{user.coachingNotes}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUser(user)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => exportUserData(user.userId)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {userPerformances.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No User Performance Data Available</h3>
            <p className="text-gray-600 mb-4">Individual user performance metrics will appear here once training data is uploaded and processed.</p>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p><strong>To see user performance:</strong></p>
              <ul className="mt-2 text-left space-y-1">
                <li>• Upload BDR scorecard data with user evaluations</li>
                <li>• Ensure training data includes individual user scores</li>
                <li>• Wait for data processing to complete</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user performance data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}