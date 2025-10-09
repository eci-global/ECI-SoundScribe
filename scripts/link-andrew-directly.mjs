import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.9uYVKhf8bPVELzXqE_QRYLYCzI1mQXmLr8-8l-mL-1I';

// Create client with SERVICE ROLE KEY to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ANDREW_EMPLOYEE_ID = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46';
const RECORDING_ID = 'b983a9f3-ca13-4ba1-a877-d35489dda124';

async function linkAndrewDirectly() {
  console.log('🔧 Linking Andrew Sherley to Recording (Direct Method)');
  console.log('=' .repeat(70));
  console.log('');

  // STEP 1: Verify Andrew exists
  console.log('📋 STEP 1: Verifying Andrew Sherley...');
  const { data: andrew, error: andrewError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, status')
    .eq('id', ANDREW_EMPLOYEE_ID)
    .single();

  if (andrewError) {
    console.error('❌ Error fetching Andrew:', andrewError);
    return;
  }

  if (!andrew) {
    console.error('❌ Andrew Sherley not found with ID:', ANDREW_EMPLOYEE_ID);
    return;
  }

  console.log(`✅ Found: ${andrew.first_name} ${andrew.last_name}`);
  console.log(`   Email: ${andrew.email}`);
  console.log(`   Status: ${andrew.status}`);
  console.log('');

  // STEP 2: Verify recording exists
  console.log('📋 STEP 2: Verifying recording...');
  const { data: recording, error: recError } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, transcript, user_id')
    .eq('id', RECORDING_ID)
    .single();

  if (recError) {
    console.error('❌ Error fetching recording:', recError);
    console.log('');
    console.log('💡 The recording might not exist or the ID is wrong.');
    console.log('   Let me search for recordings...');
    console.log('');

    // Search for recent recordings
    const { data: recentRecs, error: searchErr } = await supabase
      .from('recordings')
      .select('id, title, status, employee_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!searchErr && recentRecs && recentRecs.length > 0) {
      console.log('📋 Recent recordings found:');
      recentRecs.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec.title}`);
        console.log(`   ID: ${rec.id}`);
        console.log(`   Status: ${rec.status}`);
        console.log(`   Employee Name: ${rec.employee_name || 'none'}`);
        console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);
        console.log('');
      });
      console.log('💡 Update RECORDING_ID in this script with the correct ID from above.');
    }
    return;
  }

  console.log(`✅ Found recording: "${recording.title}"`);
  console.log(`   Status: ${recording.status}`);
  console.log(`   Current employee_name: ${recording.employee_name || 'none'}`);
  console.log(`   Has transcript: ${recording.transcript ? 'Yes' : 'No'}`);
  console.log('');

  // STEP 3: Check existing participation records
  console.log('📋 STEP 3: Checking existing participation records...');
  const { data: existingPart, error: partError } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      employee_id,
      confidence_score,
      manually_tagged,
      speaker_segments,
      employees!inner(first_name, last_name)
    `)
    .eq('recording_id', RECORDING_ID);

  if (partError) {
    console.warn('⚠️  Error checking participation:', partError);
  }

  if (existingPart && existingPart.length > 0) {
    console.log(`⚠️  Found ${existingPart.length} existing participation record(s):`);

    for (const part of existingPart) {
      const emp = part.employees;
      console.log(`   - ${emp?.first_name} ${emp?.last_name} (ID: ${part.employee_id})`);

      // Check if already linked to Andrew
      if (part.employee_id === ANDREW_EMPLOYEE_ID) {
        console.log('');
        console.log('✅✅✅ Recording is ALREADY linked to Andrew Sherley! ✅✅✅');
        console.log('');
        console.log(`   Participation ID: ${part.id}`);
        console.log(`   Confidence: ${part.confidence_score}`);
        console.log(`   Manual: ${part.manually_tagged}`);
        console.log('');
        console.log('💡 If not showing on profile page:');
        console.log('   1. Clear browser cache (Ctrl+Shift+R)');
        console.log('   2. Go to: /employees/' + ANDREW_EMPLOYEE_ID);
        console.log('   3. Check browser console (F12) for errors');
        console.log('');
        return;
      }
    }

    // Delete incorrect records
    console.log('');
    console.log('💡 Cleaning up incorrect participation records...');
    const { error: deleteError } = await supabase
      .from('employee_call_participation')
      .delete()
      .eq('recording_id', RECORDING_ID)
      .neq('employee_id', ANDREW_EMPLOYEE_ID);

    if (deleteError) {
      console.warn('⚠️  Error deleting old records:', deleteError);
    } else {
      console.log('✅ Cleaned up old records');
    }
  } else {
    console.log('✅ No existing participation records (clean state)');
  }
  console.log('');

  // STEP 4: Create the participation link
  console.log('📋 STEP 4: Creating participation record...');
  const { data: newPart, error: insertError } = await supabase
    .from('employee_call_participation')
    .insert({
      recording_id: RECORDING_ID,
      employee_id: ANDREW_EMPLOYEE_ID,
      participation_type: 'primary',
      talk_time_seconds: 0,
      talk_time_percentage: 0,
      confidence_score: 1.0,
      manually_tagged: true,
      speaker_segments: {
        detection_method: 'manual',
        detected_name: 'Andrew Sherley',
        name_type: 'full_name',
        reasoning: 'Manually linked via Node.js script to fix profile not showing recording',
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error creating participation record:', insertError);
    console.log('');
    console.log('💡 Possible reasons:');
    console.log('   - Record already exists (use ON CONFLICT)');
    console.log('   - Database constraint violation');
    console.log('   - RLS policy still blocking');
    return;
  }

  console.log('✅ Successfully created participation record!');
  console.log(`   Participation ID: ${newPart.id}`);
  console.log('');

  // STEP 5: Update recording.employee_name
  console.log('📋 STEP 5: Updating recording.employee_name field...');
  const { error: updateError } = await supabase
    .from('recordings')
    .update({
      employee_name: 'Andrew Sherley',
      updated_at: new Date().toISOString()
    })
    .eq('id', RECORDING_ID);

  if (updateError) {
    console.warn('⚠️  Error updating recording:', updateError);
  } else {
    console.log('✅ Updated recording.employee_name = "Andrew Sherley"');
  }
  console.log('');

  // STEP 6: Verify
  console.log('📋 STEP 6: Final verification...');
  const { data: verification, error: verifyError } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      confidence_score,
      manually_tagged,
      speaker_segments,
      employees!inner(first_name, last_name),
      recordings!inner(title)
    `)
    .eq('recording_id', RECORDING_ID)
    .eq('employee_id', ANDREW_EMPLOYEE_ID)
    .single();

  if (verifyError || !verification) {
    console.error('❌ Verification failed - link not found!');
    return;
  }

  console.log('✅ Verification successful!');
  console.log('');
  console.log('🎉 ===================================================================');
  console.log('🎉 SUCCESS! Recording is now linked to Andrew Sherley!');
  console.log('🎉 ===================================================================');
  console.log('');
  console.log('📊 Details:');
  console.log(`   Employee: ${verification.employees.first_name} ${verification.employees.last_name}`);
  console.log(`   Recording: "${verification.recordings.title}"`);
  console.log(`   Participation ID: ${verification.id}`);
  console.log(`   Confidence: ${verification.confidence_score}`);
  console.log(`   Manual Tag: ${verification.manually_tagged}`);
  console.log('');
  console.log('🔗 View the profile:');
  console.log(`   /employees/${ANDREW_EMPLOYEE_ID}`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Clear browser cache (Ctrl+Shift+R)');
  console.log('   2. Navigate to Andrew\'s profile');
  console.log('   3. Click "Recordings" tab');
  console.log('   4. Recording should now appear!');
  console.log('');

  // Check total recordings for Andrew
  const { count } = await supabase
    .from('employee_call_participation')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', ANDREW_EMPLOYEE_ID);

  console.log(`📊 Andrew now has ${count || 0} linked recording(s) total`);
  console.log('');
}

// Run it
linkAndrewDirectly().catch(console.error);
