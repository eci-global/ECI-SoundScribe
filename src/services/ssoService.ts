import { supabase } from '@/integrations/supabase/client';

export interface UserSSOSettings {
  user_id: string;
  sso_required: boolean;
  sso_provider: 'okta' | 'email' | null;
  okta_user_id: string | null;
  okta_email: string | null;
  okta_groups: string[];
  enforce_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SSOEnforcementLog {
  id: string;
  user_id: string;
  action: 'enabled' | 'disabled' | 'login_attempt' | 'login_success' | 'login_failure';
  sso_required: boolean | null;
  previous_sso_required: boolean | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  performed_by: string | null;
  created_at: string;
}

/**
 * Check if a user is required to use SSO
 */
export async function checkSSORequired(email: string): Promise<{
  required: boolean;
  settings: UserSSOSettings | null;
}> {
  try {
    // First, look up the user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // User doesn't exist yet - SSO not required
      return { required: false, settings: null };
    }

    // Check SSO settings for this user
    const { data, error } = await supabase
      .from('user_sso_settings')
      .select('*')
      .eq('user_id', userData.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No SSO settings found - SSO not required
        return { required: false, settings: null };
      }
      throw error;
    }

    return {
      required: data?.sso_required || false,
      settings: data || null
    };
  } catch (error) {
    console.error('Error checking SSO requirement:', error);
    return { required: false, settings: null };
  }
}

/**
 * Get SSO settings for a user
 */
export async function getUserSSOSettings(userId: string): Promise<UserSSOSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_sso_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching SSO settings:', error);
    return null;
  }
}

/**
 * Create or update SSO settings for a user
 */
export async function upsertSSOSettings(
  userId: string,
  settings: Partial<UserSSOSettings>,
  updatedBy?: string
): Promise<UserSSOSettings> {
  try {
    const { data, error } = await supabase
      .from('user_sso_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error upserting SSO settings:', error);
    throw error;
  }
}

/**
 * Enable SSO requirement for a user
 */
export async function enableSSORequirement(
  userId: string,
  reason: string,
  adminUserId?: string
): Promise<void> {
  try {
    await upsertSSOSettings(
      userId,
      {
        sso_required: true,
        sso_provider: 'okta',
        enforce_reason: reason
      },
      adminUserId
    );
  } catch (error) {
    console.error('Error enabling SSO requirement:', error);
    throw error;
  }
}

/**
 * Disable SSO requirement for a user
 */
export async function disableSSORequirement(
  userId: string,
  reason: string,
  adminUserId?: string
): Promise<void> {
  try {
    await upsertSSOSettings(
      userId,
      {
        sso_required: false,
        sso_provider: 'email',
        enforce_reason: reason
      },
      adminUserId
    );
  } catch (error) {
    console.error('Error disabling SSO requirement:', error);
    throw error;
  }
}

/**
 * Link an Okta user to a Supabase user
 */
export async function linkOktaUser(
  userId: string,
  oktaUserId: string,
  oktaEmail: string,
  oktaGroups: string[] = []
): Promise<void> {
  try {
    await upsertSSOSettings(userId, {
      okta_user_id: oktaUserId,
      okta_email: oktaEmail,
      okta_groups: oktaGroups,
      sso_provider: 'okta'
    });
  } catch (error) {
    console.error('Error linking Okta user:', error);
    throw error;
  }
}

/**
 * Log an SSO-related event
 */
export async function logSSOEvent(
  userId: string,
  action: SSOEnforcementLog['action'],
  details: {
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    performedBy?: string;
  } = {}
): Promise<void> {
  try {
    const { error } = await supabase.from('sso_enforcement_log').insert({
      user_id: userId,
      action,
      reason: details.reason || null,
      ip_address: details.ipAddress || null,
      user_agent: details.userAgent || null,
      performed_by: details.performedBy || null
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    // Don't throw - logging failures shouldn't break the flow
    console.error('Error logging SSO event:', error);
  }
}

/**
 * Get SSO enforcement logs for a user
 */
export async function getSSOLogs(
  userId: string,
  limit: number = 50
): Promise<SSOEnforcementLog[]> {
  try {
    const { data, error } = await supabase
      .from('sso_enforcement_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching SSO logs:', error);
    return [];
  }
}

/**
 * Get all users with SSO settings (for admin)
 */
export async function getAllSSOSettings(): Promise<UserSSOSettings[]> {
  try {
    const { data, error } = await supabase
      .from('user_sso_settings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching all SSO settings:', error);
    return [];
  }
}

/**
 * Bulk enable SSO for users by email domain
 */
export async function bulkEnableSSOByDomain(
  domain: string,
  reason: string,
  adminUserId: string
): Promise<{ success: number; failed: number }> {
  try {
    // Get all users with this email domain
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email')
      .ilike('email', `%@${domain}`);

    if (error) {
      throw error;
    }

    let success = 0;
    let failed = 0;

    // Enable SSO for each user
    for (const user of users || []) {
      try {
        await enableSSORequirement(user.id, reason, adminUserId);
        success++;
      } catch (err) {
        console.error(`Failed to enable SSO for user ${user.email}:`, err);
        failed++;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Error bulk enabling SSO:', error);
    throw error;
  }
}
