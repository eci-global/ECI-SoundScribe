import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedbackAnalyticsData {
  totalCorrections: number;
  highVarianceCorrections: number;
  averageVariance: number;
  alignmentTrend: number;
  criteriaBreakdown: Record<string, {
    totalAdjustments: number;
    averageVariance: number;
    mostCommonReason: string;
  }>;
  recentCorrections: Array<{
    id: string;
    recordingId: string;
    managerName: string;
    originalScore: number;
    correctedScore: number;
    variance: number;
    reason: string;
    createdAt: string;
  }>;
  managerPerformance: Array<{
    managerId: string;
    managerName: string;
    totalCorrections: number;
    averageVariance: number;
    highVarianceCount: number;
  }>;
}

const FeedbackAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<FeedbackAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedManager, setSelectedManager] = useState('all');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, selectedManager]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build query filters
      let query = supabase
        .from('manager_feedback_corrections')
        .select(`
          *,
          profiles!manager_feedback_corrections_manager_id_fkey(name, email)
        `)
        .gte('created_at', startDate.toISOString());

      if (selectedManager !== 'all') {
        query = query.eq('manager_id', selectedManager);
      }

      const { data: corrections, error } = await query;

      if (error) throw error;

      // Process analytics data
      const analyticsData: FeedbackAnalyticsData = {
        totalCorrections: corrections.length,
        highVarianceCorrections: corrections.filter(c => c.high_variance).length,
        averageVariance: corrections.reduce((sum, c) => sum + c.score_variance, 0) / corrections.length || 0,
        alignmentTrend: calculateAlignmentTrend(corrections),
        criteriaBreakdown: calculateCriteriaBreakdown(corrections),
        recentCorrections: corrections.slice(0, 10).map(c => ({
          id: c.id,
          recordingId: c.recording_id,
          managerName: c.profiles?.name || 'Unknown',
          originalScore: c.original_overall_score,
          correctedScore: c.corrected_overall_score,
          variance: c.score_variance,
          reason: c.change_reason,
          createdAt: c.created_at
        })),
        managerPerformance: calculateManagerPerformance(corrections)
      };

      setData(analyticsData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAlignmentTrend = (corrections: any[]) => {
    if (corrections.length < 2) return 0;
    
    const recent = corrections.slice(0, Math.floor(corrections.length / 2));
    const older = corrections.slice(Math.floor(corrections.length / 2));
    
    const recentAvg = recent.reduce((sum, c) => sum + c.score_variance, 0) / recent.length;
    const olderAvg = older.reduce((sum, c) => sum + c.score_variance, 0) / older.length;
    
    return ((olderAvg - recentAvg) / olderAvg) * 100;
  };

  const calculateCriteriaBreakdown = (corrections: any[]) => {
    const breakdown: Record<string, any> = {};
    
    corrections.forEach(correction => {
      const criteriaAdjustments = correction.criteria_adjustments || {};
      
      Object.entries(criteriaAdjustments).forEach(([criteria, adjustment]: [string, any]) => {
        if (!breakdown[criteria]) {
          breakdown[criteria] = {
            totalAdjustments: 0,
            totalVariance: 0,
            reasons: {}
          };
        }
        
        breakdown[criteria].totalAdjustments++;
        breakdown[criteria].totalVariance += Math.abs(adjustment.score - (correction.original_ai_scores[criteria]?.score || 0));
        breakdown[criteria].reasons[correction.change_reason] = (breakdown[criteria].reasons[correction.change_reason] || 0) + 1;
      });
    });
    
    // Convert to final format
    const result: Record<string, any> = {};
    Object.entries(breakdown).forEach(([criteria, data]) => {
      result[criteria] = {
        totalAdjustments: data.totalAdjustments,
        averageVariance: data.totalVariance / data.totalAdjustments,
        mostCommonReason: Object.entries(data.reasons).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'unknown'
      };
    });
    
    return result;
  };

  const calculateManagerPerformance = (corrections: any[]) => {
    const managerMap = new Map();
    
    corrections.forEach(correction => {
      const managerId = correction.manager_id;
      const managerName = correction.profiles?.name || 'Unknown';
      
      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          managerId,
          managerName,
          totalCorrections: 0,
          totalVariance: 0,
          highVarianceCount: 0
        });
      }
      
      const manager = managerMap.get(managerId);
      manager.totalCorrections++;
      manager.totalVariance += correction.score_variance;
      if (correction.high_variance) manager.highVarianceCount++;
    });
    
    return Array.from(managerMap.values()).map(manager => ({
      ...manager,
      averageVariance: manager.totalVariance / manager.totalCorrections
    }));
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 1.5) return 'text-red-600';
    if (variance > 1.0) return 'text-orange-600';
    if (variance > 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getVarianceBadgeVariant = (variance: number) => {
    if (variance > 1.5) return 'destructive';
    if (variance > 1.0) return 'outline';
    return 'secondary';
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      'too_lenient': 'Too Lenient',
      'too_strict': 'Too Strict',
      'missed_context': 'Missed Context',
      'inaccurate_assessment': 'Inaccurate Assessment',
      'bias_detected': 'Bias Detected',
      'missing_criteria': 'Missing Criteria',
      'other': 'Other'
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Feedback Analytics</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">No feedback corrections found for the selected time period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Analytics</h2>
          <p className="text-gray-600">AI vs Manager scoring alignment trends</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Corrections</p>
                <p className="text-2xl font-bold">{data.totalCorrections}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Variance</p>
                <p className="text-2xl font-bold text-orange-600">{data.highVarianceCorrections}</p>
                <p className="text-xs text-gray-500">
                  {data.totalCorrections > 0 ? 
                    ((data.highVarianceCorrections / data.totalCorrections) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Variance</p>
                <p className="text-2xl font-bold">{data.averageVariance.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alignment Trend</p>
                <p className={cn(
                  "text-2xl font-bold",
                  data.alignmentTrend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {data.alignmentTrend > 0 ? '+' : ''}{data.alignmentTrend.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1">
                  {data.alignmentTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className="text-xs text-gray-500">vs previous period</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Criteria Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Criteria Adjustment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.criteriaBreakdown).map(([criteria, stats]) => (
              <div key={criteria} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{criteria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                  <p className="text-sm text-gray-600">
                    {stats.totalAdjustments} adjustments • Avg variance: {stats.averageVariance.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {stats.mostCommonReason.replace(/_/g, ' ')}
                  </Badge>
                  <div className="w-24">
                    <Progress value={(stats.averageVariance / 2) * 100} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Corrections */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Corrections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentCorrections.map((correction) => (
              <div key={correction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{correction.managerName}</span>
                    <Badge variant="outline" className="text-xs">
                      {getReasonLabel(correction.reason)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {correction.originalScore.toFixed(1)} → {correction.correctedScore.toFixed(1)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getVarianceBadgeVariant(correction.variance)}>
                    {correction.variance.toFixed(2)} variance
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(correction.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manager Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.managerPerformance.map((manager) => (
              <div key={manager.managerId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{manager.managerName}</h4>
                  <p className="text-sm text-gray-600">
                    {manager.totalCorrections} corrections • {manager.highVarianceCount} high variance
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Avg: {manager.averageVariance.toFixed(2)}
                  </Badge>
                  <div className="w-24">
                    <Progress value={(manager.averageVariance / 2) * 100} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackAnalyticsDashboard;
