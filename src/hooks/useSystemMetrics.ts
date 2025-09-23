
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MetricSummary {
  name: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
}

export function useSystemMetrics() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [summaries, setSummaries] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Generate mock metrics since we don't have a real metrics table
      const mockMetrics: SystemMetric[] = [
        {
          id: '1',
          metric_name: 'cpu_usage',
          metric_value: 45.2 + Math.random() * 20,
          timestamp: new Date().toISOString(),
          tags: { host: 'web-server-1' }
        },
        {
          id: '2',
          metric_name: 'memory_usage',
          metric_value: 68.5 + Math.random() * 15,
          timestamp: new Date().toISOString(),
          tags: { host: 'web-server-1' }
        },
        {
          id: '3',
          metric_name: 'disk_usage',
          metric_value: 35.8 + Math.random() * 10,
          timestamp: new Date().toISOString(),
          tags: { host: 'web-server-1' }
        },
        {
          id: '4',
          metric_name: 'network_in',
          metric_value: 1024 + Math.random() * 500,
          timestamp: new Date().toISOString(),
          tags: { host: 'web-server-1' }
        }
      ];

      setMetrics(mockMetrics);

      // Generate summaries
      const mockSummaries: MetricSummary[] = [
        {
          name: 'CPU Usage',
          current: mockMetrics.find(m => m.metric_name === 'cpu_usage')?.metric_value || 0,
          trend: 'stable',
          change: 2.1,
          unit: '%'
        },
        {
          name: 'Memory Usage',
          current: mockMetrics.find(m => m.metric_name === 'memory_usage')?.metric_value || 0,
          trend: 'up',
          change: 5.3,
          unit: '%'
        },
        {
          name: 'Disk Usage',
          current: mockMetrics.find(m => m.metric_name === 'disk_usage')?.metric_value || 0,
          trend: 'down',
          change: -1.2,
          unit: '%'
        },
        {
          name: 'Network In',
          current: mockMetrics.find(m => m.metric_name === 'network_in')?.metric_value || 0,
          trend: 'stable',
          change: 0.8,
          unit: 'KB/s'
        }
      ];

      setSummaries(mockSummaries);

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recordMetric = async (metricName: string, value: number, tags?: Record<string, string>) => {
    try {
      // In a real implementation, this would save to a metrics table
      console.log('Recording metric:', { metricName, value, tags });
      
      // Add to local state for immediate feedback
      const newMetric: SystemMetric = {
        id: crypto.randomUUID(),
        metric_name: metricName,
        metric_value: value,
        timestamp: new Date().toISOString(),
        tags
      };

      setMetrics(prev => [newMetric, ...prev.slice(0, 99)]); // Keep last 100 metrics

    } catch (error) {
      console.error('Error recording metric:', error);
      throw error;
    }
  };

  const getMetricHistory = (metricName: string, hours: number = 24) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return metrics
      .filter(m => m.metric_name === metricName && new Date(m.timestamp) > cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return {
    metrics,
    summaries,
    loading,
    fetchMetrics,
    recordMetric,
    getMetricHistory
  };
}
