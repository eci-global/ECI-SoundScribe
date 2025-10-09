import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// The summary ID from the path /summaries/b983a9f3-ca13-4ba1-a877-d35489dda124
const SUMMARY_ID = 'b983a9f3-ca13-4ba1-a877-d35489dda124';

async function fixAndrewSherleyRecording() {
  console.log('🔧 Fixing Andrew Sherley Recording Link Issue\n');
  console.log('=' .repeat(70));
  console.log('');

  // STEP 1: Find the correct recording ID
  console.log('📋 STEP 1: Finding correct recording ID from summary path');
  console.log('-'.repeat(70));

  // The summary ID might BE the recording ID, or we need to search for it
  let recordingId = SUMMARY_ID;
  let recording = null;

  // Try direct lookup first
  const { data: directRecording, error: directError } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, transcript, user_id, created_at')
    .eq('id', SUMMARY_ID)
    .single();

  if (directRecording) {
    recording = directRecording;
    recordingId = directRecording.id;
    console.log(`✅ Found recording directly by ID: ${recordingId}`);
  } else {
    // Search by title pattern or recent recordings
    console.log(`⚠️  Recording not found by ID ${SUMMARY_ID}`);
    console.log('   Searching recent recordings with "Andrew" in title...');

    const { data: searchResults, error: searchError } = await supabase
      .from('recordings')
      .select('id, title, status, employee_name, transcript, user_id, created_at')
      .or('title.ilike.%andrew%,employee_name.ilike.%andrew%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (searchResults && searchResults.length > 0) {
      console.log(`\n📝 Found ${searchResults.length} recordings with "Andrew":\n`);
      searchResults.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec.title}`);
        console.log(`   ID: ${rec.id}`);
        console.log(`   Status: ${rec.status}`);
        console.log(`   Employee Name: ${rec.employee_name || 'none'}`);
        console.log(`   Has Transcript: ${rec.transcript ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);
        console.log('');
      });

      // Use the most recent one
      recording = searchResults[0];
      recordingId = recording.id;
      console.log(`ℹ️  Using most recent recording: ${recording.title}`);
    } else {
      console.log('❌ No recordings found with "Andrew" in title or employee_name');
      console.log('\n💡 Please provide the correct recording ID manually');
      return;
    }
  }

  console.log(`\n📊 Recording Details:`);
  console.log(`   ID: ${recordingId}`);
  console.log(`   Title: ${recording.title}`);
  console.log(`   Status: ${recording.status}`);
  console.log(`   Current Employee Name: ${recording.employee_name || 'none'}`);
  console.log(`   Has Transcript: ${recording.transcript ? 'Yes' : 'No'}`);
  console.log(`   Transcript Length: ${recording.transcript?.length || 0} chars`);
  console.log('');

  if (!recording.transcript) {
    console.log('❌ ERROR: Recording has no transcript!');
    console.log('   Employee detection requires a transcript to analyze.');
    console.log('   Please ensure the recording has been transcribed first.');
    return;
  }

  // STEP 2: Verify Andrew Sherley exists in employees table
  console.log('\n📋 STEP 2: Verifying Andrew Sherley in employees table');
  console.log('-'.repeat(70));

  // Check for various spelling variations
  const nameVariations = [
    { firstName: 'Andrew', lastName: 'Sherley' },
    { firstName: 'Andrew', lastName: 'Shirley' },
    { firstName: 'Andy', lastName: 'Sherley' },
    { firstName: 'Andy', lastName: 'Shirley' }
  ];

  let andrewEmployee = null;

  for (const { firstName, lastName } of nameVariations) {
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, status, employee_id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName);

    if (empData && empData.length > 0) {
      andrewEmployee = empData[0];
      console.log(`✅ Found employee: ${andrewEmployee.first_name} ${andrewEmployee.last_name}`);
      break;
    }
  }

  if (!andrewEmployee) {
    console.log('❌ Andrew Sherley not found in employees table');
    console.log('\n💡 Checking what names are in the employees table...');

    const { data: allEmps } = await supabase
      .from('employees')
      .select('first_name, last_name, status')
      .eq('status', 'active')
      .order('first_name')
      .limit(20);

    console.log('\n📋 Active employees in database:');
    allEmps?.forEach(emp => {
      console.log(`   - ${emp.first_name} ${emp.last_name}`);
    });

    console.log('\n⚠️  Please add Andrew Sherley to the employees table first:');
    console.log('   1. Go to Supabase Dashboard > employees table');
    console.log('   2. Insert new row with first_name="Andrew", last_name="Sherley", status="active"');
    console.log('   3. Re-run this script');
    return;
  }

  console.log(`\n📊 Employee Details:`);
  console.log(`   ID: ${andrewEmployee.id}`);
  console.log(`   Name: ${andrewEmployee.first_name} ${andrewEmployee.last_name}`);
  console.log(`   Email: ${andrewEmployee.email || 'none'}`);
  console.log(`   Status: ${andrewEmployee.status}`);
  console.log(`   Employee Code: ${andrewEmployee.employee_id || 'none'}`);
  console.log('');

  // STEP 3: Check and clean up existing participation records
  console.log('\n📋 STEP 3: Checking existing participation records');
  console.log('-'.repeat(70));

  const { data: existingParticipation, error: partError } = await supabase
    .from('employee_call_participation')
    .select('id, employee_id, confidence_score, manually_tagged, speaker_segments, employees!inner(first_name, last_name)')
    .eq('recording_id', recordingId);

  if (existingParticipation && existingParticipation.length > 0) {
    console.log(`⚠️  Found ${existingParticipation.length} existing participation record(s):\n`);

    existingParticipation.forEach((part, idx) => {
      const emp = part.employees;
      const metadata = part.speaker_segments || {};
      console.log(`${idx + 1}. Employee: ${emp?.first_name} ${emp?.last_name}`);
      console.log(`   Participation ID: ${part.id}`);
      console.log(`   Employee ID: ${part.employee_id}`);
      console.log(`   Confidence: ${part.confidence_score}`);
      console.log(`   Manual: ${part.manually_tagged}`);
      console.log(`   Detection Method: ${metadata.detection_method || 'none'}`);
      console.log(`   Detected Name: ${metadata.detected_name || 'none'}`);
      console.log('');
    });

    // Check if any record is already for Andrew Sherley
    const andrewRecord = existingParticipation.find(p => p.employee_id === andrewEmployee.id);

    if (andrewRecord) {
      console.log('✅ Recording is already linked to Andrew Sherley!');
      console.log('   The link exists in the database.');
      console.log('\n💡 If it\'s not showing on the profile page:');
      console.log('   1. Clear browser cache');
      console.log('   2. Refresh the employee profile page');
      console.log('   3. Check the console for any errors');
      console.log('   4. Verify the employee ID in the URL matches the database');
      return;
    }

    // Ask about cleaning up incorrect records
    console.log('⚠️  Participation records exist but NOT for Andrew Sherley');
    console.log('   These might be incorrect and should be removed.');
    console.log('');
    console.log('💡 Cleaning up incorrect participation records...');

    for (const part of existingParticipation) {
      const { error: deleteError } = await supabase
        .from('employee_call_participation')
        .delete()
        .eq('id', part.id);

      if (deleteError) {
        console.log(`   ❌ Failed to delete participation ${part.id}: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Deleted incorrect participation record ${part.id}`);
      }
    }
    console.log('');
  } else {
    console.log('✅ No existing participation records found (clean state)');
    console.log('');
  }

  // STEP 4: Re-run employee detection
  console.log('\n📋 STEP 4: Running employee detection');
  console.log('-'.repeat(70));

  console.log(`🤖 Calling extract-employee-name Edge Function...`);
  console.log(`   Recording ID: ${recordingId}`);
  console.log(`   This will:`);
  console.log(`   - Analyze the transcript using AI`);
  console.log(`   - Detect employee name(s) mentioned`);
  console.log(`   - Match against Andrew Sherley in database`);
  console.log(`   - Create participation record`);
  console.log('');

  const { data: functionResult, error: functionError } = await supabase.functions.invoke('extract-employee-name', {
    body: {
      recording_id: recordingId
    }
  });

  if (functionError) {
    console.log('❌ Error calling extract-employee-name:', functionError);

    if (functionError.message?.includes('JWT') || functionError.message?.includes('auth')) {
      console.log('\n💡 Authentication error - trying alternative approach...');
      console.log('   The Edge Function might require service role access.');
    }
    return;
  }

  console.log('✅ Employee detection completed!');
  console.log('\n📊 Detection Result:');
  console.log(JSON.stringify(functionResult, null, 2));
  console.log('');

  // STEP 5: Verify the fix
  console.log('\n📋 STEP 5: Verifying the fix');
  console.log('-'.repeat(70));

  // Check if participation record was created
  const { data: newParticipation, error: verifyError } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      employee_id,
      confidence_score,
      manually_tagged,
      speaker_segments,
      employees!inner(first_name, last_name)
    `)
    .eq('recording_id', recordingId)
    .eq('employee_id', andrewEmployee.id)
    .single();

  if (newParticipation) {
    console.log('✅ SUCCESS! Recording is now linked to Andrew Sherley!');
    console.log('');
    console.log('📊 Participation Record Details:');
    console.log(`   ID: ${newParticipation.id}`);
    console.log(`   Employee: ${newParticipation.employees.first_name} ${newParticipation.employees.last_name}`);
    console.log(`   Confidence: ${newParticipation.confidence_score}`);
    console.log(`   Manual Tag: ${newParticipation.manually_tagged}`);

    const metadata = newParticipation.speaker_segments || {};
    console.log(`   Detection Method: ${metadata.detection_method || 'none'}`);
    console.log(`   Detected Name: ${metadata.detected_name || 'none'}`);
    console.log(`   Reasoning: ${metadata.reasoning || 'none'}`);
    console.log('');

    console.log('🎉 Next Steps:');
    console.log('   1. Go to Andrew Sherley\'s employee profile page');
    console.log('   2. Navigate to the "Recordings" tab');
    console.log('   3. You should now see this recording listed!');
    console.log(`   4. Recording: ${recording.title}`);
    console.log('');
    console.log('💡 If you still don\'t see it:');
    console.log('   - Clear browser cache and refresh');
    console.log('   - Check browser console for errors');
    console.log(`   - Verify employee ID in URL: /employees/${andrewEmployee.id}`);

  } else {
    console.log('⚠️  Participation record was not created');
    console.log('');

    // Check what the AI detected
    if (functionResult && functionResult.analysis) {
      console.log('📊 AI Detection Analysis:');
      console.log(`   Detected Name: ${functionResult.analysis.employee_name || 'none'}`);
      console.log(`   Confidence: ${functionResult.analysis.confidence || 0}`);
      console.log(`   Reasoning: ${functionResult.analysis.reasoning || 'none'}`);
      console.log('');

      if (!functionResult.analysis.employee_name) {
        console.log('💡 AI did not detect any employee name in the transcript.');
        console.log('   Possible reasons:');
        console.log('   - The name "Andrew Sherley" is not mentioned in the transcript');
        console.log('   - The name is misspelled or in an unusual format');
        console.log('   - The transcript quality is poor');
        console.log('');
        console.log('   To fix this:');
        console.log('   1. Review the transcript to see what name is actually mentioned');
        console.log('   2. Update the employee record to match the transcript name');
        console.log('   3. Or manually tag the recording to Andrew Sherley');
      } else if (functionResult.analysis.employee_name.toLowerCase() !== `${andrewEmployee.first_name} ${andrewEmployee.last_name}`.toLowerCase()) {
        console.log(`💡 AI detected a different name: "${functionResult.analysis.employee_name}"`);
        console.log(`   Expected: "${andrewEmployee.first_name} ${andrewEmployee.last_name}"`);
        console.log('');
        console.log('   This might be a name variation issue.');
        console.log('   Check if the employee record name matches what\'s in the transcript.');
      }
    }

    console.log('\n📝 Checking recording.employee_name field...');
    const { data: updatedRecording } = await supabase
      .from('recordings')
      .select('employee_name')
      .eq('id', recordingId)
      .single();

    if (updatedRecording?.employee_name) {
      console.log(`   recordings.employee_name = "${updatedRecording.employee_name}"`);
      console.log('   ℹ️  The AI detection did store a name, but didn\'t create participation record');
      console.log('   This suggests the name didn\'t match any employee in the database');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Diagnostic and Fix Complete!');
  console.log('='.repeat(70));
}

// Run the fix script
fixAndrewSherleyRecording().catch(console.error);
