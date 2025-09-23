import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLibraryMetrics } from '@/hooks/useLibraryMetrics';
import { FileIcon, Clock, Users, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

export default function LibraryDashboard() {
  const { metrics, loading, error, refreshMetrics } = useLibraryMetrics();

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
              <h1 className="text-display text-eci-gray-900 mb-2">Library Dashboard</h1>
              <p className="text-body text-eci-gray-600">Manage recordings and analyze library metrics</p>
            </div>
            <div className="grid grid-cols-4 gap-6">
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
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-eci-gray-900 mb-2">Library Dashboard</h1>
                <p className="text-body text-eci-gray-600">Manage recordings and analyze library metrics</p>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshMetrics}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                  <Button size="sm" variant="outline" onClick={refreshMetrics} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Total Recordings</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {metrics?.totalRecordings?.toLocaleString() || 0}
                  </p>
                </div>
                <FileIcon className="h-8 w-8 text-eci-gray-400" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Total Duration</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {Math.round((metrics?.totalDuration || 0) / 60)} min
                  </p>
                </div>
                <Clock className="h-8 w-8 text-eci-gray-400" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Users</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {metrics?.totalRecordings || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-eci-gray-400" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Growth</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    +{metrics?.totalRecordings || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-eci-gray-400" />
              </div>
            </Card>
          </div>

          {/* Basic Info using AdminTableShell for consistent states */}
          <AdminTableShell
            title="Library Overview"
            description="Core size and file metrics"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-body text-eci-gray-600">Total Size</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {((metrics?.totalSize || 0) / 1024 / 1024 / 1024).toFixed(2)} GB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body text-eci-gray-600">Average File Size</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {((metrics?.totalSize || 0) / (metrics?.totalRecordings || 1) / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body text-eci-gray-600">Total Files</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {metrics?.totalRecordings || 0}
                </span>
              </div>
            </div>
          </AdminTableShell>
        </div>
      </div>
    </AdminLayout>
  );
}
