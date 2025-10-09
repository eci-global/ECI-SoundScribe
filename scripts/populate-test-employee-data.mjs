import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function populateTestData() {
  console.log('🚀 Starting test data population for Milan Jandu...\n');

  try {
    // Check if Milan already exists
    const { data: existingMilan } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('email', 'mjandu@ecisolutions.com')
      .single();

    if (existingMilan) {
      console.log('✅ Milan Jandu already exists:');
      console.log(`   ID: ${existingMilan.id}`);
      console.log(`   Name: ${existingMilan.first_name} ${existingMilan.last_name}`);
      console.log(`   Email: ${existingMilan.email}\n`);
      return existingMilan;
    }

    // Create Milan's employee record
    console.log('📝 Creating Milan Jandu employee record...');

    const { data: milan, error: milanError } = await supabase
      .from('employees')
      .insert({
        employee_code: 'MILAN001',
        first_name: 'Milan',
        last_name: 'Jandu',
        email: 'mjandu@ecisolutions.com',
        department: 'Sales',
        role: 'Business Development Representative',
        status: 'active'
      })
      .select()
      .single();

    if (milanError) {
      console.error('❌ Failed to create Milan:', milanError);
      throw milanError;
    }

    console.log('✅ Milan Jandu created successfully:');
    console.log(`   ID: ${milan.id}`);
    console.log(`   Name: ${milan.first_name} ${milan.last_name}`);
    console.log(`   Email: ${milan.email}`);
    console.log(`   Department: ${milan.department}`);
    console.log(`   Role: ${milan.role}\n`);

    // Check for existing recordings
    console.log('🔍 Checking for available completed recordings...');

    const { data: recordings, error: recError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript')
      .eq('status', 'completed')
      .not('transcript', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recError) {
      console.error('❌ Error fetching recordings:', recError);
    }

    if (!recordings || recordings.length === 0) {
      console.log('⚠️  No completed recordings with transcripts found');
      console.log('💡 You need to upload a recording first before generating scorecards\n');
      console.log('📌 Next steps:');
      console.log('   1. Upload a call recording via the UI');
      console.log('   2. Wait for it to complete processing');
      console.log('   3. Run: node scripts/link-recording-to-milan.mjs <recording_id>');
      return milan;
    }

    console.log(`✅ Found ${recordings.length} completed recording(s):\n`);
    recordings.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (ID: ${rec.id})`);
    });

    console.log('\n💡 To link a recording to Milan and generate scorecard:');
    console.log(`   node scripts/link-recording-to-milan.mjs <recording_id>`);

    return milan;

  } catch (error) {
    console.error('❌ Failed to populate test data:', error);
    process.exit(1);
  }
}

// Run the script
populateTestData().then(() => {
  console.log('\n✨ Test data population complete!\n');
  process.exit(0);
}).catch(console.error);
