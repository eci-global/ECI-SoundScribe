import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Required config (no insecure fallbacks)
const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PROJECT_REF = (import.meta as any)?.env?.VITE_SUPABASE_PROJECT_REF;
// If env is not present in prod for any reason, fall back to the known provider UUID
const SUPABASE_SSO_PROVIDER_ID = (import.meta as any)?.env?.VITE_SUPABASE_SSO_PROVIDER_ID; // SAML provider UUID
const SSO_ENFORCED_DOMAIN = (import.meta as any)?.env?.VITE_SSO_ENFORCED_DOMAIN || 'ecisolutions.com';

export interface SSOCheckResult {
  required: boolean;
  providerId?: string;
  message?: string;
}

/**
 * Hook for Supabase native SAML SSO authentication
 * Much simpler than custom OAuth - Supabase handles everything!
 */
export const useSupabaseSSO = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if SSO is required/available for an email domain
   * @param email - User's email address
   * @returns Whether SSO is required and provider info
   */
  const checkSSORequired = useCallback(async (email: string): Promise<SSOCheckResult> => {
        if (!email.includes('@')) return { required: false };
    const domain = email.split('@')[1];
    if (domain === SSO_ENFORCED_DOMAIN) {
      return { required: true, message: 'SSO authentication is required for this account. Please sign in with SSO.' };
    }
    return { required: false };
  }, []);

  /**
   * Initiate SSO sign-in
   * @param email - User's email address (to determine domain)
   */
  const signInWithSSO = useCallback(async (email: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!SUPABASE_SSO_PROVIDER_ID) { throw new Error('Missing VITE_SUPABASE_SSO_PROVIDER_ID'); }
      const domain = email.split('@')[1];

      // Always prefer providerId to avoid domain lookup, rely on Supabase site_url redirect
      const ssoConfig: any = { domain };

      // Note: Rely on official SP-initiated flow via supabase-js.
      // Do not use manual SAML initiate URL (some projects return 404).

      // For other domains, use normal flow
      const { data, error } = await supabase.auth.signInWithSSO(ssoConfig);

      if (error) {
        throw error;
      }

      // Redirect to SSO provider (Okta)
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No SSO URL returned from Supabase');
      }
    } catch (err: any) {
      console.error('SSO sign-in error:', err);
      setError(err.message || 'Failed to initiate SSO sign-in');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with specific SSO provider ID
   * Useful when you have multiple SAML providers configured
   */
  const signInWithProvider = useCallback(async (providerId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithSSO({ providerId });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No SSO URL returned from Supabase');
      }
    } catch (err: any) {
      console.error('SSO sign-in error:', err);
      setError(err.message || 'Failed to initiate SSO sign-in');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if Supabase SAML SSO is configured
   * Note: This is a simple check - doesn't validate actual provider setup
   */
  const isSSOEnabled = useCallback((): boolean => {
    // SSO is configured if there's at least one provider in Supabase dashboard
    // The actual check happens when user enters their email
    return true; // Always return true - let Supabase determine availability per domain
  }, []);

  return {
    signInWithSSO,
    signInWithProvider,
    checkSSORequired,
    isSSOEnabled,
    loading,
    error,
  };
};



