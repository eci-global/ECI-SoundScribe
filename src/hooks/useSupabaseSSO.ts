import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Get Supabase anon key for direct API calls
const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

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
    if (!email.includes('@')) {
      return { required: false };
    }

    const domain = email.split('@')[1];

    // Hardcoded check for ecisolutions.com domain
    if (domain === 'ecisolutions.com') {
      return {
        required: true,
        providerId: '4865c1ea-77bb-4182-b8da-6c2f5a8aed32',
        message: 'SSO authentication is required for this account. Please sign in with SSO.',
      };
    }

    try {
      // Check if SSO is configured for other domains
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
        options: {
          skipBrowserRedirect: true, // Don't redirect, just check availability
        },
      });

      if (error) {
        console.error('Error checking SSO:', error);
        return { required: false };
      }

      if (data?.providerId) {
        // SSO is configured for this domain
        return {
          required: true,
          providerId: data.providerId,
          message: 'SSO authentication is required for this account. Please sign in with SSO.',
        };
      }

      return { required: false };
    } catch (err) {
      console.error('Exception checking SSO:', err);
      return { required: false };
    }
  }, []);

  /**
   * Initiate SSO sign-in
   * @param email - User's email address (to determine domain)
   */
  const signInWithSSO = useCallback(async (email: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const domain = email.split('@')[1];

      // Determine the correct redirect URL based on environment
      const redirectUrl = window.location.hostname === 'localhost'
        ? `${window.location.origin}/auth/callback`
        : 'https://eci-sound-scribe.vercel.app/auth/callback';

      // Try using provider ID directly if domain lookup fails
      const ssoConfig: any = {
        options: {
          redirectTo: redirectUrl,
        },
      };

      // First try by domain
      if (domain === 'ecisolutions.com') {
        // Use provider ID directly for ecisolutions.com
        ssoConfig.providerId = '4865c1ea-77bb-4182-b8da-6c2f5a8aed32';
      } else {
        // Fall back to domain lookup for other domains
        ssoConfig.domain = domain;
      }

      // WORKAROUND: Direct redirect to Okta until Supabase SAML API is working
      if (domain === 'ecisolutions.com') {
        // Build the Supabase SSO initiate URL manually
        const supabaseProjectRef = 'qinkldgvejheppheykfl';
        const providerId = '4865c1ea-77bb-4182-b8da-6c2f5a8aed32';
        const ssoInitiateUrl = `https://${supabaseProjectRef}.supabase.co/auth/v1/sso/saml/initiate?provider_id=${providerId}&redirect_to=${encodeURIComponent(redirectUrl)}&apikey=${SUPABASE_ANON_KEY}`;

        console.log('Redirecting to SSO initiate URL:', ssoInitiateUrl);
        window.location.href = ssoInitiateUrl;
        return;
      }

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
      const { data, error } = await supabase.auth.signInWithSSO({
        providerId,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

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
