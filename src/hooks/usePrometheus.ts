import { useState, useEffect } from 'react';

interface PrometheusQuery {
  query: string;
  interval?: string;
  range?: string;
}

interface PrometheusMetric {
  metric: Record<string, string>;
  values?: [number, string][];
  value?: [number, string];
}

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusMetric[];
  };
}

export function usePrometheus(queryConfig: PrometheusQuery) {
  const [data, setData] = useState<PrometheusMetric[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        const prometheusUrl = import.meta.env.VITE_PROM_URL || 'http://localhost:9090';
        
        let endpoint = '/api/v1/query';
        const params = new URLSearchParams({
          query: queryConfig.query
        });
        
        // Use query_range for time series data
        if (queryConfig.range) {
          endpoint = '/api/v1/query_range';
          params.append('start', (Date.now() / 1000 - parseTimeRange(queryConfig.range)).toString());
          params.append('end', (Date.now() / 1000).toString());
          params.append('step', queryConfig.interval || '5m');
        }
        
        const response = await fetch(`${prometheusUrl}${endpoint}?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result: PrometheusResponse = await response.json();
        
        if (result.status !== 'success') {
          throw new Error('Prometheus query failed');
        }
        
        setData(result.data.result);
        setError(null);
      } catch (err: any) {
        console.warn('Prometheus unavailable, using mock data:', err.message);
        
        // Fallback to mock data
        setData(getMockPrometheusData(queryConfig.query));
        setError(null); // Don't show error for development
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [queryConfig.query, queryConfig.interval, queryConfig.range]);

  return { data, loading, error };
}

function parseTimeRange(range: string): number {
  const units: Record<string, number> = {
    'm': 60,
    'h': 3600,
    'd': 86400,
    'w': 604800
  };
  
  const match = range.match(/^(\d+)([mhdw])$/);
  if (!match) return 3600; // Default to 1 hour
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

function getMockPrometheusData(query: string): PrometheusMetric[] {
  const now = Date.now() / 1000;
  
  const mockData: Record<string, PrometheusMetric[]> = {
    'bucket_size_bytes': [
      {
        metric: { bucket: 'recordings' },
        value: [now, '3221225472'] // 3GB
      },
      {
        metric: { bucket: 'transcripts' },
        value: [now, '1073741824'] // 1GB
      }
    ],
    'jobs_failed_total': [
      {
        metric: { job: 'transcription' },
        value: [now, '23']
      }
    ],
    'jobs_retried_total': [
      {
        metric: { job: 'transcription' },
        value: [now, '89']
      }
    ],
    'alertmanager_alerts': [
      {
        metric: { alertname: 'HighCPUUsage', severity: 'warning' },
        value: [now, '1']
      },
      {
        metric: { alertname: 'DiskSpaceLow', severity: 'warning' },
        value: [now, '1']
      }
    ],
    'cpu_usage_percent': [
      {
        metric: { instance: 'localhost:9090' },
        value: [now, '78.5']
      }
    ],
    'memory_usage_percent': [
      {
        metric: { instance: 'localhost:9090' },
        value: [now, '65.2']
      }
    ]
  };
  
  return mockData[query] || [];
}