import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateScorecardForRecording(recordingId) {
  console.log(`🔍 Checking recording: ${recordingId}\n`);

  try {
    // Check recording
    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript')
      .eq('id', recordingId)
      .single();

    if (recError || !recording) {
      console.error('❌ Recording not found or access denied');
      console.error('   This script uses anonymous access which is blocked by RLS.');
      console.error('   Please run the commands in your browser console instead.\n');
      process.exit(1);
    }

    console.log('✅ Recording found:', recording.title);
    console.log('   Status:', recording.status);
    console.log('   Has transcript:', !!recording.transcript);

    if (!recording.transcript) {
      console.error('❌ Recording has no transcript yet. Please wait for processing to complete.\n');
      process.exit(1);
    }

    // Check participation
    const { data: participation } = await supabase
      .from('employee_call_participation')
      .select('*, employees!inner(first_name, last_name, email)')
      .eq('recording_id', recordingId);

    if (!participation || participation.length === 0) {
      console.error('❌ No employee participation records found for this recording.');
      console.error('   The recording needs to be linked to an employee first.\n');
      process.exit(1);
    }

    console.log(`\n✅ Found ${participation.length} employee participant(s):`);
    participation.forEach(p => {
      console.log(`   - ${p.employees.first_name} ${p.employees.last_name} (${p.employees.email})`);
    });

    // Check if scorecard already exists
    const { data: existingScorecard } = await supabase
      .from('employee_scorecards')
      .select('id, overall_score')
      .eq('recording_id', recordingId);

    if (existingScorecard && existingScorecard.length > 0) {
      console.log('\n⚠️  Scorecard(s) already exist for this recording:');
      existingScorecard.forEach(sc => {
        console.log(`   - Score: ${sc.overall_score}/100`);
      });
      console.log('\n');
      process.exit(0);
    }

    // Generate scorecard
    console.log('\n🎯 Generating performance scorecard...');

    const { data: result, error: scorecardError } = await supabase.functions.invoke(
      'generate-employee-scorecard',
      { body: { recording_id: recordingId } }
    );

    if (scorecardError || !result) {
      console.error('❌ Failed to generate scorecard:', scorecardError);
      process.exit(1);
    }

    console.log('✅ Scorecard generated successfully!\n');
    console.log('📊 Results:');
    console.log(`   Scorecards Created: ${result.scorecards_created}`);

    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        console.log(`\n   Employee: ${detail.employee_name}`);
        console.log(`   Overall Score: ${detail.overall_score}/100`);
        console.log(`   Strengths Identified: ${detail.strengths_count}`);
        console.log(`   Improvement Areas: ${detail.improvements_count}`);
      });
    }

    console.log('\n✨ Complete! Refresh the employee profile page to see the data.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get recording ID from command line
const recordingId = process.argv[2];

if (!recordingId) {
  console.log('❌ Missing recording ID');
  console.log('\nUsage: node scripts/generate-scorecard-for-recording.mjs <recording_id>\n');
  console.log('Example: node scripts/generate-scorecard-for-recording.mjs a5edbb47-bcd5-448c-bea7-dc5eae0665d0\n');
  process.exit(1);
}

generateScorecardForRecording(recordingId).catch(console.error);
