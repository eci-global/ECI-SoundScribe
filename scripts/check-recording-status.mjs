import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRecordingStatus() {
  console.log('🔍 Checking most recent recording status...\n');

  try {
    // Get the most recent completed recording
    const { data: recordings, error: recError } = await supabase
      .from('recordings')
      .select('id, title, status, employee_name, transcript, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recError) {
      console.error('❌ Error fetching recordings:', recError);
      return;
    }

    if (!recordings || recordings.length === 0) {
      console.log('❌ No completed recordings found');
      return;
    }

    console.log(`📋 Found ${recordings.length} recent completed recordings:\n`);

    for (const recording of recordings) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📁 Recording: ${recording.title}`);
      console.log(`   ID: ${recording.id}`);
      console.log(`   Created: ${new Date(recording.created_at).toLocaleString()}`);
      console.log(`   Status: ${recording.status}`);
      console.log(`   Employee Name (AI detected): ${recording.employee_name || 'NONE'}`);
      console.log(`   Has Transcript: ${recording.transcript ? 'YES' : 'NO'}`);

      if (recording.transcript) {
        const preview = recording.transcript.substring(0, 200);
        console.log(`   Transcript Preview: "${preview}${recording.transcript.length > 200 ? '...' : ''}"`);
      }

      // Check if this recording has any participation records
      const { data: participation, error: partError } = await supabase
        .from('employee_call_participation')
        .select('id, employee_id, confidence_score, detection_method:speaker_segments->detection_method')
        .eq('recording_id', recording.id);

      if (partError) {
        console.log(`   ⚠️  Error checking participation: ${partError.message}`);
      } else if (participation && participation.length > 0) {
        console.log(`   ✅ Linked to ${participation.length} employee(s):`);
        for (const part of participation) {
          console.log(`      - Employee ID: ${part.employee_id}`);
          console.log(`        Confidence: ${part.confidence_score}`);
        }
      } else {
        console.log(`   ❌ NOT linked to any employees`);
        console.log(`   💡 This is why the recording doesn't appear on employee profiles!`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Next Steps:');
    console.log('   1. Check if the transcript contains "Milan" or "Milan Jandu"');
    console.log('   2. If yes, we need to manually trigger employee detection');
    console.log('   3. If no, you need to upload a recording where Milan speaks');

  } catch (error) {
    console.error('❌ Failed to check recording status:', error);
  }
}

// Run the script
checkRecordingStatus().catch(console.error);
