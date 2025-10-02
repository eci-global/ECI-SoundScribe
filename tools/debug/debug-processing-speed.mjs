import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProcessingSpeed() {
  console.log('🔍 Testing AI Processing Pipeline Speed...\n');

  try {
    // Get any recording to test with
    console.log('1. Finding available recordings...');
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, title, transcript, status, created_at')
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    if (!recordings || recordings.length === 0) {
      console.error('❌ No recordings found in database');
      return;
    }

    console.log(`📋 Found ${recordings.length} recordings:`);
    recordings.forEach((rec, i) => {
      const transcriptStatus = rec.transcript ? `${rec.transcript.length} chars` : 'No transcript';
      console.log(`   ${i + 1}. "${rec.title}" (${rec.status}) - ${transcriptStatus}`);
    });

    // Use the first recording for testing
    const recording = recordings[0];
    console.log(`\n✅ Using recording: "${recording.title}" (ID: ${recording.id})`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Transcript: ${recording.transcript ? `${recording.transcript.length} characters` : 'None'}\n`);

    // Test individual functions
    const functions = [
      'analyze-speakers-topics',
      'generate-ai-moments', 
      'generate-coaching',
      'generate-next-steps'
    ];

    const results = {};

    for (const functionName of functions) {
      console.log(`2. Testing ${functionName}...`);
      const startTime = Date.now();
      
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { recording_id: recording.id }
        });

        const duration = Date.now() - startTime;
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message} (${duration}ms)`);
          results[functionName] = { status: 'error', duration, error: error.message };
        } else {
          console.log(`   ✅ Success: ${duration}ms`);
          results[functionName] = { status: 'success', duration };
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`   ❌ Exception: ${err.message} (${duration}ms)`);
        results[functionName] = { status: 'exception', duration, error: err.message };
      }
    }

    // Summary
    console.log('\n📊 Processing Speed Summary:');
    console.log('=' .repeat(50));
    
    let totalTime = 0;
    let successCount = 0;
    
    for (const [func, result] of Object.entries(results)) {
      const status = result.status === 'success' ? '✅' : '❌';
      const time = (result.duration / 1000).toFixed(1);
      console.log(`${status} ${func.padEnd(25)} ${time}s`);
      
      totalTime += result.duration;
      if (result.status === 'success') successCount++;
    }
    
    console.log('=' .repeat(50));
    console.log(`📈 Total processing time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`📈 Successful functions: ${successCount}/${functions.length}`);
    console.log(`📈 Average per function: ${(totalTime / functions.length / 1000).toFixed(1)}s`);

    // Recommendations
    console.log('\n💡 Performance Analysis:');
    if (totalTime > 60000) {
      console.log('⚠️  Total processing time exceeds 1 minute');
      console.log('   Consider parallel processing for faster results');
    }
    
    const slowFunctions = Object.entries(results).filter(([_, r]) => r.duration > 15000);
    if (slowFunctions.length > 0) {
      console.log('⚠️  Slow functions (>15s):');
      slowFunctions.forEach(([func, result]) => {
        console.log(`   - ${func}: ${(result.duration / 1000).toFixed(1)}s`);
      });
    }

    if (successCount < functions.length) {
      console.log('⚠️  Some functions failed - check error messages above');
    }

    if (successCount === functions.length && totalTime < 30000) {
      console.log('✅ Processing pipeline is performing well!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProcessingSpeed(); 