import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, RefreshCw, Activity, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SystemHealthMetrics {
  errorRate: number;
  avgResponseTime: number;
  activeSessions: number;
  healthScore: 'good' | 'warning' | 'critical';
  lastChecked: string;
}

const HEALTH_LABELS: Record<SystemHealthMetrics['healthScore'], string> = {
  good: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

export function IntegrationHeartbeat() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_system_health_metrics');

        if (rpcError) {
          throw rpcError;
        }

        if (!isMounted) return;

        setMetrics({
          errorRate: Number(data?.errorRate ?? data?.error_rate ?? 0),
          avgResponseTime: Number(data?.avgResponseTime ?? data?.avg_response_time ?? 0),
          activeSessions: Number(data?.activeSessions ?? data?.active_sessions ?? 0),
          healthScore:
            (data?.healthScore ?? data?.health_score ?? 'warning') as SystemHealthMetrics['healthScore'],
          lastChecked: data?.lastChecked ?? data?.last_checked ?? new Date().toISOString(),
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch system health metrics:', err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMetrics(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleViewIntegrations = () => {
    navigate('/admin/integrations');
  };

  const healthBadgeVariant = metrics?.healthScore ?? 'warning';

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-eci-gray-400" />
          <h3 className="text-body font-semibold text-eci-gray-900">Integration Health</h3>
        </div>
        <div className="flex items-center gap-2 text-caption text-eci-gray-500">
          <button
            onClick={handleViewIntegrations}
            className="inline-flex items-center gap-1 text-eci-red hover:text-eci-red-dark"
            aria-label="Open integrations"
          >
            Manage
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-eci-red-light bg-eci-red/10 px-3 py-2 text-caption text-eci-red-dark">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-eci-gray-200 bg-eci-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-caption text-eci-gray-600">Overall Health</span>
            <Badge
              className={
                healthBadgeVariant === 'good'
                  ? 'bg-eci-teal/10 text-eci-teal-dark'
                  : healthBadgeVariant === 'warning'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-eci-red/10 text-eci-red-dark'
              }
            >
              {HEALTH_LABELS[healthBadgeVariant]}
            </Badge>
          </div>
          <p className="mt-3 text-display text-eci-gray-900">
            {metrics ? `${metrics.activeSessions} active integrations` : '--'}
          </p>
          <p className="mt-1 text-body-small text-eci-gray-500">
            {metrics
              ? `Checked ${new Date(metrics.lastChecked).toLocaleTimeString()}`
              : 'Awaiting latest status'}
          </p>
        </div>

        <div className="rounded-xl border border-eci-gray-200 p-4">
          <div className="flex items-center gap-2 text-caption text-eci-gray-600">
            <Activity className="h-4 w-4" />
            Runtime metrics
          </div>
          <div className="mt-3 space-y-2">
            <MetricRow label="Error rate" value={metrics ? `${metrics.errorRate.toFixed(2)}%` : '--'} />
            <MetricRow
              label="Avg response"
              value={metrics ? `${metrics.avgResponseTime.toFixed(2)}s` : '--'}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-eci-gray-200 p-4">
        <div>
          <p className="text-body-small font-medium text-eci-gray-900">Refresh health metrics</p>
          <p className="text-caption text-eci-gray-500">Pull the latest integration heartbeat data.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-eci-gray-200 px-3 py-2 text-caption text-eci-gray-700 hover:text-eci-gray-900"
          onClick={async () => {
            setLoading(true);
            try {
              const { data, error: rpcError } = await supabase.rpc('get_system_health_metrics');
              if (rpcError) {
                throw rpcError;
              }
              setMetrics({
                errorRate: Number(data?.errorRate ?? data?.error_rate ?? 0),
                avgResponseTime: Number(data?.avgResponseTime ?? data?.avg_response_time ?? 0),
                activeSessions: Number(data?.activeSessions ?? data?.active_sessions ?? 0),
                healthScore:
                  (data?.healthScore ?? data?.health_score ?? 'warning') as SystemHealthMetrics['healthScore'],
                lastChecked: data?.lastChecked ?? data?.last_checked ?? new Date().toISOString(),
              });
              setError(null);
            } catch (err) {
              console.error('Manual system health refresh failed:', err);
              setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </Card>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between text-caption">
      <span className="text-eci-gray-500">{label}</span>
      <span className="font-medium text-eci-gray-900">{value}</span>
    </div>
  );
}
