/**
 * AI Control Center Authentication Utilities
 *
 * Handles authentication and authorization for AI Control Center Edge Functions
 * with proper error handling and user feedback.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuthResult {
  isAuthenticated: boolean;
  session: any;
  error?: string;
}

/**
 * Check if user has a valid session for AI Control Center access
 */
export async function checkAIControlCenterAuth(): Promise<AuthResult> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session check error:', error);
      return {
        isAuthenticated: false,
        session: null,
        error: 'Authentication error'
      };
    }

    if (!session) {
      return {
        isAuthenticated: false,
        session: null,
        error: 'No active session'
      };
    }

    return {
      isAuthenticated: true,
      session
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return {
      isAuthenticated: false,
      session: null,
      error: 'Authentication check failed'
    };
  }
}

/**
 * Handle Edge Function errors with proper user feedback
 */
export function handleAIControlCenterError(error: any, context: string = 'AI Control Center') {
  console.error(`Error in ${context}:`, error);

  if (error.message?.includes('JWT expired') || error.message?.includes('Invalid JWT')) {
    toast.error('Session expired. Please refresh the page and log in again.');
    return 'jwt_expired';
  }

  if (error.message?.includes('Admin access required') || error.message?.includes('Admin')) {
    toast.error('Admin access required for AI Control Center');
    return 'admin_required';
  }

  if (error.message?.includes('Authentication required')) {
    toast.error('Please log in to access AI Control Center');
    return 'auth_required';
  }

  // Generic error
  toast.error(`Failed to load ${context}`);
  return 'generic_error';
}

/**
 * Wrapper for AI Control Center Edge Function calls with built-in auth handling
 */
export async function invokeAIControlCenterFunction(
  functionName: string,
  options: any = {},
  context: string = 'data'
) {
  try {
    // Check authentication first
    const authResult = await checkAIControlCenterAuth();
    if (!authResult.isAuthenticated) {
      toast.error('Please log in to access AI Control Center');
      return { data: null, error: 'Not authenticated' };
    }

    // Make the function call
    const { data, error } = await supabase.functions.invoke(functionName, options);

    if (error) {
      const errorType = handleAIControlCenterError(error, context);
      return { data: null, error, errorType };
    }

    return { data, error: null };
  } catch (error) {
    const errorType = handleAIControlCenterError(error, context);
    return { data: null, error, errorType };
  }
}

/**
 * Refresh authentication and retry operation
 */
export async function refreshAuthAndRetry<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Session refresh failed:', error);
      toast.error('Please log in again to continue');
      return null;
    }

    if (data.session) {
      console.log('Session refreshed successfully');
      // Retry the operation
      return await operation();
    }

    return null;
  } catch (error) {
    console.error('Auth refresh and retry failed:', error);
    toast.error('Authentication failed. Please log in again.');
    return null;
  }
}

export default {
  checkAIControlCenterAuth,
  handleAIControlCenterError,
  invokeAIControlCenterFunction,
  refreshAuthAndRetry
};