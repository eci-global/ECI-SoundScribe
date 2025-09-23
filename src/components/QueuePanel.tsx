import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ListOrdered, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgWaitTime: number; // seconds
  avgProcessTime: number; // seconds
}

const DEFAULT_QUEUE_STATS: QueueStats = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  avgWaitTime: 0,
  avgProcessTime: 0,
};

export function QueuePanel() {
  const [queueStats, setQueueStats] = useState<QueueStats>(DEFAULT_QUEUE_STATS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchQueueStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('bdr_batch_processing_jobs')
          .select('status, created_at, start_time, end_time, updated_at')
          .order('created_at', { ascending: false })
          .limit(200);

        if (queryError) {
          throw queryError;
        }

        const stats = data?.reduce<{
          pending: number;
          processing: number;
          completed: number;
          failed: number;
          waitTimes: number[];
          processTimes: number[];
        }>(
          (acc, job) => {
            const status = job.status || 'pending';
            if (status === 'pending') acc.pending += 1;
            if (status === 'running') acc.processing += 1;
            if (status === 'completed') acc.completed += 1;
            if (status === 'failed' || status === 'cancelled') acc.failed += 1;

          if (job.start_time && job.created_at) {
            const wait =
                (new Date(job.start_time).getTime() - new Date(job.created_at).getTime()) /
                1000;
            if (wait > 0) acc.waitTimes.push(wait);
          }

          if (job.end_time && job.start_time) {
            const duration =
                (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) /
                1000;
            if (duration > 0) acc.processTimes.push(duration);
          }

            return acc;
          },
          {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            waitTimes: [],
            processTimes: [],
          }
        );

        if (!isMounted) return;

        setQueueStats({
          pending: stats?.pending ?? 0,
          processing: stats?.processing ?? 0,
          completed: stats?.completed ?? 0,
          failed: stats?.failed ?? 0,
          avgWaitTime: average(stats?.waitTimes ?? []),
          avgProcessTime: average(stats?.processTimes ?? []),
        });
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to fetch queue stats:', err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setQueueStats(DEFAULT_QUEUE_STATS);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const totalJobs =
    queueStats.pending + queueStats.processing + queueStats.completed + queueStats.failed;
  const successRate = totalJobs > 0 ? (queueStats.completed / totalJobs) * 100 : 100;

  const handleManualRefresh = async () => {
    setLoading(true);
    setLastUpdated(null);
    setError(null);
    // Re-run effect by calling supabase directly
    try {
        const { data, error: queryError } = await supabase
        .from('bdr_batch_processing_jobs')
        .select('status, created_at, start_time, end_time, updated_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (queryError) {
        throw queryError;
      }

      const stats = data?.reduce<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        waitTimes: number[];
        processTimes: number[];
      }>(
        (acc, job) => {
          const status = job.status || 'pending';
          if (status === 'pending') acc.pending += 1;
          if (status === 'running') acc.processing += 1;
          if (status === 'completed') acc.completed += 1;
          if (status === 'failed' || status === 'cancelled') acc.failed += 1;

        if (job.start_time && job.created_at) {
          const wait =
              (new Date(job.start_time).getTime() - new Date(job.created_at).getTime()) / 1000;
          if (wait > 0) acc.waitTimes.push(wait);
        }

        if (job.end_time && job.start_time) {
          const duration =
              (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 1000;
          if (duration > 0) acc.processTimes.push(duration);
        }

          return acc;
        },
        {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          waitTimes: [],
          processTimes: [],
        }
      );

      setQueueStats({
        pending: stats?.pending ?? 0,
        processing: stats?.processing ?? 0,
        completed: stats?.completed ?? 0,
        failed: stats?.failed ?? 0,
        avgWaitTime: average(stats?.waitTimes ?? []),
        avgProcessTime: average(stats?.processTimes ?? []),
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Manual queue refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setQueueStats(DEFAULT_QUEUE_STATS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-eci-gray-400" />
          <h3 className="text-body font-semibold text-eci-gray-900">Worker Queue</h3>
        </div>
        <div className="flex items-center gap-2 text-caption text-eci-gray-500">
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button
            className="inline-flex items-center gap-1 text-eci-red hover:text-eci-red-dark"
            onClick={handleManualRefresh}
            disabled={loading}
            aria-label="Refresh queue metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 rounded-lg border border-eci-red-light bg-eci-red/10 px-3 py-2 text-caption text-eci-red-dark">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-caption text-orange-600">Pending</span>
            </div>
            <span className="text-title font-semibold text-orange-700">{queueStats.pending}</span>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ListOrdered className="h-4 w-4 text-blue-600" />
              <span className="text-caption text-blue-600">Processing</span>
            </div>
            <span className="text-title font-semibold text-blue-700">{queueStats.processing}</span>
          </div>
        </div>

        {/* Success Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-caption text-eci-gray-600">Success Rate</span>
            <span className="text-caption font-medium text-eci-gray-900">
              {successRate.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={successRate} 
            className="h-2"
          />
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-caption text-eci-gray-600">Avg Wait Time</span>
            <span className="text-caption font-medium text-eci-gray-900">
              {formatTime(queueStats.avgWaitTime)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-caption text-eci-gray-600">Avg Process Time</span>
            <span className="text-caption font-medium text-eci-gray-900">
              {formatTime(queueStats.avgProcessTime)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-eci-gray-200">
          <div className="grid grid-cols-2 gap-2 text-caption">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-eci-gray-600">Completed:</span>
              <span className="font-medium text-green-600">{queueStats.completed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-600" />
              <span className="text-eci-gray-600">Failed:</span>
              <span className="font-medium text-red-600">{queueStats.failed}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function average(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}
