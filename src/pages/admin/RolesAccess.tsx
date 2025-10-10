import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ALL_PERMISSIONS, PermissionKey } from '@/admin/permissions';

const ROLES = ['admin', 'manager', 'user'] as const;

export default function RolesAccess() {
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number]>('manager');
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<string, PermissionKey[]> = {
      Organization: [],
      Library: [],
      Tools: [],
      Integrations: [],
      Analytics: [],
      Training: [],
      Other: [],
    };
    ALL_PERMISSIONS.forEach(p => {
      if (p.startsWith('admin.org')) groups.Organization.push(p);
      else if (p.startsWith('admin.library')) groups.Library.push(p);
      else if (p.startsWith('admin.tools') || p.startsWith('admin.audit') || p.startsWith('admin.targeting') || p.startsWith('admin.automations')) groups.Tools.push(p);
      else if (p.startsWith('admin.integrations') || p.startsWith('admin.outreach')) groups.Integrations.push(p);
      else if (p.startsWith('admin.analytics')) groups.Analytics.push(p);
      else if (p.startsWith('admin.bdr')) groups.Training.push(p);
      else groups.Other.push(p);
    });
    return groups;
  }, []);

  const fetchRolePermissions = async (role: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('role_permissions')
        .select('permissions')
        .eq('role', role);
      const flat = new Set<string>();
      (data || []).forEach((row: any) => (row.permissions || []).forEach((p: string) => flat.add(p)));
      setRolePerms(flat);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRolePermissions(selectedRole); }, [selectedRole]);

  const togglePerm = (perm: PermissionKey) => {
    const next = new Set(rolePerms);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setRolePerms(next);
  };

  const save = async () => {
    setLoading(true);
    try {
      // Strategy: store a single consolidated row for this role with all permissions
      // under resource_name = 'admin_portal'
      const arr = Array.from(rolePerms);
      // Delete existing rows for this role/resource
      await supabase.from('role_permissions').delete().eq('role', selectedRole).eq('resource_name', 'admin_portal');
      await supabase.from('role_permissions').insert({
        role: selectedRole,
        resource_name: 'admin_portal',
        permissions: arr,
      });
    } finally {
      setLoading(false);
    }
  };
  // Role assignment panel state and helpers
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string | null; role: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: true });
      const out: Array<{ id: string; email: string; full_name: string | null; role: string | null }> = [];
      for (const row of rows || []) {
        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', row.id)
          .limit(1);
        out.push({ id: row.id, email: row.email, full_name: row.full_name, role: roleRows && roleRows.length > 0 ? roleRows[0].role : null });
      }
      if (!cancelled) setUsers(out);
    })();
    return () => { cancelled = true; };
  }, []);

  const setUserRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_roles').insert({ user_id: userId, role });
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-display text-eci-gray-900 mb-1">Roles & Access</h1>
          <p className="text-body text-eci-gray-600">Manage which admin pages and features each role can access.</p>
        </div>
        <div className="flex items-center gap-2">
          {ROLES.map(r => (
            <Button key={r} variant={selectedRole === r ? 'default' : 'outline'} onClick={() => setSelectedRole(r)}>
              {r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([group, perms]) => (
          <Card key={group} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-title font-semibold">{group}</h2>
              <Badge variant="secondary">{perms.length}</Badge>
            </div>
            <div className="space-y-2">
              {perms.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={rolePerms.has(p)} onCheckedChange={() => togglePerm(p)} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
      </div>
      {/* Role assignment */}
      <div className="mt-10">
        <h2 className="text-title font-semibold mb-3">Role Assignment</h2>
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-eci-gray-600 border-b">
                  <th className="py-2">User</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {/* Use Users & Access for full management. Enhancement could list users here. */}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}






