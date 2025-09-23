
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, credentials, userId } = await req.json();
    console.log(`Starting ${type} import for user:`, userId);

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let recordings: any[] = [];

    if (type === 'outreach') {
      console.log('Importing from Outreach.io with API key:', credentials.apiKey);
      
      try {
        // Call Outreach.io API to get recordings
        const response = await fetch('https://api.outreach.io/api/v2/calls?include=prospect&filter[recordingUrl][exists]=true', {
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/vnd.api+json',
          },
        });

        if (!response.ok) {
          throw new Error(`Outreach API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        recordings = data.data
          .filter((call: any) => call.attributes.recordingUrl)
          .map((call: any) => {
            const prospectData = data.included?.find(
              (item: any) => item.type === 'prospect' && item.id === call.relationships?.prospect?.data?.id
            );

            return {
              title: call.attributes.purpose || `Call with ${prospectData?.attributes?.firstName || 'Unknown'} ${prospectData?.attributes?.lastName || ''}`,
              description: `Imported from Outreach.io - ${call.attributes.note || 'No description'}`,
              file_type: 'audio',
              duration: call.attributes.duration || 0,
              status: 'processing',
              summary: call.attributes.note || 'Call imported from Outreach.io',
              external_id: call.id,
              external_source: 'outreach',
              external_url: call.attributes.recordingUrl,
              prospect_name: prospectData ? `${prospectData.attributes.firstName || ''} ${prospectData.attributes.lastName || ''}`.trim() : 'Unknown',
              prospect_company: prospectData?.attributes?.company?.name || undefined
            };
          });

        if (recordings.length === 0) {
          throw new Error('No recordings with audio files found in Outreach.io');
        }
      } catch (error) {
        console.error('Error fetching from Outreach API:', error);
        throw new Error(`Failed to fetch recordings from Outreach.io: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (type === 'vonage') {
      // Mock Vonage import - in real implementation you'd call their API
      console.log('Importing from Vonage with credentials:', credentials.apiKey);
      
      recordings = [
        {
          title: 'Vonage Call Recording - Customer Support',
          description: 'Customer support call imported from Vonage',
          file_type: 'audio',
          duration: 480, // 8 minutes
          status: 'completed',
          summary: 'Customer support call resolving technical issues and providing solutions.'
        },
        {
          title: 'Vonage Conference Call - Team Meeting',
          description: 'Team meeting imported from Vonage',
          file_type: 'audio',
          duration: 1800, // 30 minutes
          status: 'completed',
          summary: 'Weekly team meeting discussing project progress and upcoming milestones.'
        }
      ];
    }

    // Insert recordings into database
    for (const recording of recordings) {
      const recordingData = {
        user_id: userId,
        title: recording.title,
        description: recording.description,
        file_type: recording.file_type,
        duration: recording.duration,
        status: recording.status,
        summary: recording.summary,
        transcript: recording.transcript || `[Imported from ${type}] Processing transcript for ${recording.title}`,
        file_url: recording.external_url || null,
        audio_url: recording.external_url || null,
        external_id: recording.external_id || null,
        external_source: recording.external_source || type,
        metadata: recording.prospect_name || recording.prospect_company ? {
          prospect_name: recording.prospect_name,
          prospect_company: recording.prospect_company,
          imported_from: type,
          imported_at: new Date().toISOString()
        } : null
      };

      const { error: insertError } = await supabase
        .from('recordings')
        .insert(recordingData);

      if (insertError) {
        console.error('Error inserting recording:', insertError);
        throw new Error(`Failed to insert recording: ${insertError.message}`);
      }
    }

    console.log(`Successfully imported ${recordings.length} recordings from ${type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${recordings.length} recordings from ${type}`,
        count: recordings.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in import function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
