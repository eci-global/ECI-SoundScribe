import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refreshToken, userId } = await req.json();
    
    if (!refreshToken || !userId) {
      throw new Error('Missing required parameters');
    }

    // Get environment variables (support both server and client variable names)
    const clientId = Deno.env.get('OUTREACH_CLIENT_ID') || Deno.env.get('VITE_OUTREACH_CLIENT_ID');
    const clientSecret = Deno.env.get('OUTREACH_CLIENT_SECRET') || Deno.env.get('VITE_OUTREACH_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!clientId || !clientSecret) {
      throw new Error('Outreach OAuth credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Refresh the access token
    const tokenResponse = await fetch('https://api.outreach.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token refresh failed:', error);
      
      // If refresh token is invalid, we need to re-authenticate
      if (error.includes('invalid_grant')) {
        // Delete the invalid connection
        await supabase
          .from('outreach_connections')
          .delete()
          .eq('user_id', userId);
        
        throw new Error('Refresh token is invalid. Please reconnect your Outreach account.');
      }
      
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const tokenData: RefreshTokenResponse = await tokenResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(
      (tokenData.created_at + tokenData.expires_in) * 1000
    ).toISOString();

    // Update the connection with new tokens
    const { data: connection, error: dbError } = await supabase
      .from('outreach_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // Outreach provides new refresh token
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to update connection: ${dbError.message}`);
    }

    // Log successful refresh
    await supabase
      .from('outreach_sync_logs')
      .insert({
        user_id: userId,
        operation_type: 'token_refresh',
        status: 'success',
        outreach_resource_type: 'oauth_token',
        response_payload: {
          expires_at: tokenExpiresAt,
          scope: tokenData.scope,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id,
          token_expires_at: connection.token_expires_at,
          outreach_user_email: connection.outreach_user_email,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    // Log error
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
            outreach_resource_type: 'oauth_token',
            error_details: {
              message: error.message,
              stack: error.stack,
            },
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Token refresh failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});