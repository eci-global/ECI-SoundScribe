import React, { useState, useEffect, useMemo } from 'react';
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

interface FeedbackCorrection {
  id: string;
  recordingId: string;
  managerName: string;
  originalScore: number;
  correctedScore: number;
  variance: number;
  reason: string;
  createdAt: string;
  highVariance: boolean;
}

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
  corrections: FeedbackCorrection[];
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
  const [recentPage, setRecentPage] = useState(0);

  const RECENT_PAGE_SIZE = 10;
  const MAX_ANALYTICS_RECORDS = 500;

  useEffect(() => {
    loadAnalyticsData();
    setRecentPage(0);
  }, [timeRange, selectedManager]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Check if we're in demo mode (no database tables)
      const isDemoMode = false; // Tables exist, so we can use real data
      
      if (isDemoMode) {
        // Demo mode - generate mock analytics data
        console.log('🎭 Demo Mode: Loading mock analytics data');
        
        const mockData: FeedbackAnalyticsData = {
          totalCorrections: 15,
          highVarianceCorrections: 3,
          averageVariance: 0.8,
          alignmentTrend: 12.5,
          criteriaBreakdown: {
            opening: {
              totalAdjustments: 8,
              averageVariance: 0.6,
              mostCommonReason: 'too_lenient'
            },
            objection_handling: {
              totalAdjustments: 12,
              averageVariance: 1.2,
              mostCommonReason: 'missed_context'
            },
            qualification: {
              totalAdjustments: 6,
              averageVariance: 0.4,
              mostCommonReason: 'too_strict'
            },
            tone_and_energy: {
              totalAdjustments: 4,
              averageVariance: 0.3,
              mostCommonReason: 'inaccurate_assessment'
            }
          },
          corrections: [
            {
              id: 'demo-1',
              recordingId: 'demo-recording-1',
              managerName: 'Sarah Johnson',
              originalScore: 2.8,
              correctedScore: 3.2,
              variance: 0.4,
              reason: 'too_lenient',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              highVariance: false
            },
            {
              id: 'demo-2',
              recordingId: 'demo-recording-2',
              managerName: 'Mike Chen',
              originalScore: 3.5,
              correctedScore: 2.8,
              variance: 0.7,
              reason: 'missed_context',
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              highVariance: false
            },
            {
              id: 'demo-3',
              recordingId: 'demo-recording-3',
              managerName: 'Lisa Rodriguez',
              originalScore: 2.1,
              correctedScore: 3.0,
              variance: 0.9,
              reason: 'too_strict',
              createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
              highVariance: false
            }
          ],
          managerPerformance: [
            {
              managerId: 'demo-manager-1',
              managerName: 'Sarah Johnson',
              totalCorrections: 8,
              averageVariance: 0.6,
              highVarianceCount: 1
            },
            {
              managerId: 'demo-manager-2',
              managerName: 'Mike Chen',
              totalCorrections: 5,
              averageVariance: 0.9,
              highVarianceCount: 2
            },
            {
              managerId: 'demo-manager-3',
              managerName: 'Lisa Rodriguez',
              totalCorrections: 2,
              averageVariance: 0.4,
              highVarianceCount: 0
            }
          ]
        };

        setData(mockData);
        setLoading(false);
        return;
      }

      // Calculate date range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build query filters (commented out since we're in demo mode)
      // let query = supabase
      //   .from('manager_feedback_corrections')
      //   .select(`
      //     id,
      //     recording_id,
      //     manager_id,
      //     change_reason,
      //     score_variance,
      //     high_variance,
      //     corrected_overall_score,
      //     original_overall_score,
      //     criteria_adjustments,
      //     original_ai_scores,
      //     created_at,
      //     profiles!manager_feedback_corrections_manager_id_fkey(name)
      //   `, { count: 'exact' })
      //   .gte('created_at', startDate.toISOString())
      //   .order('created_at', { ascending: false })
      //   .range(0, MAX_ANALYTICS_RECORDS - 1);

      // if (selectedManager !== 'all') {
      //   query = query.eq('manager_id', selectedManager);
      // }

      // const { data: corrections, error, count } = await query;

      // if (error) throw error;

      // Process analytics data (commented out since we're in demo mode)
      // const normalizedCorrections: FeedbackCorrection[] = (corrections || []).map((c: any) => ({
      //   id: c.id,
      //   recordingId: c.recording_id,
      //   managerName: c.profiles?.name || 'Unknown',
      //   originalScore: c.original_overall_score ?? 0,
      //   correctedScore: c.corrected_overall_score ?? 0,
      //   variance: c.score_variance ?? Math.abs((c.corrected_overall_score ?? 0) - (c.original_overall_score ?? 0)),
      //   reason: c.change_reason,
      //   createdAt: c.created_at,
      //   highVariance: Boolean(c.high_variance)
      // }));

      // const totalCorrections = typeof count === 'number' ? count : normalizedCorrections.length;

      // const analyticsData: FeedbackAnalyticsData = {
      //   totalCorrections,
      //   highVarianceCorrections: normalizedCorrections.filter(c => c.highVariance).length,
      //   averageVariance: normalizedCorrections.length > 0
      //     ? normalizedCorrections.reduce((sum, c) => sum + c.variance, 0) / normalizedCorrections.length
      //     : 0,
      //   alignmentTrend: calculateAlignmentTrend(normalizedCorrections),
      //   criteriaBreakdown: calculateCriteriaBreakdown(corrections || []),
      //   corrections: normalizedCorrections,
      //   managerPerformance: calculateManagerPerformance(corrections || [])
      // };

      // setData(analyticsData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAlignmentTrend = (corrections: FeedbackCorrection[]) => {
    if (corrections.length < 2) return 0;
    
    const recent = corrections.slice(0, Math.floor(corrections.length / 2));
    const older = corrections.slice(Math.floor(corrections.length / 2));
    
    const recentAvg = recent.reduce((sum, c) => sum + c.variance, 0) / recent.length;
    const olderAvg = older.reduce((sum, c) => sum + c.variance, 0) / older.length;
    
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

  // Move useMemo hooks to the top to avoid conditional hook calls
  const pagedCorrections = useMemo(() => {
    if (!data) return [];
    const start = recentPage * RECENT_PAGE_SIZE;
    const end = start + RECENT_PAGE_SIZE;
    return data.corrections.slice(start, end);
  }, [data, recentPage]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.corrections.length / RECENT_PAGE_SIZE));
  }, [data]);

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
          <div className="mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              🎭 Demo Mode
            </Badge>
          </div>
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
            {pagedCorrections.map((correction) => (
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
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              Showing {pagedCorrections.length === 0 ? 0 : recentPage * RECENT_PAGE_SIZE + 1} -
              {recentPage * RECENT_PAGE_SIZE + pagedCorrections.length} of {data.corrections.length} (latest {MAX_ANALYTICS_RECORDS} records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentPage(prev => Math.max(0, prev - 1))}
                disabled={recentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {recentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={recentPage >= totalPages - 1}
              >
                Next
              </Button>
            </div>
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
