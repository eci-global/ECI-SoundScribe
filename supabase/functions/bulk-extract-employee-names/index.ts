// Bulk Extract Employee Names from All Recordings with Transcripts
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  limit?: number;
  skip_existing?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  try {
    // Parse request
    const body: RequestBody = await req.json().catch(() => ({}));
    const { limit = 50, skip_existing = true } = body;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🚀 Starting bulk employee name extraction (limit: ${limit}, skip_existing: ${skip_existing})`);

    // Build query for recordings that need employee name extraction
    let query = supabase
      .from('recordings')
      .select('id, title, transcript, employee_name')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Optionally skip recordings that already have employee names
    if (skip_existing) {
      query = query.or('employee_name.is.null,employee_name.eq.');
    }

    const { data: recordings, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Failed to fetch recordings:', fetchError);
      return createErrorResponse('Failed to fetch recordings', 500);
    }

    if (!recordings || recordings.length === 0) {
      console.log('📭 No recordings found that need employee name extraction');
      return createSuccessResponse({
        processed: 0,
        successful: 0,
        failed: 0,
        message: 'No recordings found that need processing'
      });
    }

    console.log(`📋 Found ${recordings.length} recordings to process`);

    // Process each recording
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const recording of recordings) {
      try {
        console.log(`🔍 Processing recording: ${recording.id} - "${recording.title}"`);

        // Call the extract-employee-name function
        const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-employee-name`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recording_id: recording.id
          })
        });

        results.processed++;

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          console.log(`✅ Successfully processed: ${recording.id}`, extractResult);
          results.successful++;
        } else {
          const errorText = await extractResponse.text();
          console.error(`❌ Failed to process: ${recording.id}`, errorText);
          results.failed++;
          results.errors.push(`${recording.id}: ${errorText.substring(0, 100)}`);
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`💥 Error processing recording ${recording.id}:`, error);
        results.processed++;
        results.failed++;
        results.errors.push(`${recording.id}: ${error.message}`);
      }
    }

    console.log(`🎉 Bulk processing complete:`, results);

    return createSuccessResponse({
      ...results,
      message: `Processed ${results.processed} recordings: ${results.successful} successful, ${results.failed} failed`
    });

  } catch (error) {
    console.error('💥 Error in bulk-extract-employee-names:', error);
    return createErrorResponse(
      `Failed to bulk extract employee names: ${error.message}`,
      500
    );
  }
});