import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutreachConnection {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, emails, userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!query && !emails) {
      throw new Error('Either query or emails parameter is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Outreach connection
    const { data: connection, error: connectionError } = await supabase
      .from('outreach_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      throw new Error('No Outreach connection found. Please connect your account first.');
    }

    // Check if token needs refresh
    const tokenExpired = new Date(connection.token_expires_at) <= new Date();
    let accessToken = connection.access_token;

    if (tokenExpired) {
      // Refresh token
      const refreshResult = await refreshOutreachToken(connection, supabase, userId);
      if (!refreshResult.success) {
        throw new Error('Token expired and refresh failed. Please reconnect your account.');
      }
      accessToken = refreshResult.access_token;
    }

    // Build search parameters
    const searchParams = new URLSearchParams();
    
    if (emails && emails.length > 0) {
      searchParams.append('filter[emails]', emails.join(','));
    }
    
    if (query) {
      // For general search, we'll search by name and company
      const trimmedQuery = query.trim();
      if (trimmedQuery.includes('@')) {
        // If query looks like an email, search by email
        searchParams.append('filter[emails]', trimmedQuery);
      } else {
        // Search by name or company
        searchParams.append('filter[name]', trimmedQuery);
      }
    }
    
    // Limit results to avoid overwhelming the UI
    searchParams.append('page[limit]', '20');

    // Make request to Outreach API
    const response = await fetch(
      `https://api.outreach.io/api/v2/prospects?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.api+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.detail || 
        errorData.errors?.[0]?.title || 
        `Outreach API error: ${response.status}`
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        prospects: data.data || [],
        meta: data.meta
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Prospect search error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to search prospects'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper function to refresh Outreach token
async function refreshOutreachToken(connection: OutreachConnection, supabase: any, userId: string) {
  try {
    const clientId = Deno.env.get('VITE_OUTREACH_CLIENT_ID');
    const clientSecret = Deno.env.get('VITE_OUTREACH_CLIENT_SECRET');

    const response = await fetch('https://api.outreach.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokenData = await response.json();
    const tokenExpiresAt = new Date(
      (tokenData.created_at + tokenData.expires_in) * 1000
    ).toISOString();

    // Update stored tokens
    await supabase
      .from('outreach_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
      })
      .eq('user_id', userId);

    return {
      success: true,
      access_token: tokenData.access_token
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}