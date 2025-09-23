import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/Sparkline';
import { useStorageAnalytics } from '@/hooks/useStorageAnalytics';
import { HardDrive, TrendingUp, Database, Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DurationBackfillPanel from '@/components/admin/DurationBackfillPanel';
import StuckRecordingsPanel from '@/components/admin/StuckRecordingsPanel';

export default function StorageAnalytics() {
  const { storageUsage, fileDistribution, loading, error, refetch } = useStorageAnalytics();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
              <h1 className="text-display text-eci-gray-900 mb-2">Storage Analytics</h1>
              <p className="text-body text-eci-gray-600">Monitor storage usage and growth trends</p>
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
                <h1 className="text-display text-eci-gray-900 mb-2">Storage Analytics</h1>
                <p className="text-body text-eci-gray-600">Monitor storage usage and growth trends</p>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
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
                  <Button size="sm" variant="outline" onClick={refetch} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <HardDrive className="h-8 w-8 text-blue-500" />
                <span className={`text-caption font-medium ${
                  (storageUsage?.storageGrowthPercent || 0) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(storageUsage?.storageGrowthPercent || 0) > 0 ? '+' : ''}{Math.round(storageUsage?.storageGrowthPercent || 0)}%
                </span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Total Storage</p>
              <p className="text-title-large font-semibold text-eci-gray-900">
                {formatBytes(storageUsage?.totalStorageBytes || 0)}
              </p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <span className="text-caption text-eci-gray-600">Weekly</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Growth Rate</p>
              <p className="text-title-large font-semibold text-eci-gray-900">
                {Math.round(storageUsage?.storageGrowthPercent || 0)}%
              </p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Database className="h-8 w-8 text-purple-500" />
                <span className="text-caption font-medium text-green-600">
                  Low
                </span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Utilization</p>
              <p className="text-title-large font-semibold text-eci-gray-900">
                {Math.round((storageUsage?.totalStorageBytes || 0) / (10 * 1024 * 1024 * 1024) * 100)}%
              </p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="h-8 w-8 text-orange-500" />
                <span className="text-caption text-eci-gray-600">Ratio</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Compression</p>
              <p className="text-title-large font-semibold text-eci-gray-900">
                1.2:1
              </p>
            </Card>
          </div>

          {/* Bucket Analytics */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <h2 className="text-title font-semibold text-eci-gray-900 mb-6">Storage Buckets</h2>
            {fileDistribution ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-eci-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-body font-medium text-eci-gray-900">Audio Files</h3>
                      <p className="text-title-small font-semibold text-eci-gray-900 mt-1">
                        {fileDistribution.audio} files
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-eci-gray-600">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>Audio content</span>
                  </div>
                </div>
                <div className="border border-eci-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-body font-medium text-eci-gray-900">Video Files</h3>
                      <p className="text-title-small font-semibold text-eci-gray-900 mt-1">
                        {fileDistribution.video} files
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-eci-gray-600">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>Video content</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-eci-gray-400 mb-2">No storage buckets found</div>
                <p className="text-sm text-eci-gray-600">Upload some files to see storage analytics</p>
              </div>
            )}
          </Card>

          {/* Storage Forecast */}
          <Card className="bg-white shadow-sm p-6">
            <h2 className="text-title font-semibold text-eci-gray-900 mb-4">Storage Forecast</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-eci-gray-100">
                <span className="text-body text-eci-gray-600">Current Usage</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {formatBytes(storageUsage?.totalStorageBytes || 0)} / 10 GB
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-eci-gray-100">
                <span className="text-body text-eci-gray-600">Projected (30 days)</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {formatBytes(Math.round((storageUsage?.totalStorageBytes || 0) * 1.3))}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-eci-gray-100">
                <span className="text-body text-eci-gray-600">Projected (90 days)</span>
                <span className="text-body font-medium text-eci-gray-900">
                  {formatBytes(Math.round((storageUsage?.totalStorageBytes || 0) * 2.1))}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-body text-eci-gray-600">Storage Full ETA</span>
                <span className="text-body font-medium text-eci-gray-900">
                  ~120 days
                </span>
              </div>
            </div>
          </Card>

          {/* Stuck Recordings Recovery */}
          <StuckRecordingsPanel />

          {/* Duration Data Management */}
          <DurationBackfillPanel />
        </div>
      </div>
    </AdminLayout>
  );
}
