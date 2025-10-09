import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDetection() {
  console.log('🔍 Debugging Employee Detection System\n');

  // 0. Check for Milan Jandu specifically (by email)
  const { data: milan, error: milanError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, status')
    .or('email.eq.mjandu@ecisolutions.com,and(first_name.ilike.Milan,last_name.ilike.Jandu)');

  console.log('👤 Milan Jandu in database:');
  if (milanError) {
    console.log('❌ Error:', milanError.message);
  } else if (milan && milan.length > 0) {
    console.log(`✅ Found Milan Jandu:`, milan[0]);
    console.log(`   ID: ${milan[0].id}`);
    console.log(`   Email: ${milan[0].email}`);
    console.log(`   Name: ${milan[0].first_name} ${milan[0].last_name}`);
    console.log(`   Status: ${milan[0].status}`);
  } else {
    console.log('❌ Milan Jandu not found in employees table');
  }
  console.log('');

  // 1. Check if we have any employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, status')
    .limit(5);

  console.log('👥 Employees in database:');
  if (empError) {
    console.log('❌ Error:', empError.message);
  } else {
    console.log(`✅ Found ${employees?.length || 0} employees`);
    employees?.forEach(emp => {
      console.log(`   - ${emp.first_name} ${emp.last_name} (${emp.status})`);
    });
  }
  console.log('');

  // 2. Check if we have any employee_call_participation records
  const { data: participations, error: partError } = await supabase
    .from('employee_call_participation')
    .select('id, employee_id, recording_id, confidence_score, manually_tagged, speaker_segments')
    .limit(5);

  console.log('📞 Employee Call Participation records:');
  if (partError) {
    console.log('❌ Error:', partError.message);
  } else {
    console.log(`✅ Found ${participations?.length || 0} participation records`);
    participations?.forEach(part => {
      const metadata = part.speaker_segments || {};
      console.log(`   - Recording: ${part.recording_id}`);
      console.log(`     Employee: ${part.employee_id}`);
      console.log(`     Confidence: ${part.confidence_score}`);
      console.log(`     Manual: ${part.manually_tagged}`);
      console.log(`     Detection Method: ${metadata.detection_method || 'none'}`);
      console.log(`     Detected Name: ${metadata.detected_name || 'none'}`);
      console.log('');
    });
  }

  // 3. Check recordings table
  const { data: recordings, error: recError } = await supabase
    .from('recordings')
    .select('id, title, employee_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('🎙️ Recent recordings:');
  if (recError) {
    console.log('❌ Error:', recError.message);
  } else {
    console.log(`✅ Found ${recordings?.length || 0} recordings`);
    recordings?.forEach(rec => {
      console.log(`   - ${rec.title}`);
      console.log(`     ID: ${rec.id}`);
      console.log(`     Employee Name: ${rec.employee_name || 'none'}`);
      console.log(`     Created: ${new Date(rec.created_at).toLocaleString()}`);
      console.log('');
    });
  }

  // 4. Check if any recordings have been linked to employees
  const { data: linkedRecordings, error: linkError } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      recording_id,
      employee_id,
      confidence_score,
      manually_tagged,
      speaker_segments,
      recordings:recording_id(title, employee_name),
      employees:employee_id(first_name, last_name)
    `)
    .limit(10);

  console.log('🔗 Linked recordings (with employee assignments):');
  if (linkError) {
    console.log('❌ Error:', linkError.message);
  } else {
    console.log(`✅ Found ${linkedRecordings?.length || 0} linked recordings`);
    linkedRecordings?.forEach(link => {
      console.log(`   - Recording: ${link.recordings?.title || 'Unknown'}`);
      console.log(`     Employee Name (AI): ${link.recordings?.employee_name || 'none'}`);
      console.log(`     Linked to: ${link.employees?.first_name} ${link.employees?.last_name} (${link.employee_id})`);
      console.log(`     Confidence: ${link.confidence_score}`);
      console.log(`     Detection Method: ${link.speaker_segments?.detection_method || 'none'}`);
      console.log(`     Manually Tagged: ${link.manually_tagged}`);
      console.log('');
    });
  }

  // 5. Summary
  console.log('\n📊 Summary:');
  console.log(`   Employees: ${employees?.length || 0}`);
  console.log(`   Participation Records: ${participations?.length || 0}`);
  console.log(`   Recent Recordings: ${recordings?.length || 0}`);
  console.log(`   Linked Recordings: ${linkedRecordings?.length || 0}`);

  console.log('\n💡 Recommendations:');
  if ((participations?.length || 0) === 0) {
    console.log('   ⚠️  No participation records found!');
    console.log('   → Upload a new recording to test the detection system');
    console.log('   → Or run bulk-extract-employee-names on existing recordings');
  }
  if ((employees?.length || 0) === 0) {
    console.log('   ⚠️  No employees found in database!');
    console.log('   → Add employees first before testing detection');
  }
  if ((recordings?.length || 0) > 0 && (participations?.length || 0) === 0) {
    console.log('   ⚠️  You have recordings but no participation records');
    console.log('   → Run: npx supabase functions invoke bulk-extract-employee-names');
    console.log('   → This will process existing recordings');
  }
}

debugDetection().catch(console.error);
