// Script to manually fix stuck recordings
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixStuckRecording(recordingId) {
  console.log(`🔧 Attempting to fix stuck recording: ${recordingId}`);
  
  try {
    // Fetch the recording
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();
      
    if (fetchError) {
      console.error('❌ Failed to fetch recording:', fetchError);
      return;
    }
    
    if (!recording) {
      console.error('❌ Recording not found');
      return;
    }
    
    console.log('📊 Recording details:');
    console.log(`  - Title: ${recording.title}`);
    console.log(`  - Status: ${recording.status}`);
    console.log(`  - Created: ${recording.created_at}`);
    console.log(`  - File size: ${recording.file_size ? (recording.file_size / (1024 * 1024)).toFixed(1) + 'MB' : 'unknown'}`);
    console.log(`  - Has transcript: ${!!recording.transcript}`);
    console.log(`  - Has AI summary: ${!!recording.ai_summary}`);
    console.log(`  - Processing notes: ${recording.processing_notes || 'none'}`);
    console.log(`  - Error message: ${recording.error_message || 'none'}`);
    
    const age = Math.round((Date.now() - new Date(recording.created_at).getTime()) / 60000);
    console.log(`  - Age: ${age} minutes`);
    
    // Determine appropriate action
    let newStatus = recording.status;
    let updates = {};
    
    if (recording.status === 'processing') {
      if (recording.transcript && recording.ai_summary) {
        newStatus = 'completed';
        updates = {
          status: 'completed',
          processing_progress: 100,
          updated_at: new Date().toISOString()
        };
        console.log('✅ Recording has transcript and summary - marking as completed');
      } else if (recording.transcript && !recording.ai_summary) {
        newStatus = 'transcribed';
        updates = {
          status: 'transcribed',
          processing_progress: 75,
          updated_at: new Date().toISOString()
        };
        console.log('⚠️ Recording has transcript but no summary - marking as transcribed');
      } else if (age > 30) {
        newStatus = 'failed';
        updates = {
          status: 'failed',
          error_message: `Processing timeout after ${age} minutes - large file may need manual processing`,
          processing_progress: 0,
          updated_at: new Date().toISOString()
        };
        console.log('❌ Recording has been stuck for too long - marking as failed');
      } else {
        console.log('⏳ Recording might still be processing...');
        
        // Check if it's a large file that should use Azure backend
        if (recording.file_size && recording.file_size > 25 * 1024 * 1024) {
          console.log('🚀 This is a large file - should be processed by Azure backend');
          updates = {
            processing_notes: `Large file (${(recording.file_size / (1024 * 1024)).toFixed(1)}MB) - requires Azure backend processing`,
            updated_at: new Date().toISOString()
          };
        }
      }
    }
    
    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('recordings')
        .update(updates)
        .eq('id', recordingId);
        
      if (updateError) {
        console.error('❌ Failed to update recording:', updateError);
      } else {
        console.log(`✅ Recording updated: ${recording.status} → ${newStatus}`);
      }
    } else {
      console.log('ℹ️ No updates needed');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the fix for the specific recording
const recordingId = 'a489cc7c-1386-40e7-82cd-7666c2c4eab2';
console.log('🚀 Starting manual fix for stuck recording...');
console.log(`📁 File: VDI creation-20240123_164354-Meeting Recording.mp4`);
console.log(`🆔 Recording ID: ${recordingId}`);
console.log('');

fixStuckRecording(recordingId).then(() => {
  console.log('\n✅ Fix attempt completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fix failed:', error);
  process.exit(1);
});