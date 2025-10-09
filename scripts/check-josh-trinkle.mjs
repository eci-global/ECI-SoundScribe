import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RECORDING_ID = 'e83560b8-f9c2-4642-aecd-85f976aaa975';

async function checkJoshTrinkle() {
  console.log('🔍 Checking Josh Trinkle in database...\n');

  // Check if Josh exists
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, status')
    .or('first_name.ilike.josh,first_name.ilike.joshua')
    .or('last_name.ilike.trinkle,last_name.ilike.trinkl');

  if (employees && employees.length > 0) {
    console.log(`✅ Found ${employees.length} employee(s) matching "Josh" or "Trinkle":\n`);
    employees.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.first_name} ${emp.last_name}`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Email: ${emp.email || 'none'}`);
      console.log(`   Status: ${emp.status}`);
      console.log('');
    });
  } else {
    console.log('❌ Josh Trinkle NOT found in employees table');
    console.log('');
    console.log('💡 Need to add Josh Trinkle:');
    console.log('   Run this SQL:');
    console.log(`   INSERT INTO employees (first_name, last_name, email, status)`);
    console.log(`   VALUES ('Josh', 'Trinkle', 'jtrinkle@ecisolutions.com', 'active');`);
    console.log('');
  }

  // Check the recording
  console.log('📋 Checking recording...\n');
  const { data: recording, error: recError } = await supabase
    .from('recordings')
    .select('id, title, status, employee_name, transcript')
    .eq('id', RECORDING_ID)
    .single();

  if (recording) {
    console.log(`✅ Found recording: "${recording.title}"`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Employee Name: ${recording.employee_name || 'none'}`);
    console.log(`   Has Transcript: ${recording.transcript ? 'Yes (' + recording.transcript.length + ' chars)' : 'No'}`);

    if (recording.transcript) {
      // Check if Josh is mentioned
      const lowerTranscript = recording.transcript.toLowerCase();
      const hasJosh = lowerTranscript.includes('josh');
      const hasTrinkle = lowerTranscript.includes('trinkle');

      console.log(`   Mentions "josh": ${hasJosh ? '✅ YES' : '❌ NO'}`);
      console.log(`   Mentions "trinkle": ${hasTrinkle ? '✅ YES' : '❌ NO'}`);

      if (hasJosh || hasTrinkle) {
        // Find the context
        const words = recording.transcript.toLowerCase().split(/\s+/);
        const joshIndex = words.findIndex(w => w.includes('josh'));
        if (joshIndex >= 0) {
          const context = words.slice(Math.max(0, joshIndex - 5), joshIndex + 10).join(' ');
          console.log(`\n   📝 Context: "...${context}..."`);
        }
      }
    }
  } else {
    console.log('❌ Recording not found');
  }
  console.log('');

  // Check participation
  console.log('🔗 Checking participation records...\n');
  const { data: participation } = await supabase
    .from('employee_call_participation')
    .select('*, employees!inner(first_name, last_name)')
    .eq('recording_id', RECORDING_ID);

  if (participation && participation.length > 0) {
    console.log(`✅ Found ${participation.length} participation record(s):`);
    participation.forEach(p => {
      console.log(`   - ${p.employees.first_name} ${p.employees.last_name}`);
    });
  } else {
    console.log('❌ No participation records found');
    console.log('   This recording is NOT linked to any employee yet');
  }
  console.log('');

  // Summary
  console.log('=' .repeat(70));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(70));
  console.log('Recording ID: e83560b8-f9c2-4642-aecd-85f976aaa975');
  console.log('Recording Title: "09022025 Josh Trinkle to Jose Briones"');
  console.log('');
  console.log(`Josh Trinkle in DB: ${employees && employees.length > 0 ? '✅ YES' : '❌ NO (needs to be added)'}`);
  console.log(`Recording exists: ${recording ? '✅ YES' : '❌ NO'}`);
  console.log(`Has transcript: ${recording?.transcript ? '✅ YES' : '❌ NO'}`);
  console.log(`Linked to employee: ${participation && participation.length > 0 ? '✅ YES' : '❌ NO (needs linking)'}`);
  console.log('');
}

checkJoshTrinkle().catch(console.error);
