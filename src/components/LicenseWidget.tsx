import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Building, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LicenseUsage {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  lastUpdated?: string;
}

export function LicenseWidget() {
  const [usage, setUsage] = useState<LicenseUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUsage = async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_user_statistics');

        if (rpcError) {
          throw rpcError;
        }

        if (!isMounted) return;

        setUsage({
          totalUsers: Number(data?.totalUsers ?? data?.total_users ?? 0),
          activeUsers: Number(data?.activeUsers ?? data?.active_users ?? 0),
          inactiveUsers: Number(data?.inactiveUsers ?? data?.inactive_users ?? 0),
          adminUsers: Number(data?.adminUsers ?? data?.admin_users ?? 0),
          lastUpdated: data?.lastUpdated ?? data?.last_updated,
        });
        setError(null);
      } catch (err) {
        console.error('Failed to load user statistics:', err);
        if (!isMounted) return;
        setUsage(null);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsage();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-white shadow-sm rounded-xl p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card className="bg-white shadow-sm rounded-xl p-6">
        <div className="text-caption text-eci-red">{error || 'Unable to load seat usage.'}</div>
      </Card>
    );
  }

  const licenseLimit = Number(import.meta.env.VITE_LICENSE_LIMIT ?? 0) || usage.totalUsers;
  const usedSeats = usage.totalUsers;
  const availableSeats = Math.max(licenseLimit - usedSeats, 0);
  const utilization = licenseLimit > 0 ? (usedSeats / licenseLimit) * 100 : 0;

  const usageStatus = getUsageStatus(utilization);

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-eci-gray-400" />
        <h3 className="text-body font-semibold text-eci-gray-900">Seat Utilization</h3>
        <Badge className={usageStatus.badgeClass}>{usageStatus.label}</Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-caption text-eci-gray-600">Allocated Seats</span>
            <span className="text-caption font-medium text-eci-gray-900">
              {usedSeats} / {licenseLimit}
            </span>
          </div>
          <Progress value={utilization} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-eci-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-eci-teal-dark" />
              <span className="text-caption text-eci-gray-600">Active</span>
            </div>
            <span className="text-title font-semibold text-eci-teal-dark">
              {usage.activeUsers}
            </span>
          </div>

          <div className="text-center p-3 bg-eci-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Building className="h-4 w-4 text-eci-gray-500" />
              <span className="text-caption text-eci-gray-600">Available</span>
            </div>
            <span className="text-title font-semibold text-eci-gray-900">{availableSeats}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-eci-gray-200 text-caption text-eci-gray-500">
          Last updated{' '}
          {usage.lastUpdated ? new Date(usage.lastUpdated).toLocaleString() : 'just now'}
        </div>
      </div>
    </Card>
  );
}

function getUsageStatus(utilization: number) {
  if (utilization >= 95) {
    return { label: 'Critical', badgeClass: 'bg-eci-red/10 text-eci-red-dark' };
  }
  if (utilization >= 80) {
    return { label: 'Warning', badgeClass: 'bg-orange-100 text-orange-800' };
  }
  return { label: 'Healthy', badgeClass: 'bg-eci-teal/10 text-eci-teal-dark' };
}
