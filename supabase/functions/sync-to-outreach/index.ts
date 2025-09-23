import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutreachConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  outreach_user_id?: string;
  outreach_org_id?: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  created_at: string;
  user_id: string;
  transcript?: string;
  ai_summary?: string;
  ai_insights?: any;
  ai_moments?: any[];
  ai_speaker_analysis?: any;
  coaching_evaluation?: any;
}

interface OutreachProspect {
  id: string;
  attributes: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, userId, manualProspectMapping } = await req.json();
    
    if (!recordingId || !userId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Outreach connection
    const { data: connection, error: connectionError } = await supabase
      .from('outreach_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      throw new Error('No Outreach connection found. Please connect your account first.');
    }

    // Check if token needs refresh
    const tokenExpired = new Date(connection.token_expires_at) <= new Date();
    if (tokenExpired) {
      // Attempt to refresh token
      const refreshResult = await refreshOutreachToken(connection, supabase);
      if (!refreshResult.success) {
        throw new Error('Outreach token expired and refresh failed. Please reconnect your account.');
      }
      connection.access_token = refreshResult.access_token;
    }

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found');
    }

    console.log('Starting sync for recording:', recording.title);

    // Log sync start
    const syncLogId = crypto.randomUUID();
    await supabase
      .from('outreach_sync_logs')
      .insert({
        id: syncLogId,
        user_id: userId,
        recording_id: recordingId,
        operation_type: 'activity_create',
        status: 'pending',
        request_payload: {
          recording_title: recording.title,
          manual_mapping: !!manualProspectMapping
        }
      });

    // Find or create prospects from recording
    let prospects: OutreachProspect[] = [];
    
    if (manualProspectMapping) {
      // Use manually provided prospect mapping
      prospects = manualProspectMapping;
    } else {
      // Auto-discover prospects from AI speaker analysis
      prospects = await findProspectsFromRecording(recording, connection.access_token);
    }

    if (prospects.length === 0) {
      await supabase
        .from('outreach_sync_logs')
        .update({
          status: 'error',
          error_details: {
            message: 'No prospects found for this recording'
          }
        })
        .eq('id', syncLogId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'No prospects could be identified from this recording. Please use manual mapping.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Create activities in Outreach for each prospect
    const activities = [];
    for (const prospect of prospects) {
      try {
        const activity = await createOutreachActivity(
          recording,
          prospect,
          connection.access_token
        );
        
        activities.push(activity);

        // Store prospect mapping
        await supabase
          .from('outreach_prospect_mappings')
          .upsert({
            user_id: userId,
            recording_id: recordingId,
            outreach_prospect_id: prospect.id,
            prospect_email: prospect.attributes.email,
            prospect_name: prospect.attributes.name,
            prospect_company: prospect.attributes.company,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });

        console.log(`Created activity for prospect: ${prospect.attributes.name}`);
      } catch (error: any) {
        console.error(`Failed to create activity for prospect ${prospect.attributes.name}:`, error);
        
        // Store failed prospect mapping
        await supabase
          .from('outreach_prospect_mappings')
          .upsert({
            user_id: userId,
            recording_id: recordingId,
            outreach_prospect_id: prospect.id,
            prospect_email: prospect.attributes.email,
            prospect_name: prospect.attributes.name,
            sync_status: 'error',
            error_message: error.message
          });
      }
    }

    // Update sync log
    await supabase
      .from('outreach_sync_logs')
      .update({
        status: 'success',
        response_payload: {
          prospects_synced: prospects.length,
          activities_created: activities.length,
          activity_ids: activities.map(a => a.id)
        }
      })
      .eq('id', syncLogId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced to ${prospects.length} prospect(s)`,
        data: {
          prospects_synced: prospects.length,
          activities_created: activities.length,
          activities: activities
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Sync error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Sync failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper function to refresh Outreach token
async function refreshOutreachToken(connection: OutreachConnection, supabase: any) {
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
      .eq('id', connection.id);

    return {
      success: true,
      access_token: tokenData.access_token
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper function to find prospects from recording
async function findProspectsFromRecording(
  recording: Recording, 
  accessToken: string
): Promise<OutreachProspect[]> {
  const prospects: OutreachProspect[] = [];

  // Extract emails from AI speaker analysis
  const speakerEmails: string[] = [];
  
  if (recording.ai_speaker_analysis?.identified_speakers) {
    for (const speaker of recording.ai_speaker_analysis.identified_speakers) {
      // Try to extract email from speaker name or text
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const speakerText = `${speaker.name} ${speaker.segments?.map(s => s.text).join(' ') || ''}`;
      const foundEmails = speakerText.match(emailRegex) || [];
      speakerEmails.push(...foundEmails);
    }
  }

  // Also check transcript for emails
  if (recording.transcript) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const transcriptEmails = recording.transcript.match(emailRegex) || [];
    speakerEmails.push(...transcriptEmails);
  }

  // Remove duplicates
  const uniqueEmails = [...new Set(speakerEmails)];

  // Search for prospects in Outreach by email
  for (const email of uniqueEmails) {
    try {
      const response = await fetch(
        `https://api.outreach.io/api/v2/prospects?filter[emails]=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          prospects.push(...data.data);
        }
      }
    } catch (error) {
      console.error(`Failed to search for prospect with email ${email}:`, error);
    }
  }

  return prospects;
}

// Helper function to create Outreach activity
async function createOutreachActivity(
  recording: Recording,
  prospect: OutreachProspect,
  accessToken: string
) {
  // Generate activity subject and body
  const subject = `Call: ${recording.title || 'Recorded Call'}`;
  
  let body = `📞 Call Recording Summary\n\n`;
  body += `Duration: ${recording.duration ? Math.round(recording.duration / 60) : 'Unknown'} minutes\n`;
  body += `Date: ${new Date(recording.created_at).toLocaleDateString()}\n\n`;
  
  if (recording.ai_summary) {
    body += `Summary:\n${recording.ai_summary}\n\n`;
  }
  
  if (recording.ai_insights) {
    if (recording.ai_insights.next_steps) {
      body += `Next Steps:\n${recording.ai_insights.next_steps}\n\n`;
    }
    if (recording.ai_insights.key_points) {
      body += `Key Points:\n${recording.ai_insights.key_points.join('\n')}\n\n`;
    }
  }

  // Add coaching insights if available
  if (recording.coaching_evaluation) {
    body += `Coaching Score: ${recording.coaching_evaluation.overallScore || 'N/A'}\n`;
    if (recording.coaching_evaluation.improvements) {
      body += `Areas for improvement: ${recording.coaching_evaluation.improvements.join(', ')}\n`;
    }
  }

  body += `\n🎯 Generated by Echo AI Scribe`;

  const payload = {
    data: {
      type: 'call',
      attributes: {
        subject: subject,
        body: body,
        callDisposition: 'completed',
        callDurationSeconds: recording.duration || 0,
        occurredAt: recording.created_at
      },
      relationships: {
        prospect: {
          data: {
            type: 'prospect',
            id: prospect.id
          }
        }
      }
    }
  };

  const response = await fetch('https://api.outreach.io/api/v2/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || `Failed to create activity: ${response.status}`);
  }

  return response.json();
}