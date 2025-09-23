import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  recording_id: string;
  force?: boolean; // Force deletion even if some parts fail
}

interface DeleteStats {
  recording: boolean;
  storage: boolean;
  embeddings: number;
  chatSessions: number;
  chatMessages: number;
  aiMoments: number;
  speakerSegments: number;
  topicSegments: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recording_id, force = false }: DeleteRequest = await req.json();
    
    if (!recording_id) {
      throw new Error('Recording ID is required');
    }

    console.log(`Starting comprehensive deletion for recording: ${recording_id}`);

    // Initialize Supabase client with service role for complete access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats: DeleteStats = {
      recording: false,
      storage: false,
      embeddings: 0,
      chatSessions: 0,
      chatMessages: 0,
      aiMoments: 0,
      speakerSegments: 0,
      topicSegments: 0,
      errors: []
    };

    // Step 1: Get recording details before deletion
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, file_url, user_id')
      .eq('id', recording_id)
      .single();

    if (fetchError || !recording) {
      throw new Error(`Recording not found: ${fetchError?.message || 'Unknown error'}`);
    }

    console.log('Recording found:', { id: recording.id, has_file: !!recording.file_url });

    // Step 2: Delete embeddings if they exist
    try {
      const { count: embeddingsCount } = await supabase
        .from('recording_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('recording_id', recording_id);

      if (embeddingsCount && embeddingsCount > 0) {
        const { error } = await supabase
          .from('recording_embeddings')
          .delete()
          .eq('recording_id', recording_id);

        if (error) throw error;
        stats.embeddings = embeddingsCount;
        console.log(`Deleted ${embeddingsCount} embeddings`);
      }
    } catch (error) {
      const message = `Failed to delete embeddings: ${error.message}`;
      console.error(message);
      stats.errors.push(message);
      if (!force) throw error;
    }

    // Step 3: Delete chat data
    try {
      // Get chat sessions count
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('recording_id', recording_id);

      if (sessions && sessions.length > 0) {
        // Count messages
        const { count: messagesCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessions.map(s => s.id));

        stats.chatMessages = messagesCount || 0;
        stats.chatSessions = sessions.length;

        // Delete will cascade
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('recording_id', recording_id);

        if (error) throw error;
        console.log(`Deleted ${sessions.length} chat sessions and ${messagesCount} messages`);
      }
    } catch (error) {
      const message = `Failed to delete chat data: ${error.message}`;
      console.error(message);
      stats.errors.push(message);
      if (!force) throw error;
    }

    // Step 4: Delete analytics data (should cascade, but let's be explicit)
    try {
      // Delete AI moments
      const { count: momentsCount } = await supabase
        .from('ai_moments')
        .select('*', { count: 'exact', head: true })
        .eq('recording_id', recording_id);

      if (momentsCount && momentsCount > 0) {
        const { error } = await supabase
          .from('ai_moments')
          .delete()
          .eq('recording_id', recording_id);

        if (error) throw error;
        stats.aiMoments = momentsCount;
      }

      // Delete speaker segments
      const { count: speakerCount } = await supabase
        .from('speaker_segments')
        .select('*', { count: 'exact', head: true })
        .eq('recording_id', recording_id);

      if (speakerCount && speakerCount > 0) {
        const { error } = await supabase
          .from('speaker_segments')
          .delete()
          .eq('recording_id', recording_id);

        if (error) throw error;
        stats.speakerSegments = speakerCount;
      }

      // Delete topic segments
      const { count: topicCount } = await supabase
        .from('topic_segments')
        .select('*', { count: 'exact', head: true })
        .eq('recording_id', recording_id);

      if (topicCount && topicCount > 0) {
        const { error } = await supabase
          .from('topic_segments')
          .delete()
          .eq('recording_id', recording_id);

        if (error) throw error;
        stats.topicSegments = topicCount;
      }

      console.log(`Deleted analytics: ${stats.aiMoments} moments, ${stats.speakerSegments} speakers, ${stats.topicSegments} topics`);
    } catch (error) {
      const message = `Failed to delete analytics data: ${error.message}`;
      console.error(message);
      stats.errors.push(message);
      if (!force) throw error;
    }

    // Step 5: Delete from storage
    if (recording.file_url) {
      try {
        const url = new URL(recording.file_url);
        const pathParts = url.pathname.split('/');
        const recordingsIndex = pathParts.indexOf('recordings');
        
        if (recordingsIndex !== -1 && recordingsIndex + 1 < pathParts.length) {
          const filePath = pathParts.slice(recordingsIndex + 1).join('/');
          
          console.log('Deleting file from storage:', filePath);
          
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove([filePath]);
          
          if (storageError) throw storageError;
          stats.storage = true;
          console.log('Storage file deleted successfully');
        }
      } catch (error) {
        const message = `Failed to delete storage file: ${error.message}`;
        console.error(message);
        stats.errors.push(message);
        // Continue even if storage deletion fails
      }
    }

    // Step 6: Finally, delete the recording itself
    try {
      const { error: deleteError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recording_id);

      if (deleteError) throw deleteError;
      stats.recording = true;
      console.log('Recording record deleted successfully');
    } catch (error) {
      const message = `Failed to delete recording record: ${error.message}`;
      console.error(message);
      stats.errors.push(message);
      if (!force) throw error;
    }

    // Log the deletion event for audit
    await supabase.from('admin_metrics').insert({
      metric_type: 'recording_deleted',
      metric_value: 1,
      metadata: {
        recording_id,
        stats,
        timestamp: new Date().toISOString(),
        success: stats.recording && (stats.storage || !recording.file_url)
      }
    });

    const success = stats.recording && (stats.errors.length === 0 || force);

    console.log(`Comprehensive deletion completed. Success: ${success}`, stats);

    return new Response(
      JSON.stringify({ 
        success,
        message: success 
          ? 'Recording and all associated data deleted successfully'
          : 'Deletion completed with some errors',
        stats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 207, // 207 Multi-Status for partial success
      }
    );

  } catch (error) {
    console.error('Comprehensive delete error:', error);
    
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