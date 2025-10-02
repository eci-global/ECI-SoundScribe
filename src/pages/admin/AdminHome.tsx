
import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { MetricTile } from '@/components/MetricTile';
import { LicenseWidget } from '@/components/LicenseWidget';
import { AuditLogTable } from '@/components/AuditLogTable';
import { QueuePanel } from '@/components/QueuePanel';
import { IntegrationHeartbeat } from '@/components/IntegrationHeartbeat';
import { QuickActions } from '@/components/QuickActions';
import ActivityFeed from '@/components/admin/ActivityFeed';
import NotificationCenter from '@/components/admin/NotificationCenter';
import { OrphanedFilesMonitor } from '@/components/admin/OrphanedFilesMonitor';
import { Button } from '@/components/ui/button';
import { useKpiMetrics } from '@/hooks/useKpiMetrics';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';

export default function AdminHome() {
  const { data: kpiData, loading, error, refreshKpis, lastUpdated } = useKpiMetrics();
  const { sessionInfo, timeoutWarning, extendSession } = useAdminSession();
  const { userRole, isAdmin } = useUserRole();

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
              <p className="text-body text-eci-gray-600">Loading system overview and metrics...</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
          {/* Overview */}
          <section className="bg-white border border-eci-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-body text-eci-gray-600 max-w-3xl">
                  Monitor platform health, oversee user activity, and keep critical automations on track.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {timeoutWarning && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-eci-red/10 text-eci-red-dark border border-eci-red-light rounded-lg">
                    <AlertCircle className="h-4 w-4 text-eci-red" />
                    <span className="text-sm">Session expires in {Math.floor((sessionInfo?.timeUntilTimeout || 0) / 60)}m</span>
                    <Button size="sm" variant="outline" onClick={extendSession}>
                      Extend
                    </Button>
                  </div>
                )}

                {sessionInfo && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-eci-gray-50 border border-eci-gray-200 rounded-lg text-sm text-eci-gray-600">
                    <Shield className="h-4 w-4 text-eci-gray-500" />
                    <span className="font-medium text-eci-gray-800">Session {sessionInfo.sessionId}</span>
                    <Clock className="h-4 w-4 ml-2 text-eci-gray-400" />
                    <span>{Math.floor(sessionInfo.duration / 60)}m active</span>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshKpis}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh metrics
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-eci-red-light bg-eci-red/10 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-eci-red mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-eci-red-dark">{error}</p>
                  <Button size="sm" variant="outline" onClick={refreshKpis} className="mt-3">
                    Retry fetch
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-eci-gray-500">
              {lastUpdated && !loading && (
                <span className="inline-flex items-center gap-2 rounded-full border border-eci-gray-200 bg-eci-gray-50 px-3 py-1">
                  <Clock className="h-4 w-4 text-eci-gray-400" />
                  Last updated {new Date(lastUpdated).toLocaleString()}
                </span>
              )}
              {userRole && (
                <span className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-sm text-eci-gray-900">
                  <Shield className="h-4 w-4 text-brand-red" />
                  {isAdmin ? 'Administrator access' : `Role: ${userRole}`}
                </span>
              )}
            </div>
          </section>

          {/* Metrics */}
          <section>
            <div className="flex flex-col gap-2 mb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-title text-eci-gray-900">Key Metrics</h2>
                <p className="text-body-small text-eci-gray-500">Live performance indicators across the organization.</p>
              </div>
              <span className="text-caption text-eci-gray-500">Auto-refreshes every 5 minutes</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <MetricTile
                title="Total Recordings"
                value={kpiData?.totalRecordings || 0}
                subValue={`${kpiData?.recentUploads || 0} this week`}
                status={kpiData?.systemHealth === 'good' ? 'Healthy' : kpiData?.systemHealth === 'warning' ? 'Warning' : 'Critical'}
                trend={kpiData?.recentUploads > 10 ? 'up' : 'stable'}
                trendValue={`${kpiData?.recentUploads || 0} recent uploads`}
                icon={<FileText className="h-8 w-8" />}
              />

              <MetricTile
                title="Active Users"
                value={kpiData?.activeUsers || 0}
                subValue={`${kpiData?.totalUsers || 0} total users`}
                status={kpiData?.activeUsers > 0 ? 'Healthy' : 'Warning'}
                trend={kpiData?.activeUsers > 5 ? 'up' : 'stable'}
                trendValue={`${Math.round((kpiData?.activeUsers / Math.max(kpiData?.totalUsers, 1)) * 100)}% adoption`}
                icon={<Users className="h-8 w-8" />}
              />

              <MetricTile
                title="AI Analysis"
                value={kpiData?.totalAiMoments || 0}
                subValue="AI moments generated"
                status={kpiData?.totalAiMoments > 0 ? 'Healthy' : 'Warning'}
                trend={kpiData?.avgCoachingScore > 0 ? 'up' : 'stable'}
                trendValue={`${Math.round(kpiData?.avgCoachingScore || 0)} avg score`}
                icon={<TrendingUp className="h-8 w-8" />}
              />

              <MetricTile
                title="System Health"
                value={kpiData?.systemHealth || 'Unknown'}
                subValue="Overall status"
                status={kpiData?.systemHealth === 'good' ? 'Healthy' : kpiData?.systemHealth === 'warning' ? 'Warning' : 'Critical'}
                trend={kpiData?.systemHealth === 'good' ? 'up' : 'down'}
                trendValue="Last checked"
                icon={<AlertTriangle className="h-8 w-8" />}
              />
            </div>
          </section>

          {/* Engagement */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-title text-eci-gray-900">Engagement</h2>
                <p className="text-body-small text-eci-gray-500">Stay close to user behavior and communications.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ActivityFeed />
              <NotificationCenter />
            </div>
          </section>

          {/* Operations */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-title text-eci-gray-900">Operations</h2>
                <p className="text-body-small text-eci-gray-500">Track queues and infrastructure signals in real time.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <QueuePanel />
              <IntegrationHeartbeat />
              <div className="lg:col-span-2">
                <OrphanedFilesMonitor />
              </div>
            </div>
          </section>

          {/* Governance */}
          <section className="space-y-4 pb-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-title text-eci-gray-900">Governance</h2>
                <p className="text-body-small text-eci-gray-500">Audit trails, licensing, and quick administrative actions.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                <AuditLogTable />
              </div>
              <div className="space-y-6">
                <LicenseWidget />
                <QuickActions />
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
