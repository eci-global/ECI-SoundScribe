import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function extractEmployeeForRecording() {
  const recordingId = '752171d7-0b90-476b-a66e-8dfe014c4db7';

  console.log(`🔍 Triggering employee detection for recording: ${recordingId}\n`);

  try {
    // Call the extract-employee-name Edge Function
    const { data, error } = await supabase.functions.invoke('extract-employee-name', {
      body: {
        recording_id: recordingId
      }
    });

    if (error) {
      console.error('❌ Error invoking extract-employee-name:', error);
      throw error;
    }

    console.log('✅ Employee detection completed!');
    console.log('📊 Result:', JSON.stringify(data, null, 2));
    console.log('');

    if (data && data.success) {
      console.log('✅ SUCCESS! Employee detected and linked!');
      console.log(`   Employee Name: ${data.employee_name || 'Unknown'}`);
      console.log(`   Confidence: ${data.confidence_score || 'N/A'}`);
      console.log(`   Detection Method: ${data.detection_method || 'N/A'}`);
      console.log('');
      console.log('💡 Next steps:');
      console.log('   1. Refresh Milan Jandu\'s profile page');
      console.log('   2. Go to the "Recordings" tab');
      console.log('   3. You should now see the recording with a detection badge!');
    } else {
      console.log('⚠️  Employee detection ran but no match found');
      console.log('   Possible reasons:');
      console.log('   - Transcript doesn\'t contain "Milan" or "Milan Jandu"');
      console.log('   - Name format in transcript doesn\'t match database');
      console.log('   - Employee name was mentioned but confidence too low');
      console.log('');
      console.log('💡 Check the transcript to see what names are mentioned');
    }

  } catch (error) {
    console.error('❌ Failed to extract employee:', error);

    if (error.message && error.message.includes('Invalid JWT')) {
      console.log('');
      console.log('⚠️  Authentication error - this function may require service role access');
      console.log('💡 Try calling it from the Supabase dashboard or use service role key');
    }

    process.exit(1);
  }
}

// Run the script
extractEmployeeForRecording().catch(console.error);
