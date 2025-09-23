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

interface UserProfile {
  id: string;
  user_id: string;
  outreach_prospect_id: string;
  prospect_email: string;
  prospect_name: string;
  prospect_company: string;
}

interface OutreachCall {
  id: string;
  attributes: {
    subject: string;
    body?: string;
    callDisposition?: string;
    callDurationSeconds?: number;
    occurredAt: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships?: {
    prospect?: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationConnectionId, syncType = 'incremental', days = 30 } = await req.json();
    
    if (!organizationConnectionId) {
      throw new Error('Missing organization connection ID');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting ${syncType} call sync for organization connection:`, organizationConnectionId);

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

    // Get user profiles for this organization
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_outreach_profiles')
      .select('*')
      .eq('organization_connection_id', organizationConnectionId)
      .eq('is_active', true);

    if (profilesError || !userProfiles || userProfiles.length === 0) {
      throw new Error('No active user profiles found for this organization');
    }

    console.log(`Found ${userProfiles.length} user profiles to sync`);

    // Start sync log
    const syncLogId = crypto.randomUUID();
    await supabase
      .from('organization_outreach_sync_logs')
      .insert({
        id: syncLogId,
        organization_connection_id: organizationConnectionId,
        operation_type: syncType === 'full' ? 'full_sync' : 'incremental_sync',
        status: 'pending',
        started_at: new Date().toISOString(),
        request_payload: {
          sync_type: syncType,
          days_back: days,
          user_profiles_count: userProfiles.length
        }
      });

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const syncedCalls = [];

    // Sync calls for each user profile
    for (const profile of userProfiles) {
      try {
        console.log(`Syncing calls for prospect: ${profile.prospect_name} (${profile.prospect_email})`);
        
        // Get calls for this prospect from Outreach
        const calls = await getOutreachCallsForProspect(
          profile.outreach_prospect_id, 
          accessToken, 
          syncType === 'full' ? 365 : days // Full sync goes back 1 year
        );

        console.log(`Found ${calls.length} calls for prospect ${profile.prospect_name}`);

        for (const call of calls) {
          totalProcessed++;
          
          try {
            // Check if call already exists in cache
            const { data: existingCall, error: existingError } = await supabase
              .from('outreach_calls_cache')
              .select('id, updated_in_outreach_at')
              .eq('organization_connection_id', organizationConnectionId)
              .eq('outreach_call_id', call.id)
              .single();

            const callUpdatedAt = new Date(call.attributes.updatedAt);
            
            // Skip if call exists and hasn't been updated (for incremental sync)
            if (!existingError && existingCall && syncType === 'incremental') {
              const existingUpdatedAt = new Date(existingCall.updated_in_outreach_at);
              if (callUpdatedAt <= existingUpdatedAt) {
                continue;
              }
            }

            // Upsert call to cache
            const callData = {
              organization_connection_id: organizationConnectionId,
              outreach_call_id: call.id,
              prospect_id: profile.outreach_prospect_id,
              user_id: profile.user_id,
              call_subject: call.attributes.subject,
              call_body: call.attributes.body,
              call_disposition: call.attributes.callDisposition,
              call_duration_seconds: call.attributes.callDurationSeconds,
              occurred_at: call.attributes.occurredAt,
              created_in_outreach_at: call.attributes.createdAt,
              updated_in_outreach_at: call.attributes.updatedAt,
              call_data: call,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            };

            const { error: upsertError } = await supabase
              .from('outreach_calls_cache')
              .upsert(callData, {
                onConflict: 'organization_connection_id,outreach_call_id'
              });

            if (upsertError) {
              console.error(`Failed to cache call ${call.id}:`, upsertError);
              totalFailed++;
            } else {
              totalSuccessful++;
              syncedCalls.push({
                call_id: call.id,
                prospect_name: profile.prospect_name,
                subject: call.attributes.subject,
                occurred_at: call.attributes.occurredAt
              });
            }
          } catch (callError: any) {
            console.error(`Error processing call ${call.id}:`, callError);
            totalFailed++;
          }
        }

        // Update profile last synced time
        await supabase
          .from('user_outreach_profiles')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', profile.id);

      } catch (profileError: any) {
        console.error(`Error syncing profile ${profile.prospect_name}:`, profileError);
        totalFailed++;
      }
    }

    // Update sync log
    await supabase
      .from('organization_outreach_sync_logs')
      .update({
        status: totalFailed === 0 ? 'success' : (totalSuccessful > 0 ? 'partial' : 'error'),
        records_processed: totalProcessed,
        records_successful: totalSuccessful,
        records_failed: totalFailed,
        completed_at: new Date().toISOString(),
        response_payload: {
          calls_synced: totalSuccessful,
          user_profiles_processed: userProfiles.length,
          sync_type: syncType,
          sample_calls: syncedCalls.slice(0, 5) // First 5 calls as sample
        }
      })
      .eq('id', syncLogId);

    console.log(`Call sync completed: ${totalSuccessful}/${totalProcessed} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${totalSuccessful} calls from Outreach`,
        data: {
          processed: totalProcessed,
          successful: totalSuccessful,
          failed: totalFailed,
          calls_synced: totalSuccessful,
          sync_type: syncType
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Organization call sync error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Call sync failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper function to get Outreach calls for a prospect
async function getOutreachCallsForProspect(
  prospectId: string, 
  accessToken: string, 
  daysBack: number = 30
): Promise<OutreachCall[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  
  const searchParams = new URLSearchParams({
    'filter[prospect]': prospectId,
    'filter[occurredAt]': `${since.toISOString()}..`,
    'sort': '-occurredAt',
    'page[limit]': '100'
  });

  let allCalls: OutreachCall[] = [];
  let nextUrl = `https://api.outreach.io/api/v2/calls?${searchParams.toString()}`;

  // Paginate through all calls
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.detail || 
        `Outreach API error: ${response.status}`
      );
    }

    const data = await response.json();
    allCalls = allCalls.concat(data.data || []);

    // Check for next page
    nextUrl = data.links?.next || null;
    
    // Prevent infinite loops - max 10 pages (1000 calls)
    if (allCalls.length >= 1000) {
      break;
    }
  }

  return allCalls;
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