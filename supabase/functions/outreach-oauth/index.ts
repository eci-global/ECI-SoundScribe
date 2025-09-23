import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

// Note: corsHeaders from shared file includes all necessary headers including Methods

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

interface OutreachRootResponse {
  data: {
    type: string;
    id: string;
    attributes: {
      name?: string;
      description?: string;
      [key: string]: any;
    };
  };
  included?: Array<{
    type: string;
    id: string;
    attributes: any;
  }>;
}

interface OutreachUserResponse {
  data: {
    id: string;
    attributes: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  included?: Array<{
    type: string;
    id: string;
    attributes: any;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, userId } = await req.json();
    
    if (!code || !redirectUri || !userId) {
      throw new Error('Missing required parameters');
    }

    // Get environment variables from Supabase secrets
    const clientId = Deno.env.get('VITE_OUTREACH_CLIENT_ID') || Deno.env.get('OUTREACH_CLIENT_ID');
    const clientSecret = Deno.env.get('VITE_OUTREACH_CLIENT_SECRET') || Deno.env.get('OUTREACH_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!clientId || !clientSecret) {
      console.error('Missing OAuth credentials:', {
        clientId: clientId ? 'present' : 'missing',
        clientSecret: clientSecret ? 'present' : 'missing'
      });
      throw new Error('Outreach OAuth credentials not configured');
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.outreach.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: error,
        requestDetails: {
          client_id: clientId,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code: code ? `${code.substring(0, 10)}...` : 'missing'
        }
      });
      throw new Error(`Failed to exchange authorization code (${tokenResponse.status}): ${error}`);
    }

    const tokenData: OAuthTokenResponse = await tokenResponse.json();

    // Get user info from Outreach root endpoint
    const userResponse = await fetch('https://api.outreach.io/api/v2', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.api+json',
      },
    });

    // Handle optional user info - don't fail OAuth if this fails
    let userEmail = null;
    let orgId = null;
    let outreachUserId = null;

    if (!userResponse.ok) {
      console.warn('Failed to get user info from root endpoint:', await userResponse.text());
      console.log('Proceeding with OAuth without additional user details');
    } else {
      try {
        const rootData: OutreachRootResponse = await userResponse.json();
        
        // Extract organization ID from included data if available
        if (rootData.included) {
          const org = rootData.included.find(item => item.type === 'organization');
          if (org) {
            orgId = org.id;
          }

          // Try to find user data in included resources
          const user = rootData.included.find(item => item.type === 'user');
          if (user) {
            outreachUserId = user.id;
            userEmail = user.attributes?.email;
          }
        }

        // Log what we found for debugging
        console.log('Root endpoint response processed:', {
          orgId: orgId || 'not_found',
          outreachUserId: outreachUserId || 'not_found',
          userEmail: userEmail || 'not_found'
        });
      } catch (parseError) {
        console.warn('Failed to parse root endpoint response:', parseError);
        console.log('Proceeding with OAuth without additional user details');
      }
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      (tokenData.created_at + tokenData.expires_in) * 1000
    ).toISOString();

    // Store or update the connection in database
    const { data: connection, error: dbError } = await supabase
      .from('outreach_connections')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        outreach_user_id: outreachUserId || null,
        outreach_org_id: orgId,
        outreach_user_email: userEmail,
        scope: tokenData.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store connection: ${dbError.message}`);
    }

    // Log successful connection
    await supabase
      .from('outreach_sync_logs')
      .insert({
        user_id: userId,
        operation_type: 'token_refresh',
        status: 'success',
        outreach_resource_type: 'oauth_connection',
        response_payload: {
          user_email: userEmail,
          outreach_user_id: outreachUserId,
          org_id: orgId,
          scope: tokenData.scope,
        },
      });

    return createSuccessResponse({
      connection: {
        id: connection.id,
        outreach_user_email: connection.outreach_user_email,
        outreach_org_id: connection.outreach_org_id,
      },
    });

  } catch (error: any) {
    console.error('OAuth error:', error);
    
    // Log error
    if (Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        const { userId } = await req.json().catch(() => ({ userId: null }));
        
        if (userId) {
          await supabase
            .from('outreach_sync_logs')
            .insert({
              user_id: userId,
              operation_type: 'token_refresh',
              status: 'error',
              outreach_resource_type: 'oauth_connection',
              error_details: {
                message: error.message,
                stack: error.stack,
              },
            });
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return createErrorResponse(error.message || 'OAuth flow failed', 400);
  }
});