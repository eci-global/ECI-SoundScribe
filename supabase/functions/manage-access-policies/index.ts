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

interface AccessPolicy {
  id?: string;
  name: string;
  description?: string;
  resource_name: string;
  permissions: string[];
  groups?: string[];
  enabled?: boolean;
  created_by?: string;
}

interface PolicyAssignment {
  user_id: string;
  policy_id: string;
  expires_at?: string;
  is_active?: boolean;
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

// Validate admin access
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  console.log('🔐 manage-access-policies function started');

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

    // Validate admin access
    const isAdmin = await validateAdminAccess(supabase, userInfo.sub);
    if (!isAdmin) {
      return createErrorResponse('Forbidden - Admin access required', 403);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (req.method) {
      case 'GET':
        return await handleGet(supabase, action, url.searchParams);
      case 'POST':
        return await handlePost(supabase, action, req, userInfo.sub);
      case 'PUT':
        return await handlePut(supabase, req, userInfo.sub);
      case 'DELETE':
        return await handleDelete(supabase, url.searchParams);
      default:
        return createErrorResponse('Method not allowed', 405);
    }

  } catch (error) {
    console.error('❌ Error in manage-access-policies:', error);
    return createErrorResponse(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

async function handleGet(supabase: any, action: string, params: URLSearchParams) {
  switch (action) {
    case 'list':
      return await listPolicies(supabase);
    case 'resources':
      return await listResources(supabase);
    case 'user-assignments':
      return await getUserAssignments(supabase, params.get('user_id'));
    case 'policy-users':
      return await getPolicyUsers(supabase, params.get('policy_id'));
    case 'stats':
      return await getPolicyStats(supabase);
    default:
      return createErrorResponse('Invalid action', 400);
  }
}

async function handlePost(supabase: any, action: string, req: Request, userId: string) {
  const body = await req.json();

  switch (action) {
    case 'create':
      return await createPolicy(supabase, body, userId);
    case 'assign':
      return await assignPolicyToUser(supabase, body, userId);
    case 'bulk-assign':
      return await bulkAssignPolicies(supabase, body, userId);
    default:
      return createErrorResponse('Invalid action', 400);
  }
}

async function handlePut(supabase: any, req: Request, userId: string) {
  const body = await req.json();
  return await updatePolicy(supabase, body, userId);
}

async function handleDelete(supabase: any, params: URLSearchParams) {
  const policyId = params.get('policy_id');
  const assignmentId = params.get('assignment_id');

  if (policyId) {
    return await deletePolicy(supabase, policyId);
  } else if (assignmentId) {
    return await removeAssignment(supabase, assignmentId);
  } else {
    return createErrorResponse('Missing policy_id or assignment_id', 400);
  }
}

// Implementation functions

async function listPolicies(supabase: any) {
  console.log('📋 Listing all access policies');

  const { data: policies, error } = await supabase
    .from('access_policies')
    .select(`
      *,
      assignments:user_policy_assignments(
        id,
        user_id,
        assigned_at,
        expires_at,
        is_active,
        user:profiles(full_name, email)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch policies:', error);
    return createErrorResponse(`Failed to fetch policies: ${error.message}`, 500);
  }

  return createSuccessResponse({ policies });
}

async function listResources(supabase: any) {
  console.log('📋 Listing all resources and permissions');

  const { data: resources, error } = await supabase
    .from('resource_permissions')
    .select('*')
    .order('resource_name', { ascending: true });

  if (error) {
    console.error('Failed to fetch resources:', error);
    return createErrorResponse(`Failed to fetch resources: ${error.message}`, 500);
  }

  // Group by resource name
  const groupedResources = resources.reduce((acc: any, resource: any) => {
    if (!acc[resource.resource_name]) {
      acc[resource.resource_name] = {
        name: resource.resource_name,
        description: resource.resource_description,
        permissions: []
      };
    }
    acc[resource.resource_name].permissions.push({
      type: resource.permission_type,
      description: resource.permission_description
    });
    return acc;
  }, {});

  return createSuccessResponse({
    resources: Object.values(groupedResources)
  });
}

async function getUserAssignments(supabase: any, userId: string | null) {
  if (!userId) {
    return createErrorResponse('user_id is required', 400);
  }

  console.log('👤 Getting policy assignments for user:', userId);

  const { data: assignments, error } = await supabase
    .from('user_policy_assignments')
    .select(`
      *,
      policy:access_policies(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user assignments:', error);
    return createErrorResponse(`Failed to fetch assignments: ${error.message}`, 500);
  }

  return createSuccessResponse({ assignments });
}

async function getPolicyUsers(supabase: any, policyId: string | null) {
  if (!policyId) {
    return createErrorResponse('policy_id is required', 400);
  }

  console.log('👥 Getting users assigned to policy:', policyId);

  const { data: assignments, error } = await supabase
    .from('user_policy_assignments')
    .select(`
      *,
      user:profiles(id, full_name, email),
      assigned_by_user:profiles!user_policy_assignments_assigned_by_fkey(full_name, email)
    `)
    .eq('policy_id', policyId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch policy users:', error);
    return createErrorResponse(`Failed to fetch policy users: ${error.message}`, 500);
  }

  return createSuccessResponse({ assignments });
}

async function getPolicyStats(supabase: any) {
  console.log('📊 Getting policy statistics');

  const [policiesResult, assignmentsResult, usersResult] = await Promise.all([
    supabase.from('access_policies').select('id, enabled').eq('enabled', true),
    supabase.from('user_policy_assignments').select('id').eq('is_active', true),
    supabase.from('user_policy_assignments').select('user_id').eq('is_active', true)
  ]);

  if (policiesResult.error || assignmentsResult.error || usersResult.error) {
    return createErrorResponse('Failed to fetch statistics', 500);
  }

  const uniqueUsers = new Set(usersResult.data?.map((a: any) => a.user_id)).size;

  const stats = {
    activePolicies: policiesResult.data?.length || 0,
    totalAssignments: assignmentsResult.data?.length || 0,
    usersWithPolicies: uniqueUsers,
    averageAssignmentsPerUser: uniqueUsers > 0 ? Math.round((assignmentsResult.data?.length || 0) / uniqueUsers * 100) / 100 : 0
  };

  return createSuccessResponse({ stats });
}

async function createPolicy(supabase: any, policy: AccessPolicy, userId: string) {
  console.log('➕ Creating new access policy:', policy.name);

  // Validate required fields
  if (!policy.name || !policy.resource_name || !policy.permissions || policy.permissions.length === 0) {
    return createErrorResponse('Missing required fields: name, resource_name, permissions', 400);
  }

  // Check if policy name already exists
  const { data: existing } = await supabase
    .from('access_policies')
    .select('id')
    .eq('name', policy.name)
    .single();

  if (existing) {
    return createErrorResponse('Policy name already exists', 409);
  }

  // Validate resource exists
  const { data: resource } = await supabase
    .from('resource_permissions')
    .select('resource_name')
    .eq('resource_name', policy.resource_name)
    .single();

  if (!resource) {
    return createErrorResponse('Invalid resource_name', 400);
  }

  const { data: newPolicy, error } = await supabase
    .from('access_policies')
    .insert({
      name: policy.name,
      description: policy.description,
      resource_name: policy.resource_name,
      permissions: policy.permissions,
      groups: policy.groups || [],
      enabled: policy.enabled !== false,
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create policy:', error);
    return createErrorResponse(`Failed to create policy: ${error.message}`, 500);
  }

  return createSuccessResponse({ policy: newPolicy });
}

async function updatePolicy(supabase: any, policy: AccessPolicy & { id: string }, userId: string) {
  console.log('✏️ Updating access policy:', policy.id);

  if (!policy.id) {
    return createErrorResponse('Policy ID is required', 400);
  }

  const { data: updatedPolicy, error } = await supabase
    .from('access_policies')
    .update({
      name: policy.name,
      description: policy.description,
      resource_name: policy.resource_name,
      permissions: policy.permissions,
      groups: policy.groups,
      enabled: policy.enabled
    })
    .eq('id', policy.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update policy:', error);
    return createErrorResponse(`Failed to update policy: ${error.message}`, 500);
  }

  return createSuccessResponse({ policy: updatedPolicy });
}

async function deletePolicy(supabase: any, policyId: string) {
  console.log('🗑️ Deleting access policy:', policyId);

  // Check if policy has active assignments
  const { data: assignments } = await supabase
    .from('user_policy_assignments')
    .select('id')
    .eq('policy_id', policyId)
    .eq('is_active', true);

  if (assignments && assignments.length > 0) {
    return createErrorResponse(`Cannot delete policy with ${assignments.length} active assignments`, 409);
  }

  const { error } = await supabase
    .from('access_policies')
    .delete()
    .eq('id', policyId);

  if (error) {
    console.error('Failed to delete policy:', error);
    return createErrorResponse(`Failed to delete policy: ${error.message}`, 500);
  }

  return createSuccessResponse({ message: 'Policy deleted successfully' });
}

async function assignPolicyToUser(supabase: any, assignment: PolicyAssignment, assignedBy: string) {
  console.log('🔗 Assigning policy to user:', assignment);

  const { data: newAssignment, error } = await supabase
    .from('user_policy_assignments')
    .insert({
      user_id: assignment.user_id,
      policy_id: assignment.policy_id,
      assigned_by: assignedBy,
      expires_at: assignment.expires_at,
      is_active: assignment.is_active !== false
    })
    .select(`
      *,
      policy:access_policies(*),
      user:profiles(full_name, email)
    `)
    .single();

  if (error) {
    console.error('Failed to assign policy:', error);
    return createErrorResponse(`Failed to assign policy: ${error.message}`, 500);
  }

  return createSuccessResponse({ assignment: newAssignment });
}

async function bulkAssignPolicies(supabase: any, data: { user_ids: string[], policy_ids: string[] }, assignedBy: string) {
  console.log('📦 Bulk assigning policies:', data);

  const assignments = [];
  for (const userId of data.user_ids) {
    for (const policyId of data.policy_ids) {
      assignments.push({
        user_id: userId,
        policy_id: policyId,
        assigned_by: assignedBy,
        is_active: true
      });
    }
  }

  const { data: newAssignments, error } = await supabase
    .from('user_policy_assignments')
    .upsert(assignments, { onConflict: 'user_id,policy_id' })
    .select();

  if (error) {
    console.error('Failed to bulk assign policies:', error);
    return createErrorResponse(`Failed to bulk assign policies: ${error.message}`, 500);
  }

  return createSuccessResponse({
    assignments: newAssignments,
    count: newAssignments.length
  });
}

async function removeAssignment(supabase: any, assignmentId: string) {
  console.log('❌ Removing policy assignment:', assignmentId);

  const { error } = await supabase
    .from('user_policy_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId);

  if (error) {
    console.error('Failed to remove assignment:', error);
    return createErrorResponse(`Failed to remove assignment: ${error.message}`, 500);
  }

  return createSuccessResponse({ message: 'Assignment removed successfully' });
}