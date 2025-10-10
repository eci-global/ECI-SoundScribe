import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, Shield, Settings, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OrgStats {
  totalUsers: number;
  admins: number;
  salesCalls: number;
  supportCalls: number;
  otherCalls: number;
}

export default function OrgOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrgStats>({ totalUsers: 0, admins: 0, salesCalls: 0, supportCalls: 0, otherCalls: 0 });
  const [orgName, setOrgName] = useState<string>('Your Organization');
  const [orgDomain, setOrgDomain] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // Profiles count (users)
        const { count: userCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        // Admin roles count
        const { count: adminCount } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');

        // Recordings counts by content_type
        const { data: recAgg } = await supabase
          .from('recordings')
          .select('content_type');
        const salesCalls = recAgg?.filter(r => r.content_type === 'sales_call').length || 0;
        const supportCalls = recAgg?.filter(r => r.content_type === 'customer_support' || r.content_type === 'support_call').length || 0;
        const otherCalls = (recAgg?.length || 0) - salesCalls - supportCalls;

        // Try to infer org name/domain from first profile (if available)
        const { data: firstProfile } = await supabase
          .from('profiles')
          .select('email, created_at')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (firstProfile?.email) {
          const domain = String(firstProfile.email).split('@')[1] || '';
          if (isMounted) setOrgDomain(domain);
        }
        if (firstProfile?.created_at && isMounted) setCreatedAt(firstProfile.created_at);

        if (isMounted) {
          setStats({
            totalUsers: userCount || 0,
            admins: adminCount || 0,
            salesCalls,
            supportCalls,
            otherCalls,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const createdLabel = useMemo(() => (createdAt ? new Date(createdAt).toLocaleDateString() : '—'), [createdAt]);

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Organization Overview</h1>
            <p className="text-body text-eci-gray-600">Manage organization users, roles, and integrations</p>
          </div>

          {/* Organization Info */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Building className="h-8 w-8 text-eci-gray-400" />
                  <div>
                    <h2 className="text-title font-semibold text-eci-gray-900">{orgName}</h2>
                    <p className="text-body-small text-eci-gray-600">{orgDomain || 'domain not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Plan</p>
                    <Badge className="bg-purple-100 text-purple-800">Standard</Badge>
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Status</p>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Created</p>
                    <p className="text-body text-eci-gray-900">{createdLabel}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/admin/users-access')}>
                  <Users className="h-4 w-4" />
                  Users & Access
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/admin/organization-outreach')}>
                  <ExternalLink className="h-4 w-4" />
                  Outreach
                </Button>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-caption text-green-600">Admins: {stats.admins}</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Total Users</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{stats.totalUsers}</p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Shield className="h-8 w-8 text-green-500" />
                <span className="text-caption text-eci-gray-600">Roles</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Administrators</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{stats.admins}</p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Sales Calls</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{stats.salesCalls}</p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <ExternalLink className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Support Calls</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{stats.supportCalls}</p>
            </Card>
          </div>
          {/* Call Mix Summary */}
          <Card className="bg-white shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-title font-semibold text-eci-gray-900">Call Mix</h2>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Sales</p>
                <p className="text-title font-semibold text-eci-gray-900">{stats.salesCalls}</p>
              </div>
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Support</p>
                <p className="text-title font-semibold text-eci-gray-900">{stats.supportCalls}</p>
              </div>
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Other</p>
                <p className="text-title font-semibold text-eci-gray-900">{stats.otherCalls}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    
  );
}
