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

async function checkAllRecordings() {
  console.log('🔍 Checking ALL recordings in database...\n');

  try {
    // Get ALL recordings without user filter
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching recordings:', error);
      return;
    }

    console.log(`📊 Found ${recordings.length} total recordings in database:\n`);

    if (recordings.length === 0) {
      console.log('📭 No recordings found in database at all');
      return;
    }

    // Show first 10 recordings
    recordings.slice(0, 10).forEach((recording, index) => {
      console.log(`${index + 1}. ID: ${recording.id}`);
      console.log(`   User ID: ${recording.user_id || 'N/A'}`);
      console.log(`   Title: ${recording.title || 'N/A'}`);
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

    // Check status distribution
    const statusCounts = {};
    recordings.forEach(r => {
      const status = r.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} recordings`);
    });

    // Check for recordings with error status
    const errorRecordings = recordings.filter(r => r.status === 'error');
    if (errorRecordings.length > 0) {
      console.log(`\n⚠️  Found ${errorRecordings.length} recordings with error status:`);
      errorRecordings.slice(0, 5).forEach(recording => {
        console.log(`   - ${recording.title || recording.id} (User: ${recording.user_id})`);
      });
    }

    // Check for completed recordings
    const completedRecordings = recordings.filter(r => r.status === 'completed');
    if (completedRecordings.length > 0) {
      console.log(`\n✅ Found ${completedRecordings.length} completed recordings:`);
      completedRecordings.slice(0, 5).forEach(recording => {
        console.log(`   - ${recording.title || recording.id} (Score: ${recording.ai_score || 'N/A'})`);
      });
    }

    // Check for recordings from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecordings = recordings.filter(r => new Date(r.created_at) >= today);
    console.log(`\n📅 Recordings from today: ${todayRecordings.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAllRecordings(); 