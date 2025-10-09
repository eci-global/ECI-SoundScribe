import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listRecordings() {
  console.log('🔍 Fetching recordings...\n');

  try {
    // Get all recordings
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, title, status, created_at, transcript, ai_summary')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching recordings:', error);
      throw error;
    }

    if (!recordings || recordings.length === 0) {
      console.log('❌ No recordings found in database');
      return;
    }

    console.log(`✅ Found ${recordings.length} recording(s):\n`);

    for (const rec of recordings) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 ${rec.title}`);
      console.log(`   ID: ${rec.id}`);
      console.log(`   Status: ${rec.status}`);
      console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);
      console.log(`   Has Transcript: ${!!rec.transcript ? 'YES' : 'NO'}`);
      console.log(`   Has AI Summary: ${!!rec.ai_summary ? 'YES' : 'NO'}`);

      if (rec.transcript) {
        console.log(`   Transcript Length: ${rec.transcript.length} characters`);
      }

      // Check for employee participation
      const { data: participation } = await supabase
        .from('employee_call_participation')
        .select('employee_id, employees!inner(first_name, last_name)')
        .eq('recording_id', rec.id);

      if (participation && participation.length > 0) {
        console.log('   👥 Linked Employees:');
        participation.forEach(p => {
          console.log(`      - ${p.employees.first_name} ${p.employees.last_name}`);
        });
      } else {
        console.log('   👥 Linked Employees: NONE');
      }

      // Check for scorecards
      const { data: scorecards } = await supabase
        .from('employee_scorecards')
        .select('id, overall_score')
        .eq('recording_id', rec.id);

      if (scorecards && scorecards.length > 0) {
        console.log(`   📊 Scorecards: ${scorecards.length} scorecard(s)`);
        scorecards.forEach(s => {
          console.log(`      - Score: ${s.overall_score}/100`);
        });
      } else {
        console.log('   📊 Scorecards: NONE');
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Failed to list recordings:', error);
    process.exit(1);
  }
}

// Run the script
listRecordings().then(() => process.exit(0)).catch(console.error);
