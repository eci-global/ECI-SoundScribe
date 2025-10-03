import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, Shield, UserPlus, Settings, ExternalLink } from 'lucide-react';
import { useOkta } from '@/hooks/useOkta';

export default function OrgOverview() {
  const { orgData, loading } = useOkta();

  const mockOrgData = {
    organization: {
      name: 'ECI Software Solutions',
      domain: 'ecisolutions.com',
      plan: 'Enterprise',
      created: '2023-01-15',
      status: 'active'
    },
    stats: {
      totalUsers: 245,
      activeUsers: 218,
      groups: 12,
      applications: 8,
      licenses: {
        total: 300,
        used: 245,
        available: 55
      }
    },
    groups: [
      { id: '1', name: 'Sales Team', members: 85, description: 'All sales representatives' },
      { id: '2', name: 'Customer Success', members: 42, description: 'CS managers and support' },
      { id: '3', name: 'Engineering', members: 38, description: 'Development teams' },
      { id: '4', name: 'Administrators', members: 5, description: 'System administrators' }
    ]
  };

  const data = orgData || mockOrgData;

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Organization Overview</h1>
            <p className="text-body text-eci-gray-600">Manage organization settings and user groups</p>
          </div>

          {/* Organization Info */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Building className="h-8 w-8 text-eci-gray-400" />
                  <div>
                    <h2 className="text-title font-semibold text-eci-gray-900">{data.organization.name}</h2>
                    <p className="text-body-small text-eci-gray-600">{data.organization.domain}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Plan</p>
                    <Badge className="bg-purple-100 text-purple-800">{data.organization.plan}</Badge>
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Status</p>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600 mb-1">Created</p>
                    <p className="text-body text-eci-gray-900">{new Date(data.organization.created).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-caption text-green-600">89% active</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Total Users</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{data.stats.totalUsers}</p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Shield className="h-8 w-8 text-green-500" />
                <span className="text-caption text-eci-gray-600">{data.stats.licenses.available} left</span>
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Licenses</p>
              <p className="text-title-large font-semibold text-eci-gray-900">
                {data.stats.licenses.used}/{data.stats.licenses.total}
              </p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Groups</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{data.stats.groups}</p>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <ExternalLink className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-caption text-eci-gray-600 mb-1">Applications</p>
              <p className="text-title-large font-semibold text-eci-gray-900">{data.stats.applications}</p>
            </Card>
          </div>

          {/* Groups Table */}
          <Card className="bg-white shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-title font-semibold text-eci-gray-900">User Groups</h2>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Create Group
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-eci-gray-200">
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Group Name</th>
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Description</th>
                    <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Members</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-eci-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((group) => (
                    <tr key={group.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-eci-gray-400" />
                          <span className="text-body font-medium text-eci-gray-900">{group.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-body text-eci-gray-600">{group.description}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{group.members} users</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    
  );
}