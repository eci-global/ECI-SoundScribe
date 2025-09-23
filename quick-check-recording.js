#!/usr/bin/env node

/**
 * Quick check for a specific recording's analysis status
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables from .env file
let supabaseUrl, supabaseKey;
try {
  const envContent = readFileSync('.env', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickCheck(recordingId) {
  console.log(`🔍 Quick Check for Recording: ${recordingId}`);
  console.log('=' .repeat(50));

  try {
    // Get all data in parallel
    const [recordingResult, topicsResult, speakersResult, usageResult] = await Promise.all([
      supabase.from('recordings').select('id, title, status, transcript, ai_generated_at').eq('id', recordingId),
      supabase.from('topic_segments').select('*').eq('recording_id', recordingId),
      supabase.from('speaker_segments').select('*').eq('recording_id', recordingId),
      supabase.from('ai_usage_logs').select('*').eq('recording_id', recordingId).order('created_at', { ascending: false })
    ]);

    // Recording info
    if (recordingResult.error) {
      console.log('❌ Recording not found or error:', recordingResult.error.message);
      return;
    }

    if (!recordingResult.data || recordingResult.data.length === 0) {
      console.log('❌ Recording not found');
      return;
    }

    const recording = recordingResult.data[0];
    console.log(`📋 Recording: "${recording.title}"`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Has Transcript: ${!!recording.transcript ? 'Yes' : 'No'}`);
    console.log(`   AI Generated At: ${recording.ai_generated_at || 'Not set'}`);

    // Topic segments
    if (topicsResult.error) {
      console.log('❌ Error fetching topics:', topicsResult.error.message);
    } else {
      const topics = topicsResult.data || [];
      console.log(`📊 Topic Segments: ${topics.length}`);
      if (topics.length > 0) {
        console.log('   Topics:', topics.map(t => t.topic).join(', '));
      }
    }

    // Speaker segments  
    if (speakersResult.error) {
      console.log('❌ Error fetching speakers:', speakersResult.error.message);
    } else {
      const speakers = speakersResult.data || [];
      console.log(`🎤 Speaker Segments: ${speakers.length}`);
      if (speakers.length > 0) {
        const uniqueSpeakers = [...new Set(speakers.map(s => s.speaker_name))];
        console.log('   Speakers:', uniqueSpeakers.join(', '));
      }
    }

    // Usage logs
    if (usageResult.error) {
      console.log('❌ Error fetching usage logs:', usageResult.error.message);
    } else {
      const usage = usageResult.data || [];
      console.log(`📈 AI Usage Logs: ${usage.length}`);
      if (usage.length > 0) {
        const recentOperation = usage[0];
        console.log(`   Latest: ${recentOperation.operation} (${recentOperation.provider}) at ${new Date(recentOperation.created_at).toLocaleString()}`);
      }
    }

    // Analysis status
    console.log('\n💡 Analysis Status:');
    if (!recording.transcript) {
      console.log('❌ No transcript - recording needs processing');
    } else if (topicsResult.data?.length === 0) {
      console.log('⚠️  Has transcript but no topic analysis - run analyze-speakers-topics');
    } else {
      console.log('✅ Fully analyzed with topics and segments');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get recording ID from command line or use default
const recordingId = process.argv[2] || '756c2e77-8c48-4755-9009-312d28d47189';
quickCheck(recordingId);