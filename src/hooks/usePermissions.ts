import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PermissionKey } from '@/admin/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setRole(null);
        setPermissions(new Set());
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch user role
        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);

        const userRole = roleRows && roleRows.length > 0 ? roleRows[0].role : 'user';
        if (!cancelled) setRole(userRole);

        // Admins implicitly have all permissions for now
        if (userRole === 'admin') {
          if (!cancelled) setPermissions(new Set(['*']));
          return;
        }

        // Aggregate role permissions (flatten arrays)
        const { data: rp } = await supabase
          .from('role_permissions')
          .select('permissions')
          .eq('role', userRole);

        const flat = new Set<string>();
        (rp || []).forEach((row: any) => {
          (row.permissions || []).forEach((p: string) => flat.add(p));
        });
        if (!cancelled) setPermissions(flat);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const has = useMemo(() => {
    return (perm: PermissionKey) => {
      if (permissions.has('*')) return true;
      return permissions.has(perm);
    };
  }, [permissions]);

  return { role, permissions, hasPermission: has, loading };
}

