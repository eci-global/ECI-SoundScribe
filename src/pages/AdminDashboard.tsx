import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import AdminLayout from '@/components/admin/AdminLayout';
import { resolveAdminComponent } from '@/admin/routes';
import { getRoutePermissions } from '@/admin/permissions';
import { usePermissions } from '@/hooks/usePermissions';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const { hasPermission, loading: permLoading } = usePermissions();

  const loading = authLoading || roleLoading || permLoading;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access the admin dashboard.</p>
        </div>
      </AdminLayout>
    );
  }

  // Check route-specific permissions instead of blanket admin check
  const req = getRoutePermissions(location.pathname);
  const allowed = req.length === 0 || req.every(hasPermission);

  return (
    <AdminLayout>
      {allowed ? (
        resolveAdminComponent(location.pathname)
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this section.</p>
        </div>
      )}
    </AdminLayout>
  );
}
