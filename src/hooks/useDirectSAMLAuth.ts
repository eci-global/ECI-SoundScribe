/**
 * Direct SAML authentication bypass
 *
 * This is a workaround for when Supabase SAML provider is configured via CLI
 * but not yet accessible via the Auth API.
 *
 * It directly redirects to the Okta SAML endpoint, bypassing Supabase's
 * signInWithSSO() method.
 */

export const useDirectSAMLAuth = () => {
  /**
   * Directly redirect to Okta SAML SSO
   * This bypasses Supabase's SSO provider lookup
   */
  const signInWithOktaDirect = (email: string) => {
    // Okta SAML SSO endpoint (configure via env in production)
    const oktaSAMLUrl = (import.meta as any)?.env?.VITE_OKTA_SAML_SSO_URL || 'https://example.okta.com/app/your_app_id/sso/saml';

    // Supabase callback URL
    const publicSite = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || window.location.origin;
    const redirectUrl = `${publicSite}/auth/callback`;

    // Build SAML request with RelayState
    const samlRequest = {
      SAMLRequest: btoa(generateSAMLRequest()),
      RelayState: redirectUrl
    };

    // Redirect to Okta
    const params = new URLSearchParams(samlRequest);
    window.location.href = `${oktaSAMLUrl}?${params.toString()}`;
  };

  /**
   * Generate a simple SAML AuthnRequest
   * In production, this should be properly signed
   */
  const generateSAMLRequest = (): string => {
    const timestamp = new Date().toISOString();
    const requestID = `_${Math.random().toString(36).substr(2, 9)}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestID}"
                    Version="2.0"
                    IssueInstant="${timestamp}"
                    Destination="${(import.meta as any)?.env?.VITE_OKTA_SAML_SSO_URL || 'https://example.okta.com/app/your_app_id/sso/saml'}"
                    AssertionConsumerServiceURL="https://${(import.meta as any)?.env?.VITE_SUPABASE_PROJECT_REF || 'your_project_ref'}.supabase.co/auth/v1/sso/saml/acs">
  <saml:Issuer>https://${(import.meta as any)?.env?.VITE_SUPABASE_PROJECT_REF || 'your_project_ref'}.supabase.co/auth/v1/sso/saml/metadata</saml:Issuer>
</samlp:AuthnRequest>`;
  };

  return {
    signInWithOktaDirect
  };
};
