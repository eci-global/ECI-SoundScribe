import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('🔧 Auto-fix stuck recordings service started');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Find recordings that are stuck in processing but have transcripts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckRecordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript, ai_summary, created_at')
      .eq('status', 'processing')
      .not('transcript', 'is', null)
      .lt('created_at', fiveMinutesAgo)
      .limit(100);

    if (fetchError) {
      console.error('❌ Error fetching stuck recordings:', fetchError);
      throw fetchError;
    }

    if (!stuckRecordings || stuckRecordings.length === 0) {
      console.log('✅ No stuck recordings found');
      return createSuccessResponse({
        message: 'No stuck recordings found',
        fixed: 0,
        checked: 'All recordings are in correct status'
      });
    }

    console.log(`🎯 Found ${stuckRecordings.length} recordings with transcripts stuck in processing`);

    // Fix them by updating to completed status
    const fixes = [];
    for (const recording of stuckRecordings) {
      const age = Math.round((Date.now() - new Date(recording.created_at).getTime()) / 60000);
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          processing_progress: 100
        })
        .eq('id', recording.id);

      if (updateError) {
        console.error(`❌ Failed to fix ${recording.title}:`, updateError);
        fixes.push({
          id: recording.id,
          title: recording.title,
          status: 'error',
          error: updateError.message
        });
      } else {
        console.log(`✅ Fixed: ${recording.title} (${age} minutes old)`);
        fixes.push({
          id: recording.id,
          title: recording.title,
          status: 'fixed',
          age: age
        });
      }
    }

    const successful = fixes.filter(f => f.status === 'fixed').length;
    const failed = fixes.filter(f => f.status === 'error').length;

    console.log(`🎉 Auto-fix completed: ${successful} fixed, ${failed} failed`);

    return createSuccessResponse({
      message: `Auto-fix completed: ${successful} recordings fixed`,
      totalFound: stuckRecordings.length,
      successful,
      failed,
      fixes: fixes
    });

  } catch (error) {
    console.error('❌ Auto-fix service error:', error);
    return createErrorResponse(
      'Auto-fix service failed',
      500,
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    );
  }
});