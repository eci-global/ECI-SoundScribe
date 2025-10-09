import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function linkRecordingToMilan(recordingId) {
  console.log(`🔗 Linking recording ${recordingId} to Milan Jandu...\n`);

  try {
    // Find Milan
    const { data: milan, error: milanError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('email', 'mjandu@ecisolutions.com')
      .single();

    if (milanError || !milan) {
      console.error('❌ Milan Jandu not found in database');
      console.log('💡 Run: node scripts/populate-test-employee-data.mjs');
      process.exit(1);
    }

    console.log('✅ Milan Jandu found:');
    console.log(`   ID: ${milan.id}`);
    console.log(`   Name: ${milan.first_name} ${milan.last_name}\n`);

    // Verify recording exists
    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript')
      .eq('id', recordingId)
      .single();

    if (recError || !recording) {
      console.error('❌ Recording not found:', recordingId);
      process.exit(1);
    }

    console.log('✅ Recording found:');
    console.log(`   Title: ${recording.title}`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Has Transcript: ${!!recording.transcript}\n`);

    if (!recording.transcript) {
      console.error('❌ Recording has no transcript - cannot generate scorecard');
      process.exit(1);
    }

    // Check if participation already exists
    const { data: existingPart } = await supabase
      .from('employee_call_participation')
      .select('id')
      .eq('recording_id', recordingId)
      .eq('employee_id', milan.id)
      .single();

    let participationId;

    if (existingPart) {
      console.log('ℹ️  Participation record already exists');
      participationId = existingPart.id;
    } else {
      // Create participation record
      console.log('📝 Creating employee participation record...');

      const { data: participation, error: partError } = await supabase
        .from('employee_call_participation')
        .insert({
          recording_id: recordingId,
          employee_id: milan.id,
          participation_type: 'primary',
          confidence_score: 0.95,
          manually_tagged: true,
          speaker_segments: {
            detection_method: 'manual_link',
            note: 'Manually linked via script for testing'
          }
        })
        .select()
        .single();

      if (partError) {
        console.error('❌ Failed to create participation record:', partError);
        throw partError;
      }

      participationId = participation.id;
      console.log('✅ Participation record created\n');
    }

    // Generate scorecard using Edge Function
    console.log('🎯 Generating performance scorecard...');

    const { data: result, error: scorecardError } = await supabase.functions.invoke(
      'generate-employee-scorecard',
      {
        body: {
          recording_id: recordingId,
          participation_id: participationId
        }
      }
    );

    if (scorecardError) {
      console.error('❌ Failed to generate scorecard:', scorecardError);
      throw scorecardError;
    }

    if (!result || result.error) {
      console.error('❌ Scorecard generation failed:', result?.error || 'Unknown error');
      process.exit(1);
    }

    console.log('✅ Scorecard generated successfully!\n');
    console.log('📊 Results:');
    console.log(`   Scorecards Created: ${result.scorecards_created}`);
    if (result.details && result.details.length > 0) {
      const detail = result.details[0];
      console.log(`   Employee: ${detail.employee_name}`);
      console.log(`   Overall Score: ${detail.overall_score}/100`);
      console.log(`   Strengths Identified: ${detail.strengths_count}`);
      console.log(`   Improvement Areas: ${detail.improvements_count}`);
    }

    console.log('\n✨ Complete! Check Milan\'s profile in the UI:\n');
    console.log(`   URL: /employees/profile/${milan.id}`);
    console.log(`   - Overview tab should show Top Strengths & Improvement Areas`);
    console.log(`   - Analytics tab should show performance data\n`);

  } catch (error) {
    console.error('❌ Failed to link recording:', error);
    process.exit(1);
  }
}

// Get recording ID from command line
const recordingId = process.argv[2];

if (!recordingId) {
  console.log('❌ Missing recording ID');
  console.log('\nUsage: node scripts/link-recording-to-milan.mjs <recording_id>');
  console.log('\nTo find available recordings:');
  console.log('  node scripts/list-recordings.mjs\n');
  process.exit(1);
}

// Run the script
linkRecordingToMilan(recordingId).catch(console.error);
