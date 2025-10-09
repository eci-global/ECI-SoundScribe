import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RECORDING_ID = 'b82f1b99-818d-43c3-bc22-0f84fd67288c';

async function checkAbrahamRecording() {
  console.log('🔍 Investigating Abraham Escalona Recording');
  console.log('=' .repeat(70));
  console.log('');

  // Step 1: Check if Abraham exists in employees table
  console.log('📋 Step 1: Searching for Abraham Escalona in employees...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, status')
    .or('first_name.ilike.%abraham%,last_name.ilike.%escalona%');

  if (empError) {
    console.error('❌ Error searching employees:', empError);
  } else if (employees && employees.length > 0) {
    console.log(`✅ Found ${employees.length} matching employee(s):`);
    employees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.first_name} ${emp.last_name}`);
      console.log(`      ID: ${emp.id}`);
      console.log(`      Email: ${emp.email || 'none'}`);
      console.log(`      Status: ${emp.status}`);
    });
  } else {
    console.log('❌ Abraham Escalona NOT found in employees table');
    console.log('');
    console.log('💡 Need to add Abraham first:');
    console.log('   Run this SQL in Supabase:');
    console.log(`   INSERT INTO employees (first_name, last_name, email, status)`);
    console.log(`   VALUES ('Abraham', 'Escalona', 'aescalona@ecisolutions.com', 'active');`);
  }
  console.log('');

  // Step 2: Check the recording details
  console.log('📋 Step 2: Checking recording details...');
  const { data: recording, error: recError } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, transcript')
    .eq('id', RECORDING_ID)
    .single();

  if (recError) {
    console.error('❌ Recording not found:', recError);
    return;
  }

  console.log(`✅ Recording: "${recording.title}"`);
  console.log(`   Status: ${recording.status}`);
  console.log(`   Employee Name: ${recording.employee_name || 'none'}`);
  console.log(`   Has Transcript: ${recording.transcript ? 'Yes (' + recording.transcript.length + ' chars)' : 'No'}`);

  if (recording.transcript) {
    const lowerTranscript = recording.transcript.toLowerCase();
    const hasAbraham = lowerTranscript.includes('abraham');
    const hasEscalona = lowerTranscript.includes('escalona');

    console.log(`   Mentions "abraham": ${hasAbraham ? '✅ YES' : '❌ NO'}`);
    console.log(`   Mentions "escalona": ${hasEscalona ? '✅ YES' : '❌ NO'}`);

    if (hasAbraham || hasEscalona) {
      // Find context
      const words = recording.transcript.toLowerCase().split(/\s+/);
      const abrahamIndex = words.findIndex(w => w.includes('abraham'));
      if (abrahamIndex >= 0) {
        const context = words.slice(Math.max(0, abrahamIndex - 8), abrahamIndex + 12).join(' ');
        console.log(`\n   📝 Context: "...${context}..."`);
      }
    }

    // Check first 500 chars for name patterns
    const firstChars = recording.transcript.substring(0, 500).toLowerCase();
    console.log('\n   🔍 First 500 characters of transcript:');
    console.log(`   "${recording.transcript.substring(0, 500)}"`);
  }
  console.log('');

  // Step 3: Check if already linked via participation
  console.log('📋 Step 3: Checking participation records...');
  const { data: participation } = await supabase
    .from('employee_call_participation')
    .select('*, employees!inner(first_name, last_name)')
    .eq('recording_id', RECORDING_ID);

  if (participation && participation.length > 0) {
    console.log(`✅ Recording IS linked to:`);
    participation.forEach(p => {
      console.log(`   - ${p.employees.first_name} ${p.employees.last_name}`);
    });
  } else {
    console.log('❌ Recording NOT linked to any employee');
  }
  console.log('');

  // Step 4: Check if scorecard exists
  console.log('📋 Step 4: Checking scorecards...');
  const { data: scorecards } = await supabase
    .from('employee_scorecards')
    .select('id, employee_id, overall_score, employees!inner(first_name, last_name)')
    .eq('recording_id', RECORDING_ID);

  if (scorecards && scorecards.length > 0) {
    console.log(`✅ Found ${scorecards.length} scorecard(s):`);
    scorecards.forEach(sc => {
      console.log(`   - ${sc.employees.first_name} ${sc.employees.last_name}: ${sc.overall_score}/100`);
    });
  } else {
    console.log('❌ No scorecards found for this recording');
  }
  console.log('');

  // Summary
  console.log('=' .repeat(70));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Recording ID: ${RECORDING_ID}`);
  console.log(`Recording Title: "${recording.title}"`);
  console.log('');
  console.log(`Abraham in DB: ${employees && employees.length > 0 ? '✅ YES' : '❌ NO (needs to be added)'}`);
  console.log(`Recording exists: ${recording ? '✅ YES' : '❌ NO'}`);
  console.log(`Has transcript: ${recording?.transcript ? '✅ YES' : '❌ NO'}`);
  console.log(`Linked to employee: ${participation && participation.length > 0 ? '✅ YES' : '❌ NO (needs linking)'}`);
  console.log(`Has scorecard: ${scorecards && scorecards.length > 0 ? '✅ YES' : '❌ NO'}`);
  console.log('');

  if (employees && employees.length > 0 && (!participation || participation.length === 0)) {
    console.log('💡 NEXT STEP: Run link script:');
    console.log(`   node scripts/link-employee-recording.mjs ${RECORDING_ID} ${employees[0].id}`);
  }
}

checkAbrahamRecording().catch(console.error);
