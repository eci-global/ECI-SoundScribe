// Central permission registry and route mapping

export type PermissionKey =
  | 'admin.org.view'
  | 'admin.org.manage'
  | 'admin.library.view'
  | 'admin.files.view'
  | 'admin.storage.view'
  | 'admin.tools.view'
  | 'admin.audit.view'
  | 'admin.targeting.view'
  | 'admin.automations.view'
  | 'admin.integrations.view'
  | 'admin.outreach.manage'
  | 'admin.analytics.view'
  | 'admin.bdr.manage'
  | 'admin.roles.manage'
  | 'admin.support.manage';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'admin.org.view',
  'admin.org.manage',
  'admin.library.view',
  'admin.files.view',
  'admin.storage.view',
  'admin.tools.view',
  'admin.audit.view',
  'admin.targeting.view',
  'admin.automations.view',
  'admin.integrations.view',
  'admin.outreach.manage',
  'admin.analytics.view',
  'admin.bdr.manage',
  'admin.roles.manage',
  'admin.support.manage',
];

// Map admin routes to required permissions
export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  '/admin': ['admin.org.view'],
  '/admin/org': ['admin.org.view'],
  '/admin/users-access': ['admin.org.manage'],
  '/admin/library': ['admin.library.view'],
  '/admin/all-recordings': ['admin.library.view'],
  '/admin/files': ['admin.files.view'],
  '/admin/storage-analytics': ['admin.storage.view'],
  '/admin/tools': ['admin.tools.view'],
  '/admin/audit': ['admin.audit.view'],
  '/admin/targeting': ['admin.targeting.view'],
  '/admin/automations': ['admin.automations.view'],
  '/admin/integrations': ['admin.integrations.view'],
  '/admin/organization-outreach': ['admin.outreach.manage'],
  '/admin/analytics': ['admin.analytics.view'],
  '/admin/bdr-training': ['admin.bdr.manage'],
  '/admin/bdr-scorecard-history': ['admin.bdr.manage'],
  '/admin/feedback-analytics': ['admin.bdr.manage'],
  '/admin/roles-access': ['admin.roles.manage'],
  '/admin/support-settings': ['admin.support.manage'],
};

export function getRoutePermissions(pathname: string): PermissionKey[] {
  return ROUTE_PERMISSIONS[pathname] || [];
}

