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

  console.log('🚀 list-admin-users function started');

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return createErrorResponse('Server configuration error', 500);
    }

    // Extract and validate auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return createErrorResponse('Unauthorized', 401);
    }

    // Decode JWT to get user info
    const userInfo = decodeJWT(authHeader);
    if (!userInfo?.sub) {
      console.error('Invalid JWT token');
      return createErrorResponse('Unauthorized', 401);
    }

    console.log('User authenticated:', { userId: userInfo.sub, email: userInfo.email });

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });


    // Check if user has admin role
    console.log('Checking admin role for user:', userInfo.sub);
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userInfo.sub);

    if (roleError) {
      console.error('Failed to verify admin role:', roleError);
      return createErrorResponse('Unable to verify permissions', 500);
    }

    console.log('User roles found:', roleRows);
    const isAdmin = roleRows?.some((row) => row.role === 'admin');
    if (!isAdmin) {
      console.log('User is not admin:', { userId: userInfo.sub, roles: roleRows });
      return createErrorResponse('Forbidden - Admin access required', 403);
    }

    console.log('✅ Admin access verified for user:', userInfo.sub);

    // Fetch all users from auth.users
    console.log('📋 Fetching users from auth.users...');
    const perPage = 100;
    let page = 1;
    const authUsers: any[] = [];

    while (true) {
      console.log(`Fetching page ${page} of users (${perPage} per page)`);
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

      if (error) {
        console.error('Failed to list users on page', page, ':', error);
        return createErrorResponse(`Failed to retrieve users (page ${page}): ${error.message}`, 500);
      }

      authUsers.push(...data.users);
      console.log(`Retrieved ${data.users.length} users from page ${page}`);

      if (data.users.length < perPage) {
        console.log(`Last page reached. Total users fetched: ${authUsers.length}`);
        break;
      }

      page += 1;
    }

    const userIds = authUsers.map((u) => u.id);
    console.log(`🔍 Fetching profiles and roles for ${userIds.length} users`);

    // Fetch user profiles and roles in parallel
    const [profileResult, userRoleResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, updated_at')
        .in('id', userIds),
      supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .in('user_id', userIds),
    ]);

    // Check for profile fetch errors
    if (profileResult.error) {
      console.error('Failed to fetch user profiles:', profileResult.error);
      return createErrorResponse(`Failed to fetch user profiles: ${profileResult.error.message}`, 500);
    }

    // Check for user roles fetch errors
    if (userRoleResult.error) {
      console.error('Failed to fetch user roles:', userRoleResult.error);

      // If error is due to missing column, try again without created_at
      if (userRoleResult.error.code === '42703' && userRoleResult.error.message?.includes('created_at')) {
        console.log('Retrying user roles query without created_at column...');
        const { data: fallbackRoles, error: fallbackError } = await supabase
          .from('user_roles')
          .select('id, user_id, role')
          .in('user_id', userIds);

        if (fallbackError) {
          console.error('Fallback user roles query also failed:', fallbackError);
          return createErrorResponse(`Failed to fetch user roles: ${fallbackError.message}`, 500);
        }

        userRoleResult.data = fallbackRoles;
        console.log('✅ Successfully retrieved user roles without created_at column');
      } else {
        return createErrorResponse(`Failed to fetch user roles: ${userRoleResult.error.message}`, 500);
      }
    }

    const profileRows = profileResult.data || [];
    const userRoleRows = userRoleResult.data || [];

    console.log(`📊 Found ${profileRows.length} profiles and ${userRoleRows.length} role assignments`);

    const profilesById = new Map((profileRows || []).map((profile) => [profile.id, profile]));

    const rolesByUserId = new Map<string, { id: string; role: string; created_at?: string }[]>();
    (userRoleRows || []).forEach((role) => {
      const entry = rolesByUserId.get(role.user_id) || [];
      entry.push({
        id: role.id,
        role: role.role,
        created_at: role.created_at || new Date().toISOString() // Fallback to current timestamp
      });
      rolesByUserId.set(role.user_id, entry);
    });

    const enrichedUsers = authUsers.map((authUser) => {
      const profile = profilesById.get(authUser.id);
      const assignedRoles = rolesByUserId.get(authUser.id) || [];
      let status: 'active' | 'inactive' | 'suspended' = 'active';
      if (authUser.banned_until) {
        status = 'suspended';
      } else if (!authUser.email_confirmed_at) {
        status = 'inactive';
      }

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || '',
        created_at: authUser.created_at,
        updated_at: profile?.updated_at || authUser.updated_at,
        last_sign_in_at: authUser.last_sign_in_at,
        roles: assignedRoles.map((role) => ({
          id: role.id,
          role: role.role,
          created_at: role.created_at || new Date().toISOString(),
        })),
        status,
        metadata: authUser.user_metadata || {},
      };
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalUsers: enrichedUsers.length,
      activeUsers: enrichedUsers.filter((user) => user.status === 'active').length,
      admins: enrichedUsers.filter((user) => user.roles.some((role) => role.role === 'admin')).length,
      newUsersThisMonth: enrichedUsers.filter((user) => new Date(user.created_at) >= monthStart).length,
    };

    console.log(`✅ Successfully processed ${enrichedUsers.length} users with stats:`, stats);
    return createSuccessResponse({ users: enrichedUsers, stats });

  } catch (error) {
    console.error('❌ Unexpected error in list-admin-users function:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse(`Unexpected error listing users: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});
