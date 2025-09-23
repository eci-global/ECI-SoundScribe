import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentRecordings() {
  console.log('🔍 Checking recent recordings status...\n');

  try {
    // Get recent recordings with their status
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select(`
        id,
        name,
        status,
        processing_progress,
        created_at,
        updated_at,
        duration,
        transcript,
        ai_summary,
        ai_insights,
        ai_score
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching recordings:', error);
      return;
    }

    console.log(`📊 Found ${recordings.length} recent recordings:\n`);

    recordings.forEach((recording, index) => {
      console.log(`${index + 1}. ${recording.name || recording.id}`);
      console.log(`   Status: ${recording.status || 'unknown'}`);
      console.log(`   Progress: ${recording.processing_progress || 'N/A'}`);
      console.log(`   Duration: ${recording.duration || 'N/A'}`);
      console.log(`   Score: ${recording.ai_score || 'N/A'}`);
      console.log(`   Created: ${new Date(recording.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(recording.updated_at).toLocaleString()}`);
      console.log(`   Has Transcript: ${recording.transcript ? 'Yes' : 'No'}`);
      console.log(`   Has Summary: ${recording.ai_summary ? 'Yes' : 'No'}`);
      console.log(`   Has Insights: ${recording.ai_insights ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check for any recordings that might be stuck in error state
    const errorRecordings = recordings.filter(r => r.status === 'error');
    if (errorRecordings.length > 0) {
      console.log(`⚠️  Found ${errorRecordings.length} recordings with error status:`);
      errorRecordings.forEach(recording => {
        console.log(`   - ${recording.name || recording.id} (${recording.processing_progress || 'N/A'} progress)`);
      });
    }

    // Check for completed recordings
    const completedRecordings = recordings.filter(r => r.status === 'completed');
    if (completedRecordings.length > 0) {
      console.log(`✅ Found ${completedRecordings.length} completed recordings:`);
      completedRecordings.forEach(recording => {
        console.log(`   - ${recording.name || recording.id} (Score: ${recording.ai_score || 'N/A'})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRecentRecordings(); 