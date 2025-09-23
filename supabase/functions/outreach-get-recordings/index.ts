import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

interface GetRecordingsRequest {
  userId: string;
  limit?: number;
  after?: string;
  before?: string;
}

interface OutreachRecording {
  id: string;
  title: string;
  description?: string;
  recordedAt: string;
  duration?: number;
  downloadUrl: string;
  prospect: {
    name: string;
    email: string;
    company?: string;
  };
  rep: {
    name: string;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, limit = 50, after, before }: GetRecordingsRequest = await req.json();
    
    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }

    console.log('Get recordings request:', { userId, limit, after, before });

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's Outreach connection from the database
    const { data: connection, error: connectionError } = await supabase
      .from('outreach_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      console.error('Connection query error:', connectionError);
      throw new Error('Outreach connection not found. Please reconnect your account.');
    }

    console.log('Found connection:', {
      id: connection.id,
      user_id: connection.user_id,
      expires_at: connection.token_expires_at,
      email: connection.outreach_user_email
    });

    // Check if token is expired
    if (new Date(connection.token_expires_at) <= new Date()) {
      // Try to refresh the token
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
        'outreach-refresh-token',
        {
          body: { 
            userId,
            refreshToken: connection.refresh_token
          }
        }
      );

      if (refreshError || !refreshData?.success) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Token expired and refresh failed. Please reconnect your account.');
      }

      console.log('Token refreshed successfully');

      // Get the updated connection
      const { data: updatedConnection, error: updateError } = await supabase
        .from('outreach_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (updateError || !updatedConnection) {
        throw new Error('Failed to retrieve updated token.');
      }

      connection.access_token = updatedConnection.access_token;
    }

    // Build API request parameters
    const params = new URLSearchParams();
    params.append('page[limit]', limit.toString());
    
    if (after) params.append('page[after]', after);
    if (before) params.append('page[before]', before);
    
    // Include related data (only prospect - we have scope for this)
    params.append('include', 'prospect');

    // Make request to Outreach API
    const response = await fetch(`https://api.outreach.io/api/v2/calls?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Outreach API error:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      throw new Error(`Failed to fetch recordings from Outreach: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    // Transform Outreach data to our format
    const recordings: OutreachRecording[] = data.data
      .filter((call: any) => call.attributes.recordingUrl) // Only calls with recordings
      .map((call: any) => {
        // Find related prospect data
        const prospectData = data.included?.find(
          (item: any) => item.type === 'prospect' && item.id === call.relationships?.prospect?.data?.id
        );

        return {
          id: call.id,
          title: call.attributes.purpose || `Call with ${prospectData?.attributes?.firstName || 'Unknown'} ${prospectData?.attributes?.lastName || ''}`,
          description: call.attributes.note || undefined,
          recordedAt: call.attributes.completedAt || call.attributes.createdAt,
          duration: call.attributes.duration,
          downloadUrl: call.attributes.recordingUrl,
          prospect: {
            name: prospectData ? `${prospectData.attributes.firstName || ''} ${prospectData.attributes.lastName || ''}`.trim() : 'Unknown',
            email: prospectData?.attributes?.emails?.[0]?.email || '',
            company: prospectData?.attributes?.company?.name || undefined,
          },
          rep: {
            name: call.attributes.createdBy?.name || 'Unknown',
            email: call.attributes.createdBy?.email || '',
          }
        };
      });

    const result = {
      recordings,
      hasMore: !!data.links?.next,
      nextCursor: data.meta?.page?.after
    };

    // Log successful operation
    await supabase
      .from('outreach_sync_logs')
      .insert({
        user_id: userId,
        operation_type: 'recording_fetch',
        status: 'success',
        outreach_resource_type: 'calls',
        response_payload: {
          recordings_count: recordings.length,
          has_more: result.hasMore
        },
      });

    return createSuccessResponse(result);

  } catch (error: any) {
    console.error('Get recordings error:', error);
    
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
              operation_type: 'recording_fetch',
              status: 'error',
              outreach_resource_type: 'calls',
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

    return createErrorResponse(error.message || 'Failed to fetch recordings', 400);
  }
});