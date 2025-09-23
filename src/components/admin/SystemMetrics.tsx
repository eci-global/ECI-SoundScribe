
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react';

interface SystemMetricsProps {
  className?: string;
  showTrends?: boolean;
  compact?: boolean;
}

export default function SystemMetrics({ className = '', showTrends = true, compact = false }: SystemMetricsProps) {
  const { summaries, loading, fetchMetrics } = useSystemMetrics();
  const { systemStatus, loading: healthLoading } = useSystemHealth();

  const getTrendIcon = (trend: string, trendValue: number) => {
    if (trend === 'up') {
      return <TrendingUp className={`h-4 w-4 ${Math.abs(trendValue) > 10 ? 'text-red-600' : 'text-green-600'}`} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`h-4 w-4 ${Math.abs(trendValue) > 10 ? 'text-red-600' : 'text-green-600'}`} />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'text-green-600 bg-green-100',
      warning: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getMetricIcon = (metricName: string) => {
    const icons: Record<string, any> = {
      'CPU Usage': Cpu,
      'Memory Usage': HardDrive,
      'Storage Usage': Database,
      'Database Connections': Database,
      'API Requests': Wifi,
      'Error Rate': Activity,
      'Active Users': Users,
      'Processing Jobs': Activity
    };
    return icons[metricName] || Activity;
  };

  if (loading || healthLoading) {
    return (
      <div className={`mb-8 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-title text-eci-gray-900">System Metrics</h2>
          <RefreshCw className="h-5 w-5 text-eci-gray-400 animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-eci-gray-200 animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-eci-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-eci-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-eci-gray-200 rounded w-full"></div>
                  <div className="h-6 bg-eci-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className={`mb-8 ${className}`}>
        <h2 className="text-title text-eci-gray-900 mb-6">System Metrics</h2>
        <Card className="border-eci-gray-200">
          <CardContent className="p-6 text-center">
            <p className="text-eci-gray-600">No metrics available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-title text-eci-gray-900">System Metrics</h2>
          {!compact && (
            <p className="text-body-small text-eci-gray-600 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-caption text-eci-gray-600">Live</span>
          </div>
          <button 
            onClick={fetchMetrics}
            className="text-eci-gray-600 hover:text-eci-gray-900 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className={`grid gap-6 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {summaries.map((metric) => {
          const Icon = getMetricIcon(metric.name);
          const status = metric.current > 80 ? 'critical' : metric.current > 60 ? 'warning' : 'healthy';
          
          return (
            <Card key={metric.name} className="border-eci-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className={compact ? "pb-2" : "pb-3"}>
                <CardTitle className={`${compact ? 'text-body' : 'text-body-large'} text-eci-gray-900 flex items-center gap-2`}>
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {metric.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-body-small text-eci-gray-600">Current</span>
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-eci-gray-900">
                        {metric.current.toFixed(1)}{metric.unit}
                      </span>
                      {showTrends && (
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend, metric.change)}
                          <span className="text-caption text-eci-gray-600">
                            {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {metric.unit === '%' && (
                    <div className="space-y-1">
                      <div className="w-full bg-eci-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            status === 'healthy' ? 'bg-green-500' :
                            status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(metric.current, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge className={`${getStatusColor(status)} border-0`}>
                      {status}
                    </Badge>
                    
                    {!compact && (
                      <span className="text-xs text-eci-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {!compact && systemStatus && (
        <Card className="mt-6 border-eci-gray-200">
          <CardHeader>
            <CardTitle className="text-body-large text-eci-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4" />
              System Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-body-small text-eci-gray-600">Overall Status</div>
                <div className={`text-body font-semibold ${
                  systemStatus.status === 'healthy' ? 'text-green-600' :
                  systemStatus.status === 'degraded' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {systemStatus.status.charAt(0).toUpperCase() + systemStatus.status.slice(1)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-body-small text-eci-gray-600">Services Healthy</div>
                <div className="text-body font-semibold text-eci-gray-900">
                  {systemStatus.services?.filter(s => s.status === 'healthy').length || 0} / {systemStatus.services?.length || 0}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-body-small text-eci-gray-600">System Uptime</div>
                <div className="text-body font-semibold text-green-600">
                  {systemStatus.uptime ? systemStatus.uptime.toFixed(1) : '99.9'}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
