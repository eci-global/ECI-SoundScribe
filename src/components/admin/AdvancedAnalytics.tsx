
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  AlertTriangle,
  Users,
  FileText,
  HardDrive,
  Zap,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';

interface AdvancedAnalyticsProps {
  className?: string;
}

export function AdvancedAnalytics({ className = '' }: AdvancedAnalyticsProps) {
  const { analytics, loading, error, refetchAnalytics } = useAdvancedAnalytics();

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatPercentChange = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Advanced Analytics</h2>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Analytics</h2>
          </div>
          <p className="text-red-800 mb-4">Failed to load analytics</p>
          <Button onClick={refetchAnalytics} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">System Analytics</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Analytics Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium text-gray-900">Total Recordings</h3>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {analytics.totalRecordings}
          </div>
          <div className="text-sm text-gray-600">All time</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <h3 className="font-medium text-gray-900">Avg Duration</h3>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Math.round(analytics.averageDuration / 60)}m
          </div>
          <div className="text-sm text-gray-600">Per recording</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <h3 className="font-medium text-gray-900">Completion Rate</h3>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Math.round(analytics.completionRate)}%
          </div>
          <div className="text-sm text-gray-600">Successfully processed</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <h3 className="font-medium text-gray-900">User Engagement</h3>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Math.round(analytics.userEngagement)}%
          </div>
          <div className="text-sm text-gray-600">Active users</div>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">System Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analytics.totalRecordings}
            </div>
            <div className="text-sm text-gray-600">Total Recordings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(analytics.completionRate)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(analytics.averageDuration / 60)}
            </div>
            <div className="text-sm text-gray-600">Avg Duration (min)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(analytics.userEngagement)}%
            </div>
            <div className="text-sm text-gray-600">User Engagement</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
