import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrometheus } from '@/hooks/usePrometheus';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface Alert {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  value: number;
  threshold: number;
  status: 'firing' | 'resolved';
  startTime: string;
  endTime?: string;
  description: string;
}

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  status: 'healthy' | 'warning' | 'critical';
}

export default function SystemActivity() {
  const { data: promData } = usePrometheus({ 
    query: 'alertmanager_alerts',
    interval: '1m'
  });

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      name: 'High CPU Usage',
      severity: 'warning',
      metric: 'cpu_usage_percent',
      value: 78,
      threshold: 75,
      status: 'firing',
      startTime: '2025-01-20T11:30:00Z',
      description: 'CPU usage has exceeded 75% threshold'
    },
    {
      id: '2',
      name: 'Storage Space Low',
      severity: 'warning',
      metric: 'disk_free_percent',
      value: 15,
      threshold: 20,
      status: 'firing',
      startTime: '2025-01-20T10:00:00Z',
      description: 'Free disk space below 20%'
    },
    {
      id: '3',
      name: 'API Response Time',
      severity: 'info',
      metric: 'api_response_time_ms',
      value: 450,
      threshold: 500,
      status: 'resolved',
      startTime: '2025-01-20T09:15:00Z',
      endTime: '2025-01-20T09:45:00Z',
      description: 'API response time normalized'
    },
    {
      id: '4',
      name: 'Database Connection Pool',
      severity: 'critical',
      metric: 'db_connections_used',
      value: 95,
      threshold: 90,
      status: 'firing',
      startTime: '2025-01-20T12:00:00Z',
      description: 'Database connection pool near exhaustion'
    }
  ]);

  const [systemMetrics] = useState<SystemMetric[]>([
    { name: 'CPU Usage', value: 78, unit: '%', trend: 'up', trendValue: 12, status: 'warning' },
    { name: 'Memory Usage', value: 65, unit: '%', trend: 'stable', trendValue: 1, status: 'healthy' },
    { name: 'Disk I/O', value: 234, unit: 'MB/s', trend: 'up', trendValue: 45, status: 'healthy' },
    { name: 'Network Traffic', value: 1.2, unit: 'GB/h', trend: 'down', trendValue: -15, status: 'healthy' },
    { name: 'API Requests', value: 4523, unit: 'req/min', trend: 'up', trendValue: 23, status: 'healthy' },
    { name: 'Error Rate', value: 0.3, unit: '%', trend: 'down', trendValue: -0.1, status: 'healthy' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => prev.map(alert => {
        if (alert.status === 'firing' && Math.random() > 0.8) {
          return {
            ...alert,
            status: 'resolved',
            endTime: new Date().toISOString()
          };
        }
        return alert;
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: { icon: XCircle, color: 'text-red-600' },
      warning: { icon: AlertTriangle, color: 'text-orange-600' },
      info: { icon: CheckCircle, color: 'text-blue-600' }
    };
    const config = icons[severity as keyof typeof icons];
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-orange-100 text-orange-800',
      info: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[severity as keyof typeof variants]}>{severity}</Badge>;
  };

  const getTrendIcon = (trend: string, trendValue: number) => {
    if (trend === 'up') {
      return <TrendingUp className={`h-4 w-4 ${trendValue > 10 ? 'text-red-600' : 'text-green-600'}`} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`h-4 w-4 ${trendValue < -10 ? 'text-red-600' : 'text-green-600'}`} />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'text-green-600',
      warning: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const activeAlerts = alerts.filter(a => a.status === 'firing');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">System Activity</h1>
            <p className="text-body text-eci-gray-600">Real-time system monitoring, alerts, and activity tracking</p>
          </div>

          {/* Alert Summary */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Alerts</p>
                  <p className="text-title-large font-semibold text-red-600">{activeAlerts.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Critical</p>
                  <p className="text-title-large font-semibold text-red-600">
                    {activeAlerts.filter(a => a.severity === 'critical').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Warnings</p>
                  <p className="text-title-large font-semibold text-orange-600">
                    {activeAlerts.filter(a => a.severity === 'warning').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Resolved (24h)</p>
                  <p className="text-title-large font-semibold text-green-600">{resolvedAlerts.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>
          </div>

          {/* System Metrics Grid */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <h2 className="text-title font-semibold text-eci-gray-900 mb-4">System Metrics</h2>
            <div className="grid grid-cols-3 gap-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="border border-eci-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-caption text-eci-gray-600">{metric.name}</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend, metric.trendValue)}
                      <span className="text-caption text-eci-gray-600">
                        {metric.trendValue > 0 ? '+' : ''}{metric.trendValue}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-title-large font-semibold ${getStatusColor(metric.status)}`}>
                      {metric.value}
                    </span>
                    <span className="text-body-small text-eci-gray-600">{metric.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Alerts */}
          <Card className="bg-white shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title font-semibold text-eci-gray-900">Active Alerts</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-caption text-eci-gray-600">Live</span>
              </div>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-body text-eci-gray-600">No active alerts</p>
                <p className="text-body-small text-eci-gray-500 mt-1">All systems operating normally</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-body font-semibold text-eci-gray-900">{alert.name}</h3>
                            {getSeverityBadge(alert.severity)}
                            <Badge variant="outline" className="text-xs">
                              {alert.metric}
                            </Badge>
                          </div>
                          <p className="text-body-small text-eci-gray-600 mb-2">{alert.description}</p>
                          <div className="flex items-center gap-4 text-caption text-eci-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started {new Date(alert.startTime).toLocaleTimeString()}
                            </div>
                            <div>
                              Current: <span className="font-medium text-eci-gray-900">{alert.value}</span>
                              {' / '}
                              Threshold: <span className="font-medium">{alert.threshold}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">Firing</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Resolved Alerts */}
          {resolvedAlerts.length > 0 && (
            <Card className="bg-white shadow-sm p-6">
              <h2 className="text-title font-semibold text-eci-gray-900 mb-4">Recently Resolved</h2>
              <div className="space-y-2">
                {resolvedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between py-2 border-b border-eci-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-body text-eci-gray-900">{alert.name}</span>
                      <span className="text-caption text-eci-gray-600">
                        Duration: {alert.endTime && (
                          Math.round((new Date(alert.endTime).getTime() - new Date(alert.startTime).getTime()) / 60000)
                        )} minutes
                      </span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}