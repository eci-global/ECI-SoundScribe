import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  corsHeaders,
  createErrorResponse,
  createSuccessResponse,
  handleCORSPreflight,
} from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface UserPermission {
  resource_name: string;
  permissions: string[];
  source: 'role' | 'policy' | 'both';
  details?: {
    from_roles?: string[];
    from_policies?: string[];
  };
}

interface PermissionCheck {
  resource: string;
  permission: string;
  hasAccess: boolean;
  source?: string;
}

// Helper function to decode JWT and extract user info
function decodeJWT(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.replace('Bearer ', '').split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      sub: payload.sub,
      email: payload.email
    };
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  console.log('🔍 get-user-permissions function started');

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Server configuration error', 500);
    }

    // Extract and validate auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Decode JWT to get user info
    const userInfo = decodeJWT(authHeader);
    if (!userInfo?.sub) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('user_id') || userInfo.sub;
    const action = url.searchParams.get('action') || 'permissions';

    // Validate access - users can only query their own permissions unless they're admin
    const isAdmin = await validateAdminAccess(supabase, userInfo.sub);
    if (targetUserId !== userInfo.sub && !isAdmin) {
      return createErrorResponse('Forbidden - Can only query own permissions', 403);
    }

    switch (action) {
      case 'permissions':
        return await getUserPermissions(supabase, targetUserId);
      case 'check':
        const resource = url.searchParams.get('resource');
        const permission = url.searchParams.get('permission');
        if (!resource || !permission) {
          return createErrorResponse('resource and permission parameters required for check action', 400);
        }
        return await checkUserPermission(supabase, targetUserId, resource, permission);
      case 'summary':
        return await getUserPermissionsSummary(supabase, targetUserId);
      default:
        return createErrorResponse('Invalid action', 400);
    }

  } catch (error) {
    console.error('❌ Error in get-user-permissions:', error);
    return createErrorResponse(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

async function validateAdminAccess(supabase: any, userId: string): Promise<boolean> {
  const { data: roleRows, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to verify admin role:', error);
    return false;
  }

  return roleRows?.some((row: any) => row.role === 'admin') || false;
}

async function getUserPermissions(supabase: any, userId: string) {
  console.log('🔍 Getting all permissions for user:', userId);

  try {
    // Use the database function to get effective permissions
    const { data: permissions, error } = await supabase
      .rpc('get_user_effective_permissions', { p_user_id: userId });

    if (error) {
      console.error('Failed to get user permissions:', error);
      return createErrorResponse(`Failed to get permissions: ${error.message}`, 500);
    }

    // Get additional context about roles and policies
    const [rolesResult, policiesResult] = await Promise.all([
      getUserRoles(supabase, userId),
      getUserPolicies(supabase, userId)
    ]);

    const userPermissions: UserPermission[] = permissions.map((perm: any) => ({
      resource_name: perm.resource_name,
      permissions: perm.permissions,
      source: perm.source,
      details: {
        from_roles: rolesResult.roles,
        from_policies: policiesResult.policies.map((p: any) => p.name)
      }
    }));

    return createSuccessResponse({
      user_id: userId,
      permissions: userPermissions,
      roles: rolesResult.roles,
      policies: policiesResult.policies,
      summary: {
        total_resources: userPermissions.length,
        total_permissions: userPermissions.reduce((acc, perm) => acc + perm.permissions.length, 0),
        sources: {
          role_only: userPermissions.filter(p => p.source === 'role').length,
          policy_only: userPermissions.filter(p => p.source === 'policy').length,
          both: userPermissions.filter(p => p.source === 'both').length
        }
      }
    });

  } catch (error) {
    console.error('Error getting user permissions:', error);
    return createErrorResponse('Failed to retrieve user permissions', 500);
  }
}

async function checkUserPermission(supabase: any, userId: string, resource: string, permission: string) {
  console.log(`🔒 Checking permission for user ${userId}: ${resource}.${permission}`);

  try {
    // Use the database function to check specific permission
    const { data: hasPermission, error } = await supabase
      .rpc('user_has_permission', {
        p_resource_name: resource,
        p_permission: permission,
        p_user_id: userId
      });

    if (error) {
      console.error('Failed to check permission:', error);
      return createErrorResponse(`Failed to check permission: ${error.message}`, 500);
    }

    // Get source information
    let source = 'none';
    if (hasPermission) {
      const rolePermissions = await getRolePermissions(supabase, userId, resource);
      const policyPermissions = await getPolicyPermissions(supabase, userId, resource);

      const hasFromRole = rolePermissions.includes(permission);
      const hasFromPolicy = policyPermissions.includes(permission);

      if (hasFromRole && hasFromPolicy) {
        source = 'both';
      } else if (hasFromRole) {
        source = 'role';
      } else if (hasFromPolicy) {
        source = 'policy';
      }
    }

    const result: PermissionCheck = {
      resource,
      permission,
      hasAccess: hasPermission,
      source: hasPermission ? source : undefined
    };

    return createSuccessResponse({ check: result });

  } catch (error) {
    console.error('Error checking user permission:', error);
    return createErrorResponse('Failed to check permission', 500);
  }
}

async function getUserPermissionsSummary(supabase: any, userId: string) {
  console.log('📊 Getting permissions summary for user:', userId);

  try {
    const [rolesResult, policiesResult, permissionsResult] = await Promise.all([
      getUserRoles(supabase, userId),
      getUserPolicies(supabase, userId),
      supabase.rpc('get_user_effective_permissions', { p_user_id: userId })
    ]);

    const resources = permissionsResult.data || [];
    const totalPermissions = resources.reduce((acc: number, resource: any) => acc + resource.permissions.length, 0);

    const summary = {
      user_id: userId,
      roles: {
        count: rolesResult.roles.length,
        list: rolesResult.roles
      },
      policies: {
        count: policiesResult.policies.length,
        active_count: policiesResult.policies.filter((p: any) => p.is_active).length,
        list: policiesResult.policies.map((p: any) => ({
          name: p.name,
          resource: p.resource_name,
          is_active: p.is_active
        }))
      },
      permissions: {
        resources_count: resources.length,
        total_permissions: totalPermissions,
        by_source: {
          role_only: resources.filter((r: any) => r.source === 'role').length,
          policy_only: resources.filter((r: any) => r.source === 'policy').length,
          both: resources.filter((r: any) => r.source === 'both').length
        }
      },
      access_level: determineAccessLevel(rolesResult.roles),
      last_updated: new Date().toISOString()
    };

    return createSuccessResponse({ summary });

  } catch (error) {
    console.error('Error getting permissions summary:', error);
    return createErrorResponse('Failed to get permissions summary', 500);
  }
}

// Helper functions

async function getUserRoles(supabase: any, userId: string) {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role, created_at, organization_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to get user roles:', error);
    return { roles: [] };
  }

  return {
    roles: roles.map((r: any) => r.role)
  };
}

async function getUserPolicies(supabase: any, userId: string) {
  const { data: assignments, error } = await supabase
    .from('user_policy_assignments')
    .select(`
      is_active,
      assigned_at,
      expires_at,
      policy:access_policies(
        id,
        name,
        description,
        resource_name,
        permissions,
        enabled
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to get user policies:', error);
    return { policies: [] };
  }

  return {
    policies: assignments.map((a: any) => ({
      ...a.policy,
      is_active: a.is_active,
      assigned_at: a.assigned_at,
      expires_at: a.expires_at
    }))
  };
}

async function getRolePermissions(supabase: any, userId: string, resource: string): Promise<string[]> {
  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select('permissions')
    .in('role', (await getUserRoles(supabase, userId)).roles)
    .eq('resource_name', resource);

  if (error || !permissions) {
    return [];
  }

  return permissions.flatMap((p: any) => p.permissions);
}

async function getPolicyPermissions(supabase: any, userId: string, resource: string): Promise<string[]> {
  const { data: policies, error } = await supabase
    .from('user_policy_assignments')
    .select(`
      policy:access_policies(permissions)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('access_policies.resource_name', resource)
    .eq('access_policies.enabled', true);

  if (error || !policies) {
    return [];
  }

  return policies.flatMap((p: any) => p.policy.permissions);
}

function determineAccessLevel(roles: string[]): string {
  if (roles.includes('admin')) {
    return 'admin';
  } else if (roles.includes('manager')) {
    return 'manager';
  } else if (roles.includes('user')) {
    return 'user';
  } else {
    return 'guest';
  }
}