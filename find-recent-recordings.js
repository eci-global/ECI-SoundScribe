#!/usr/bin/env node

/**
 * Find recent recordings to identify the one from the screenshot
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRecentRecordings() {
  console.log('🔍 FINDING RECENT RECORDINGS');
  console.log('============================\n');

  try {
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, title, created_at, status, ai_moments, transcript')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('❌ Error fetching recordings:', error.message);
      return;
    }

    if (!recordings || recordings.length === 0) {
      console.log('📭 No recordings found in database');
      return;
    }

    console.log(`📋 Found ${recordings.length} recordings:\n`);

    recordings.forEach((recording, index) => {
      console.log(`${index + 1}. ${recording.title || 'Untitled'}`);
      console.log(`   ID: ${recording.id}`);
      console.log(`   Created: ${recording.created_at}`);
      console.log(`   Status: ${recording.status}`);
      console.log(`   Has transcript: ${recording.transcript ? `✅ Yes (${recording.transcript.length} chars)` : '❌ No'}`);
      console.log(`   Has AI moments: ${recording.ai_moments ? `✅ Yes (${Array.isArray(recording.ai_moments) ? recording.ai_moments.length : 'unknown'} moments)` : '❌ No'}`);
      
      // Show AI moments details if they exist
      if (recording.ai_moments && Array.isArray(recording.ai_moments)) {
        console.log(`   AI moments details:`);
        recording.ai_moments.forEach((moment, idx) => {
          console.log(`      ${idx + 1}. ${moment.type || 'unknown'}: ${moment.tooltip || 'no description'}`);
        });
      }
      
      console.log('');
    });

    // Instructions for testing
    console.log('🎯 TO TEST KEY MOMENTS:');
    console.log('======================');
    console.log('1. Copy a recording ID from above');
    console.log('2. Go to your app and load that recording');
    console.log('3. Check the Key Moments section');
    console.log('4. If no AI moments exist, click "Generate AI Moments"');
    console.log('');
    console.log('📝 Example URLs:');
    recordings.slice(0, 3).forEach((rec, idx) => {
      console.log(`   ${idx + 1}. http://localhost:8080/outreach/recordings/${rec.id}`);
    });

  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

findRecentRecordings();