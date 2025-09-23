import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixResult {
  recordingId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔧 Starting stuck recordings recovery...');

    // Find recordings stuck in processing for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckRecordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript, ai_summary, duration, created_at, error_message')
      .eq('status', 'processing')
      .lt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch stuck recordings: ${fetchError.message}`);
    }

    if (!stuckRecordings || stuckRecordings.length === 0) {
      console.log('✅ No stuck recordings found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stuck recordings found',
          fixed: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚨 Found ${stuckRecordings.length} stuck recordings`);

    const fixes: FixResult[] = [];
    
    for (const recording of stuckRecordings) {
      const age = Math.round((Date.now() - new Date(recording.created_at).getTime()) / 60000);
      console.log(`🔍 Analyzing: ${recording.title} (${age} minutes old)`);
      
      let newStatus: string;
      let reason: string;
      
      // Determine appropriate status based on what was completed
      if (recording.transcript && recording.ai_summary) {
        newStatus = 'completed';
        reason = 'Has both transcript and AI summary';
      } else if (recording.transcript && !recording.ai_summary) {
        newStatus = 'transcribed';
        reason = 'Has transcript but missing AI summary';
      } else if (!recording.transcript) {
        // Check if this should be marked as failed
        if (age > 15) { // Stuck for more than 15 minutes without transcript
          newStatus = 'failed';
          reason = 'No transcript after 15+ minutes - likely processing failed';
        } else {
          console.log(`⏳ Skipping ${recording.title} - still within processing window`);
          continue;
        }
      } else {
        newStatus = 'transcribed';
        reason = 'Default fallback status';
      }

      // Update the recording status
      const { data: updateData, error: updateError } = await supabase
        .from('recordings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          processing_progress: newStatus === 'completed' ? 100 : 90,
          error_message: newStatus === 'failed' ? 'Processing timeout - manually recovered' : null
        })
        .eq('id', recording.id)
        .select('id, status');

      if (updateError) {
        console.error(`❌ Failed to update ${recording.id}:`, updateError);
        fixes.push({
          recordingId: recording.id,
          oldStatus: recording.status,
          newStatus: 'ERROR',
          reason: `Update failed: ${updateError.message}`
        });
      } else {
        console.log(`✅ Fixed ${recording.title}: ${recording.status} → ${newStatus}`);
        fixes.push({
          recordingId: recording.id,
          oldStatus: recording.status,
          newStatus: newStatus,
          reason: reason
        });
      }
    }

    const successful = fixes.filter(f => f.newStatus !== 'ERROR').length;
    const failed = fixes.filter(f => f.newStatus === 'ERROR').length;

    console.log(`🎉 Recovery complete: ${successful} fixed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${successful} stuck recordings${failed > 0 ? `, ${failed} failed` : ''}`,
        totalFound: stuckRecordings.length,
        totalFixed: successful,
        totalFailed: failed,
        fixes: fixes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Stuck recordings recovery failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});