import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrganizationConnection {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface OutreachProspect {
  id: string;
  attributes: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    title?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationConnectionId, organizationId } = await req.json();
    
    if (!organizationConnectionId || !organizationId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting user discovery for organization:', organizationId);

    // Get organization connection
    const { data: connection, error: connectionError } = await supabase
      .from('organization_outreach_connections')
      .select('*')
      .eq('id', organizationConnectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Organization connection not found');
    }

    // Check if token needs refresh
    const tokenExpired = new Date(connection.token_expires_at) <= new Date();
    let accessToken = connection.access_token;

    if (tokenExpired) {
      const refreshResult = await refreshOrganizationToken(connection, supabase);
      if (!refreshResult.success) {
        throw new Error('Token expired and refresh failed');
      }
      accessToken = refreshResult.access_token;
    }

    // Start sync log
    const syncLogId = crypto.randomUUID();
    await supabase
      .from('organization_outreach_sync_logs')
      .insert({
        id: syncLogId,
        organization_connection_id: organizationConnectionId,
        operation_type: 'user_discovery',
        status: 'pending',
        started_at: new Date().toISOString(),
        request_payload: {
          organization_id: organizationId,
          discovery_method: 'email_domain'
        }
      });

    // Get internal users for this organization (by email domain)
    const emailDomain = organizationId;
    const { data: internalUsers, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error('Failed to retrieve internal users');
    }

    const orgUsers = internalUsers.users.filter(user => 
      user.email && user.email.endsWith(`@${emailDomain}`)
    );

    console.log(`Found ${orgUsers.length} internal users for domain ${emailDomain}`);

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const discoveredMappings = [];

    // Search for each user in Outreach by email
    for (const user of orgUsers) {
      processedCount++;
      
      try {
        console.log(`Searching for prospect: ${user.email}`);
        
        // Search for prospect by email in Outreach
        const prospects = await searchOutreachProspectByEmail(user.email!, accessToken);
        
        if (prospects.length > 0) {
          const prospect = prospects[0]; // Take the first match
          
          // Check if mapping already exists
          const { data: existingMapping, error: mappingError } = await supabase
            .from('user_outreach_profiles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_connection_id', organizationConnectionId)
            .single();

          if (!mappingError && existingMapping) {
            console.log(`Mapping already exists for user: ${user.email}`);
            continue;
          }

          // Create new user profile mapping
          const { data: newMapping, error: insertError } = await supabase
            .from('user_outreach_profiles')
            .insert({
              user_id: user.id,
              organization_connection_id: organizationConnectionId,
              outreach_prospect_id: prospect.id,
              prospect_email: prospect.attributes.email,
              prospect_name: prospect.attributes.name || `${prospect.attributes.firstName} ${prospect.attributes.lastName}`,
              prospect_company: prospect.attributes.company,
              prospect_title: prospect.attributes.title,
              auto_discovered: true,
              is_active: true,
              last_synced_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Failed to create mapping for ${user.email}:`, insertError);
            failedCount++;
          } else {
            console.log(`Created mapping for ${user.email} → ${prospect.attributes.name}`);
            successCount++;
            discoveredMappings.push(newMapping);
          }
        } else {
          console.log(`No prospect found for ${user.email}`);
        }
      } catch (error: any) {
        console.error(`Error processing user ${user.email}:`, error);
        failedCount++;
      }
    }

    // Update sync log
    await supabase
      .from('organization_outreach_sync_logs')
      .update({
        status: failedCount === 0 ? 'success' : 'partial',
        records_processed: processedCount,
        records_successful: successCount,
        records_failed: failedCount,
        completed_at: new Date().toISOString(),
        response_payload: {
          discovered_mappings: discoveredMappings.length,
          internal_users_found: orgUsers.length,
          mappings_created: successCount
        }
      })
      .eq('id', syncLogId);

    console.log(`User discovery completed: ${successCount}/${processedCount} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Discovered ${successCount} user mappings`,
        data: {
          processed: processedCount,
          successful: successCount,
          failed: failedCount,
          discovered_mappings: discoveredMappings.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('User discovery error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'User discovery failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper function to search Outreach prospects by email
async function searchOutreachProspectByEmail(email: string, accessToken: string): Promise<OutreachProspect[]> {
  const searchParams = new URLSearchParams({
    'filter[emails]': email,
    'page[limit]': '5'
  });

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
      `Outreach API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.data || [];
}

// Helper function to refresh organization token
async function refreshOrganizationToken(connection: OrganizationConnection, supabase: any) {
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
      .from('organization_outreach_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
      })
      .eq('id', connection.id);

    return {
      success: true,
      access_token: tokenData.access_token
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}