import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Lock, Users, FileKey, Plus, Edit2 } from 'lucide-react';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  resource: string;
  permissions: string[];
  groups: string[];
  enabled: boolean;
  lastModified: string;
}

export default function AclSettings() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([
    {
      id: '1',
      name: 'Admin Full Access',
      description: 'Complete system access for administrators',
      resource: '*',
      permissions: ['read', 'write', 'delete', 'admin'],
      groups: ['Administrators'],
      enabled: true,
      lastModified: '2025-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: 'Sales Team Access',
      description: 'Access to recordings and summaries for sales team',
      resource: 'recordings,summaries',
      permissions: ['read', 'write'],
      groups: ['Sales Team'],
      enabled: true,
      lastModified: '2025-01-18T14:30:00Z'
    },
    {
      id: '3',
      name: 'CS Manager Access',
      description: 'Extended access for customer success managers',
      resource: 'recordings,summaries,analytics',
      permissions: ['read', 'write', 'export'],
      groups: ['Customer Success', 'Managers'],
      enabled: true,
      lastModified: '2025-01-19T09:15:00Z'
    },
    {
      id: '4',
      name: 'Guest Read-Only',
      description: 'Limited read access for guest users',
      resource: 'summaries',
      permissions: ['read'],
      groups: ['Guests'],
      enabled: false,
      lastModified: '2025-01-10T16:00:00Z'
    }
  ]);

  const togglePolicy = (policyId: string) => {
    setPolicies(prev => prev.map(policy => 
      policy.id === policyId ? { ...policy, enabled: !policy.enabled } : policy
    ));
  };

  const getPermissionBadgeColor = (permission: string) => {
    const colors = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-green-100 text-green-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      export: 'bg-orange-100 text-orange-800'
    };
    return colors[permission as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Access Control Settings</h1>
            <p className="text-body text-eci-gray-600">Configure permissions and access policies</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Policies</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {policies.filter(p => p.enabled).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Total Policies</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">{policies.length}</p>
                </div>
                <FileKey className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Groups Covered</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {new Set(policies.flatMap(p => p.groups)).size}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Resources</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {new Set(policies.flatMap(p => p.resource.split(','))).size}
                  </p>
                </div>
                <Lock className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Policies List */}
          <AdminTableShell
            title={`Access Policies (${policies.length})`}
            description="Configure permissions and access policies"
            loading={false}
            empty={policies.length === 0}
            emptyTitle="No policies defined"
            emptyDescription="Create a policy to control access."
            actions={(
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Policy
              </Button>
            )}
          >
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-body font-semibold text-eci-gray-900">{policy.name}</h3>
                        <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                          {policy.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-body-small text-eci-gray-600 mb-3">{policy.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-eci-gray-600 w-20">Resources:</span>
                          <code className="text-caption bg-eci-gray-100 px-2 py-1 rounded">{policy.resource}</code>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-eci-gray-600 w-20">Permissions:</span>
                          <div className="flex gap-1">
                            {policy.permissions.map((perm) => (
                              <Badge key={perm} className={getPermissionBadgeColor(perm)}>
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-eci-gray-600 w-20">Groups:</span>
                          <div className="flex gap-1">
                            {policy.groups.map((group) => (
                              <Badge key={group} variant="outline">
                                {group}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-caption text-eci-gray-500 mt-3">
                        Last modified: {new Date(policy.lastModified).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={() => togglePolicy(policy.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminTableShell>
        </div>
      </div>
    </AdminLayout>
  );
}
