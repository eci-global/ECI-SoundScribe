import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurgeStats {
  audioFilesDeleted: number;
  summariesDeleted: number;
  chunksDeleted: number;
  recordingsDeleted: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting data purge process...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats: PurgeStats = {
      audioFilesDeleted: 0,
      summariesDeleted: 0,
      chunksDeleted: 0,
      recordingsDeleted: 0,
      errors: []
    };

    // 1. Delete audio files older than 24 hours
    await purgeAudioFiles(supabase, stats);

    // 2. Delete transcripts/summaries older than 30 days (configurable)
    await purgeSummaries(supabase, stats);

    // 3. Clean up orphaned chunks
    await purgeOrphanedChunks(supabase, stats);

    // 4. Clean up failed/orphaned recordings
    await purgeFailedRecordings(supabase, stats);

    console.log('Data purge completed:', stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data purge completed successfully',
        stats 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Data purge error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function purgeAudioFiles(supabase: any, stats: PurgeStats): Promise<void> {
  try {
    console.log('Purging audio files older than 24 hours...');
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Find recordings older than 24 hours that still have files
    const { data: oldRecordings, error: queryError } = await supabase
      .from('recordings')
      .select('id, file_url')
      .lt('created_at', twentyFourHoursAgo)
      .not('file_url', 'is', null);

    if (queryError) {
      throw new Error(`Failed to query old recordings: ${queryError.message}`);
    }

    console.log(`Found ${oldRecordings?.length || 0} recordings with files to purge`);

    for (const recording of oldRecordings || []) {
      try {
        if (recording.file_url) {
          // Extract file path from URL
          const url = new URL(recording.file_url);
          const pathParts = url.pathname.split('/');
          const recordingsIndex = pathParts.indexOf('recordings');
          
          if (recordingsIndex !== -1 && recordingsIndex + 1 < pathParts.length) {
            const filePath = pathParts.slice(recordingsIndex + 1).join('/');
            
            // Delete from storage
            const { error: deleteError } = await supabase.storage
              .from('recordings')
              .remove([filePath]);

            if (deleteError) {
              console.warn(`Failed to delete file ${filePath}:`, deleteError);
              stats.errors.push(`Failed to delete file ${filePath}: ${deleteError.message}`);
            } else {
              stats.audioFilesDeleted++;
              console.log(`Deleted audio file: ${filePath}`);
            }
          }

          // Clear file_url from database
          await supabase
            .from('recordings')
            .update({ file_url: null })
            .eq('id', recording.id);
        }
      } catch (error) {
        console.warn(`Error processing recording ${recording.id}:`, error);
        stats.errors.push(`Error processing recording ${recording.id}: ${error}`);
      }
    }
  } catch (error) {
    console.error('Error in purgeAudioFiles:', error);
    stats.errors.push(`Audio purge error: ${error}`);
  }
}

async function purgeSummaries(supabase: any, stats: PurgeStats): Promise<void> {
  try {
    console.log('Purging summaries older than 30 days...');
    
    // Get retention period from environment (default 30 days)
    const retentionDays = parseInt(Deno.env.get('SUMMARY_RETENTION_DAYS') || '30');
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    
    // Clear summary and transcript data for old recordings
    const { data: updatedRecordings, error: updateError } = await supabase
      .from('recordings')
      .update({ 
        summary: null, 
        transcript: null,
        coaching_evaluation: null
      })
      .lt('created_at', cutoffDate)
      .or('summary.not.is.null,transcript.not.is.null,coaching_evaluation.not.is.null')
      .select('id');

    if (updateError) {
      throw new Error(`Failed to purge summaries: ${updateError.message}`);
    }

    stats.summariesDeleted = updatedRecordings?.length || 0;
    console.log(`Purged summaries for ${stats.summariesDeleted} recordings`);

  } catch (error) {
    console.error('Error in purgeSummaries:', error);
    stats.errors.push(`Summary purge error: ${error}`);
  }
}

async function purgeOrphanedChunks(supabase: any, stats: PurgeStats): Promise<void> {
  try {
    console.log('Purging orphaned transcript chunks...');
    
    // Delete chunks for recordings that no longer exist or have no transcript
    const { error: deleteError, count } = await supabase
      .from('transcript_chunks')
      .delete()
      .not('job_id', 'in', `(
        SELECT id FROM recordings 
        WHERE transcript IS NOT NULL 
        AND transcript != ''
      )`);

    if (deleteError) {
      throw new Error(`Failed to purge chunks: ${deleteError.message}`);
    }

    stats.chunksDeleted = count || 0;
    console.log(`Deleted ${stats.chunksDeleted} orphaned chunks`);

  } catch (error) {
    console.error('Error in purgeOrphanedChunks:', error);
    stats.errors.push(`Chunk purge error: ${error}`);
  }
}

async function purgeFailedRecordings(supabase: any, stats: PurgeStats): Promise<void> {
  try {
    console.log('Purging failed recordings older than 7 days...');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Delete recordings that have been in failed state for more than 7 days
    const { error: deleteError, count } = await supabase
      .from('recordings')
      .delete()
      .eq('status', 'failed')
      .lt('created_at', sevenDaysAgo);

    if (deleteError) {
      throw new Error(`Failed to purge failed recordings: ${deleteError.message}`);
    }

    stats.recordingsDeleted = count || 0;
    console.log(`Deleted ${stats.recordingsDeleted} failed recordings`);

    // Also clean up recordings stuck in 'processing' or 'uploading' for more than 24 hours
    const { error: stuckError, count: stuckCount } = await supabase
      .from('recordings')
      .update({ status: 'failed' })
      .in('status', ['processing', 'uploading'])
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (stuckError) {
      console.warn('Failed to mark stuck recordings as failed:', stuckError);
    } else {
      console.log(`Marked ${stuckCount || 0} stuck recordings as failed`);
    }

  } catch (error) {
    console.error('Error in purgeFailedRecordings:', error);
    stats.errors.push(`Failed recordings purge error: ${error}`);
  }
}