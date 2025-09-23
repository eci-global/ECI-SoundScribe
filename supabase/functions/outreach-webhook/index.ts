import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-outreach-signature',
};

interface WebhookPayload {
  data: {
    type: string;
    id: string;
    attributes: any;
    relationships?: any;
  };
  meta: {
    eventName: string;
    eventTime: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('OUTREACH_WEBHOOK_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get('x-outreach-signature');

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      const receivedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== receivedSignature) {
        console.error('Webhook signature verification failed');
        return new Response('Unauthorized', { 
          status: 401,
          headers: corsHeaders
        });
      }
    }

    const payload: WebhookPayload = JSON.parse(body);
    const { data, meta } = payload;

    console.log('Received webhook:', {
      eventName: meta.eventName,
      resourceType: data.type,
      resourceId: data.id
    });

    // Process different event types
    switch (meta.eventName) {
      case 'prospect.created':
      case 'prospect.updated':
        await handleProspectEvent(data, meta, supabase);
        break;
        
      case 'call.created':
      case 'call.updated':
        await handleCallEvent(data, meta, supabase);
        break;
        
      case 'account.created':
      case 'account.updated':
        await handleAccountEvent(data, meta, supabase);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${meta.eventName}`);
    }

    // Log webhook receipt
    await supabase
      .from('outreach_sync_logs')
      .insert({
        id: crypto.randomUUID(),
        operation_type: 'webhook_received',
        status: 'success',
        request_payload: {
          event_name: meta.eventName,
          resource_type: data.type,
          resource_id: data.id
        },
        response_payload: {
          processed: true,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Log webhook error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('outreach_sync_logs')
        .insert({
          id: crypto.randomUUID(),
          operation_type: 'webhook_received',
          status: 'error',
          error_details: {
            message: error.message,
            stack: error.stack
          }
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Handle prospect-related events
async function handleProspectEvent(data: any, meta: any, supabase: any) {
  const prospectId = data.id;
  const prospectData = data.attributes;

  console.log(`Processing prospect event: ${meta.eventName} for prospect ${prospectId}`);

  // Update any existing prospect mappings with latest data
  const { data: mappings, error } = await supabase
    .from('outreach_prospect_mappings')
    .select('*')
    .eq('outreach_prospect_id', prospectId);

  if (error) {
    console.error('Error fetching prospect mappings:', error);
    return;
  }

  if (mappings && mappings.length > 0) {
    // Update mappings with latest prospect data
    const updates = {
      prospect_name: prospectData.name || `${prospectData.firstName} ${prospectData.lastName}`,
      prospect_email: prospectData.email,
      prospect_company: prospectData.company,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('outreach_prospect_mappings')
      .update(updates)
      .eq('outreach_prospect_id', prospectId);

    console.log(`Updated ${mappings.length} prospect mapping(s) for prospect ${prospectId}`);
  }
}

// Handle call-related events
async function handleCallEvent(data: any, meta: any, supabase: any) {
  const callId = data.id;
  const callData = data.attributes;

  console.log(`Processing call event: ${meta.eventName} for call ${callId}`);

  // Check if this call was created by our integration
  // (calls created by Echo AI Scribe should have our specific subject format)
  const isEchoCall = callData.subject && callData.subject.startsWith('Call:') && 
                    callData.body && callData.body.includes('🎯 Generated by Echo AI Scribe');

  if (isEchoCall) {
    console.log(`Detected Echo AI call update: ${callId}`);
    
    // Update any related sync logs
    await supabase
      .from('outreach_sync_logs')
      .update({
        response_payload: {
          ...callData,
          webhook_received: true,
          webhook_time: meta.eventTime
        },
        updated_at: new Date().toISOString()
      })
      .eq('outreach_resource_id', callId)
      .eq('operation_type', 'activity_create');
  }
}

// Handle account-related events
async function handleAccountEvent(data: any, meta: any, supabase: any) {
  const accountId = data.id;
  const accountData = data.attributes;

  console.log(`Processing account event: ${meta.eventName} for account ${accountId}`);

  // Update any prospect mappings that reference this account
  // This could be useful for keeping company information in sync
  if (accountData.name) {
    const { error } = await supabase
      .from('outreach_prospect_mappings')
      .update({
        prospect_company: accountData.name,
        updated_at: new Date().toISOString()
      })
      .eq('prospect_company', accountData.name);

    if (error) {
      console.error('Error updating prospect mappings for account:', error);
    }
  }
}