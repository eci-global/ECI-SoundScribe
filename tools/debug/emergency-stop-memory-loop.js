#!/usr/bin/env node

// Emergency script to stop memory failure loop for 90MB video
// This will find and update stuck large recordings to prevent further retries

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.error('   Please set SUPABASE_SERVICE_ROLE_KEY in your environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function emergencyStopMemoryLoop() {
  try {
    console.log('🚨 EMERGENCY: Stopping memory failure loop...');
    console.log('🔍 Finding large stuck recordings...');
    
    // Find recordings that are likely causing memory issues
    const { data: stuckRecordings, error: findError } = await supabase
      .from('recordings')
      .select('id, title, file_size, status, created_at, updated_at, error_message')
      .gte('file_size', 80 * 1024 * 1024) // 80MB+
      .in('status', ['pending', 'processing', 'transcribing', 'processing_large_file', 'uploading'])
      .order('created_at', { ascending: false });
    
    if (findError) {
      throw new Error(`Failed to find recordings: ${findError.message}`);
    }
    
    if (!stuckRecordings || stuckRecordings.length === 0) {
      console.log('✅ No stuck large recordings found');
      return;
    }
    
    console.log(`📊 Found ${stuckRecordings.length} large recording(s) that may be causing memory issues:`);
    
    stuckRecordings.forEach((recording, index) => {
      const sizeMB = (recording.file_size / (1024 * 1024)).toFixed(1);
      const createdAgo = Math.floor((Date.now() - new Date(recording.created_at).getTime()) / (1000 * 60));
      console.log(`   ${index + 1}. ${recording.title} (${sizeMB}MB, ${createdAgo} mins ago, status: ${recording.status})`);
    });
    
    console.log('\n🛑 Stopping memory failure loop by updating status...');
    
    // Update all stuck large recordings to prevent further processing attempts
    const updatePromises = stuckRecordings.map(recording => {
      const sizeMB = (recording.file_size / (1024 * 1024)).toFixed(1);
      return supabase
        .from('recordings')
        .update({
          status: 'requires_manual_processing',
          error_message: null, // Clear previous errors
          processing_notes: `Large file (${sizeMB}MB) marked for manual processing due to Edge Function memory limits (280MB used > 256MB limit). Emergency stop applied to prevent retry loop.`,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id);
    });
    
    const results = await Promise.allSettled(updatePromises);
    
    let successCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      const recording = stuckRecordings[index];
      if (result.status === 'fulfilled' && !result.value.error) {
        successCount++;
        console.log(`   ✅ ${recording.title} - stopped and marked for manual processing`);
      } else {
        errorCount++;
        const error = result.status === 'rejected' ? result.reason : result.value.error;
        console.log(`   ❌ ${recording.title} - failed to update: ${error.message}`);
      }
    });
    
    console.log(`\n📊 Emergency stop results:`);
    console.log(`   ✅ Successfully stopped: ${successCount}`);
    console.log(`   ❌ Failed to stop: ${errorCount}`);
    
    if (successCount > 0) {
      console.log(`\n🎯 Next Steps:`);
      console.log(`   1. Memory failure loop has been stopped`);
      console.log(`   2. Large files marked for manual processing (24-hour timeline)`);
      console.log(`   3. Contact support with recording IDs for priority processing`);
      console.log(`   4. Or compress videos to <200MB and re-upload for immediate processing`);
      
      console.log(`\n📋 Recording IDs for reference:`);
      stuckRecordings.forEach((recording, index) => {
        if (results[index].status === 'fulfilled' && !results[index].value.error) {
          console.log(`   - ${recording.title}: ${recording.id}`);
        }
      });
    }
    
    if (errorCount > 0) {
      console.log(`\n⚠️  Some recordings couldn't be updated. Manual intervention may be required.`);
    }
    
    console.log(`\n✅ Emergency stop procedure completed.`);
    
  } catch (error) {
    console.error('❌ Emergency stop failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the emergency stop
emergencyStopMemoryLoop();