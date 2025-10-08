import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseProcessingIssue() {
  console.log('🔍 Diagnosing Processing Issues...\n');

  try {
    // Get a stuck recording
    console.log('1. Finding stuck recording...');
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('status', 'processing')
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    if (!recordings || recordings.length === 0) {
      console.log('✅ No recordings stuck in processing');
      return;
    }

    const recording = recordings[0];
    console.log(`📋 Testing recording: "${recording.title}"`);
    console.log(`   ID: ${recording.id}`);
    console.log(`   File URL: ${recording.file_url}`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Has transcript: ${recording.transcript ? 'Yes' : 'No'}`);

    // Test 1: Check if file is downloadable
    console.log('\n2. Testing file download...');
    try {
      const response = await fetch(recording.file_url);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      
      if (!response.ok) {
        console.log('❌ File download failed - this could be the issue!');
        return;
      } else {
        console.log('✅ File is downloadable');
      }
    } catch (downloadError) {
      console.log(`❌ File download error: ${downloadError.message}`);
      return;
    }

    // Test 2: Check environment variables
    console.log('\n3. Testing environment variables...');
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log(`   OPENAI_API_KEY: ${openaiKey ? 'Set' : 'Missing'}`);
    
    if (!openaiKey) {
      console.log('❌ OpenAI API key is missing - this is likely the issue!');
      console.log('   Add OPENAI_API_KEY to your .env file');
      return;
    }

    // Test 3: Test OpenAI API directly
    console.log('\n4. Testing OpenAI API access...');
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
      });
      
      if (testResponse.ok) {
        console.log('✅ OpenAI API access is working');
      } else {
        console.log(`❌ OpenAI API error: ${testResponse.status} ${testResponse.statusText}`);
        const errorText = await testResponse.text();
        console.log(`   Error details: ${errorText}`);
        return;
      }
    } catch (apiError) {
      console.log(`❌ OpenAI API connection error: ${apiError.message}`);
      return;
    }

    // Test 4: Test a small transcription
    console.log('\n5. Testing transcription with sample audio...');
    try {
      // Download a small portion of the file to test transcription
      const response = await fetch(recording.file_url);
      const blob = await response.blob();
      
      // Limit to first 1MB for testing
      const testBlob = blob.slice(0, Math.min(blob.size, 1024 * 1024));
      
      const formData = new FormData();
      formData.append('file', testBlob, 'test.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData,
      });
      
      if (transcriptionResponse.ok) {
        const transcript = await transcriptionResponse.text();
        console.log('✅ Transcription test successful');
        console.log(`   Sample transcript: "${transcript.slice(0, 100)}..."`);
      } else {
        const errorText = await transcriptionResponse.text();
        console.log(`❌ Transcription failed: ${transcriptionResponse.status}`);
        console.log(`   Error: ${errorText}`);
        
        if (transcriptionResponse.status === 429) {
          console.log('   💡 This is a quota/rate limit error - you may have exceeded your OpenAI usage limits');
        } else if (transcriptionResponse.status === 401) {
          console.log('   💡 This is an authentication error - check your OpenAI API key');
        }
        return;
      }
    } catch (transcriptionError) {
      console.log(`❌ Transcription test error: ${transcriptionError.message}`);
      return;
    }

    // Test 5: Try processing the recording again with detailed error logging
    console.log('\n6. Testing process-recording function with detailed logging...');
    try {
      const { data, error } = await supabase.functions.invoke('process-recording', {
        body: { recording_id: recording.id }
      });

      if (error) {
        console.log(`❌ Function error: ${error.message}`);
        console.log(`   Error details:`, error);
      } else {
        console.log('✅ Function completed successfully');
        console.log('   Response:', data);
      }
    } catch (functionError) {
      console.log(`❌ Function invocation error: ${functionError.message}`);
    }

    console.log('\n📋 Diagnosis Summary:');
    console.log('If all tests above passed, the issue might be:');
    console.log('1. Audio file is too large or corrupted');
    console.log('2. OpenAI API quota exceeded');
    console.log('3. Edge Function timeout (30+ seconds)');
    console.log('4. Network connectivity issues');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseProcessingIssue(); 