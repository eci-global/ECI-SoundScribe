import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findRecording() {
  console.log('🔍 Searching for recordings related to Andrew Sherley\n');

  // Try the exact UUID from the path
  const POSSIBLE_ID = 'b983a9f3-ca13-4ba1-a877-d35489dda124';

  console.log(`1️⃣  Checking if ${POSSIBLE_ID} is a recording ID...`);
  const { data: direct, error: directErr } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', POSSIBLE_ID)
    .single();

  if (direct) {
    console.log('✅ Found it!');
    console.log(`   Title: ${direct.title}`);
    console.log(`   Status: ${direct.status}`);
    console.log(`   Employee Name: ${direct.employee_name || 'none'}`);
    console.log(`   Has Transcript: ${direct.transcript ? 'Yes' : 'No'}`);
    return direct;
  }

  console.log('❌ Not found as recording ID\n');

  // Search recent recordings
  console.log('2️⃣  Getting recent recordings (last 20)...\n');
  const { data: recent, error: recentErr } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, transcript, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (recent && recent.length > 0) {
    console.log(`Found ${recent.length} recent recordings:\n`);
    recent.forEach((rec, idx) => {
      const hasTranscript = rec.transcript ? `${rec.transcript.length} chars` : 'No transcript';
      console.log(`${idx + 1}. ${rec.title}`);
      console.log(`   ID: ${rec.id}`);
      console.log(`   Status: ${rec.status}`);
      console.log(`   Employee Name: ${rec.employee_name || 'none'}`);
      console.log(`   Transcript: ${hasTranscript}`);
      console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);

      // Check if transcript mentions Andrew
      if (rec.transcript) {
        const lowerTranscript = rec.transcript.toLowerCase();
        if (lowerTranscript.includes('andrew') || lowerTranscript.includes('sherley') || lowerTranscript.includes('shirley')) {
          console.log(`   ⭐ CONTAINS "Andrew" or "Sherley/Shirley" in transcript!`);
        }
      }
      console.log('');
    });
  }

  // Search for Andrew variations in transcript
  console.log('\n3️⃣  Searching recordings with "Andrew", "Sherley", or "Shirley" in transcript...\n');

  const { data: andrewRecs, error: andrewErr } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, created_at')
    .or('transcript.ilike.%andrew%,transcript.ilike.%sherley%,transcript.ilike.%shirley%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (andrewRecs && andrewRecs.length > 0) {
    console.log(`✅ Found ${andrewRecs.length} recordings with Andrew/Sherley/Shirley in transcript:\n`);
    andrewRecs.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${rec.title}`);
      console.log(`   ID: ${rec.id}`);
      console.log(`   Status: ${rec.status}`);
      console.log(`   Employee Name: ${rec.employee_name || 'none'}`);
      console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);
      console.log('');
    });

    return andrewRecs[0];
  } else {
    console.log('❌ No recordings found with Andrew/Sherley/Shirley in transcript');
  }

  // Check employee table
  console.log('\n4️⃣  Checking if Andrew Sherley exists in employees table...\n');

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, status, employee_id')
    .or('first_name.ilike.%andrew%,first_name.ilike.%andy%');

  if (employees && employees.length > 0) {
    console.log(`✅ Found ${employees.length} employee(s) with first name Andrew/Andy:\n`);
    employees.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.first_name} ${emp.last_name}`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Email: ${emp.email || 'none'}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Employee Code: ${emp.employee_id || 'none'}`);
      console.log('');
    });
  } else {
    console.log('❌ No employees found with first name Andrew or Andy');
    console.log('\n💡 You need to add Andrew Sherley to the employees table first!');
    console.log('   Go to Supabase Dashboard → employees table → Insert row');
    console.log('   Fields: first_name="Andrew", last_name="Sherley", status="active"');
  }

  // Check existing participation records
  console.log('\n5️⃣  Checking employee_call_participation records...\n');

  const { data: participation, error: partErr } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      recording_id,
      employee_id,
      confidence_score,
      speaker_segments,
      recordings!inner(title, employee_name),
      employees!inner(first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (participation && participation.length > 0) {
    console.log(`Found ${participation.length} recent participation records:\n`);
    participation.forEach((part, idx) => {
      const emp = part.employees;
      const rec = part.recordings;
      const metadata = part.speaker_segments || {};

      console.log(`${idx + 1}. ${emp?.first_name} ${emp?.last_name} → "${rec?.title}"`);
      console.log(`   Recording ID: ${part.recording_id}`);
      console.log(`   Employee ID: ${part.employee_id}`);
      console.log(`   Confidence: ${part.confidence_score}`);
      console.log(`   Detection Method: ${metadata.detection_method || 'none'}`);
      console.log(`   Detected Name: ${metadata.detected_name || 'none'}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No participation records found');
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 Summary & Next Steps:');
  console.log('='.repeat(70));
  console.log('');
  console.log('To link Andrew Sherley to a recording:');
  console.log('');
  console.log('1. Identify the correct recording ID from the list above');
  console.log('   - Look for a recording that should be Andrew\'s');
  console.log('   - Check the transcript contains "Andrew" or "Sherley/Shirley"');
  console.log('');
  console.log('2. Ensure Andrew Sherley exists in employees table');
  console.log('   - If not listed above, add him first');
  console.log('');
  console.log('3. Run the fix script with the correct recording ID:');
  console.log('   - Edit scripts/fix-andrew-sherley-recording.mjs');
  console.log('   - Update SUMMARY_ID to the correct recording UUID');
  console.log('   - Run: node scripts/fix-andrew-sherley-recording.mjs');
}

findRecording().catch(console.error);
