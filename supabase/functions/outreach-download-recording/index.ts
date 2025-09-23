import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

interface DownloadRecordingRequest {
  userId: string;
  recordingUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, recordingUrl }: DownloadRecordingRequest = await req.json();
    
    if (!userId || !recordingUrl) {
      throw new Error('Missing required parameters: userId and recordingUrl');
    }

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
      throw new Error('Outreach connection not found. Please reconnect your account.');
    }

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
        throw new Error('Token expired and refresh failed. Please reconnect your account.');
      }

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

    // Download the recording file from Outreach
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Outreach recording download error:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }

    // Get the file as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for transmission
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Get content type from response headers
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    // Log successful operation
    await supabase
      .from('outreach_sync_logs')
      .insert({
        user_id: userId,
        operation_type: 'recording_download',
        status: 'success',
        outreach_resource_type: 'recording_file',
        response_payload: {
          content_type: contentType,
          file_size: arrayBuffer.byteLength
        },
      });

    return createSuccessResponse({
      data: base64Data,
      contentType: contentType,
      size: arrayBuffer.byteLength
    });

  } catch (error: any) {
    console.error('Download recording error:', error);
    
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
              operation_type: 'recording_download',
              status: 'error',
              outreach_resource_type: 'recording_file',
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

    return createErrorResponse(error.message || 'Failed to download recording', 400);
  }
});