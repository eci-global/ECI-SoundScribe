import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import type { AdminKpis } from '@/types/supabase-functions';

export interface KpiMetrics {
  totalUsers: number;
  totalRecordings: number;
  totalAiMoments: number;
  avgCoachingScore: number;
  activeUsers: number;
  recentUploads: number;
  systemHealth: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const determineSystemHealth = (
  health: AdminKpis['systemHealth'] | undefined,
  activeUsers: number
): 'good' | 'warning' | 'critical' => {
  if (!health) {
    if (activeUsers === 0) return 'critical';
    if (activeUsers < 3) return 'warning';
    return 'good';
  }

  const total = isFiniteNumber(health.totalRecordings) ? health.totalRecordings : 0;
  const failed = isFiniteNumber(health.failedRecordings) ? health.failedRecordings : 0;
  const processing = isFiniteNumber(health.processingRecordings) ? health.processingRecordings : 0;
  const successRate = isFiniteNumber(health.successRate) ? health.successRate : 0;

  if (successRate < 50 || (total > 0 && failed / total > 0.25)) {
    return 'critical';
  }

  if (
    successRate < 75 ||
    (total > 0 && failed / total > 0.15) ||
    (total > 0 && processing / total > 0.4)
  ) {
    return 'warning';
  }

  if (activeUsers === 0) return 'critical';
  if (activeUsers < 3) return 'warning';

  return 'good';
};

const fetchAiMomentsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('ai_moments')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('AI moments count error:', error);
    return 0;
  }

  return count ?? 0;
};

const fetchAverageCoachingScore = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('recordings')
    .select('coaching_evaluation')
    .not('coaching_evaluation', 'is', null);

  if (error) {
    console.error('Coaching evaluation fetch error:', error);
    return 0;
  }

  if (!data?.length) {
    return 0;
  }

  const scores = data
    .map(record => {
      try {
        const evaluation =
          typeof record.coaching_evaluation === 'string'
            ? JSON.parse(record.coaching_evaluation)
            : record.coaching_evaluation;
        const score = evaluation?.overallScore;
        return typeof score === 'number' ? score : 0;
      } catch {
        return 0;
      }
    })
    .filter(score => score > 0);

  if (!scores.length) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const fetchManualEngagementMetrics = async () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  const [activeUsersResult, recentUploadsResult, totalUsersResult] = await Promise.all([
    supabase.from('recordings').select('user_id').gte('created_at', weekAgoIso),
    supabase
      .from('recordings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgoIso),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ]);

  if (activeUsersResult.error) {
    console.error('Active users fetch error:', activeUsersResult.error);
  }

  if (recentUploadsResult.error) {
    console.error('Recent uploads count error:', recentUploadsResult.error);
  }

  if (totalUsersResult.error) {
    console.error('Total users count error:', totalUsersResult.error);
  }

  const uniqueActiveUsers = new Set(
    activeUsersResult.data?.map(record => record.user_id).filter(Boolean) ?? []
  );

  return {
    activeUsers: uniqueActiveUsers.size,
    recentUploads: recentUploadsResult.count ?? 0,
    totalUsers: totalUsersResult.count ?? 0
  };
};

const hasRequiredKpiFields = (kpis: AdminKpis) => {
  const totalUsers = isFiniteNumber(kpis.repAdoption?.totalUsers);
  const activeUsers =
    isFiniteNumber(kpis.repAdoption?.weeklyActiveUsers) ||
    isFiniteNumber(kpis.repAdoption?.activeUsers);
  const recentUploads =
    isFiniteNumber(kpis.instantSummaries?.last7Days) ||
    isFiniteNumber(kpis.instantSummaries?.total);
  const totalRecordings =
    isFiniteNumber(kpis.systemHealth?.totalRecordings) ||
    isFiniteNumber(kpis.instantSummaries?.total);

  return totalUsers && activeUsers && recentUploads && totalRecordings;
};

export const useKpiMetrics = () => {
  const { isAdmin } = useUserRole();
  const [metrics, setMetrics] = useState<KpiMetrics>({
    totalUsers: 0,
    totalRecordings: 0,
    totalAiMoments: 0,
    avgCoachingScore: 0,
    activeUsers: 0,
    recentUploads: 0,
    systemHealth: 'good',
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricsManually = async () => {
    try {
      const [totalRecordingsResult, totalAiMoments, avgCoachingScore, engagement] =
        await Promise.all([
          supabase.from('recordings').select('id', { count: 'exact', head: true }),
          fetchAiMomentsCount(),
          fetchAverageCoachingScore(),
          fetchManualEngagementMetrics()
        ]);

      if (totalRecordingsResult.error) {
        throw totalRecordingsResult.error;
      }

      setMetrics(prev => ({
        ...prev,
        totalUsers: engagement.totalUsers,
        totalRecordings: totalRecordingsResult.count ?? 0,
        totalAiMoments,
        avgCoachingScore,
        activeUsers: engagement.activeUsers,
        recentUploads: engagement.recentUploads,
        systemHealth: determineSystemHealth(undefined, engagement.activeUsers),
        lastUpdated: new Date()
      }));

      setError(null);
    } catch (err) {
      console.error('Error in manual metrics fetch:', err);
      setError('Failed to load metrics');
    }
  };

  const fetchMetrics = async () => {
    if (!isAdmin) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data: kpiData, error: kpiError } = await supabase.rpc('calculate_admin_kpis');

      if (kpiError) {
        console.error('KPI function error:', kpiError);
        await fetchMetricsManually();
        return;
      }

      const kpis = (kpiData ?? {}) as AdminKpis;

      if (!hasRequiredKpiFields(kpis)) {
        console.warn('Invalid KPI data format, falling back to manual calculation');
        await fetchMetricsManually();
        return;
      }

      const [totalAiMoments, avgCoachingScore] = await Promise.all([
        fetchAiMomentsCount(),
        fetchAverageCoachingScore()
      ]);

      const totalUsers = isFiniteNumber(kpis.repAdoption?.totalUsers)
        ? kpis.repAdoption!.totalUsers
        : 0;

      const activeUsers = isFiniteNumber(kpis.repAdoption?.weeklyActiveUsers)
        ? kpis.repAdoption!.weeklyActiveUsers
        : isFiniteNumber(kpis.repAdoption?.activeUsers)
        ? kpis.repAdoption!.activeUsers
        : 0;

      const recentUploads = isFiniteNumber(kpis.instantSummaries?.last7Days)
        ? kpis.instantSummaries!.last7Days
        : 0;

      const totalRecordings = isFiniteNumber(kpis.systemHealth?.totalRecordings)
        ? kpis.systemHealth!.totalRecordings
        : isFiniteNumber(kpis.instantSummaries?.total)
        ? kpis.instantSummaries!.total
        : 0;

      const systemHealth = determineSystemHealth(kpis.systemHealth, activeUsers);

      setMetrics({
        totalUsers,
        totalRecordings,
        totalAiMoments,
        avgCoachingScore,
        activeUsers,
        recentUploads,
        systemHealth,
        lastUpdated: kpis.lastUpdated ? new Date(kpis.lastUpdated) : new Date()
      });
    } catch (err) {
      console.error('Error fetching KPI metrics:', err);
      setError('Failed to load KPI metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [isAdmin]);

  const refreshMetrics = () => {
    setLoading(true);
    fetchMetrics();
  };

  return {
    data: metrics,
    metrics,
    loading,
    error,
    refreshMetrics,
    refreshKpis: refreshMetrics,
    lastUpdated: metrics.lastUpdated
  };
};
