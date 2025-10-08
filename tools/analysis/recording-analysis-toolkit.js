#!/usr/bin/env node

/**
 * COMPREHENSIVE RECORDING ANALYSIS TOOLKIT
 * 
 * This toolkit provides multiple utilities for debugging recording analysis:
 * 1. Check specific recording analysis status
 * 2. List all recordings and their analysis status  
 * 3. Test the analyze-speakers-topics Edge function
 * 4. Create a test recording for debugging
 * 5. Run SQL queries to check database state
 * 
 * Usage:
 * node recording-analysis-toolkit.js [command] [recording-id]
 * 
 * Commands:
 * - check [recording-id]     : Check specific recording analysis status
 * - list                     : List all recordings and their status
 * - test [recording-id]      : Test analyze-speakers-topics function
 * - create-test              : Create a test recording for debugging
 * - db-status                : Check database connection and tables
 * - help                     : Show this help message
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configuration
let supabaseUrl, supabaseKey, supabaseServiceKey;
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
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1];
    }
  }
} catch (error) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseService = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Utilities
function showHelp() {
  console.log(`
🛠️  RECORDING ANALYSIS TOOLKIT
==============================

Usage: node recording-analysis-toolkit.js [command] [recording-id]

Commands:
  check [recording-id]     Check specific recording analysis status
  list                     List all recordings and their status  
  test [recording-id]      Test analyze-speakers-topics function
  create-test              Create a test recording for debugging
  db-status                Check database connection and tables
  help                     Show this help message

Examples:
  node recording-analysis-toolkit.js check 756c2e77-8c48-4755-9009-312d28d47189
  node recording-analysis-toolkit.js list
  node recording-analysis-toolkit.js test 756c2e77-8c48-4755-9009-312d28d47189
  node recording-analysis-toolkit.js create-test
  node recording-analysis-toolkit.js db-status

Notes:
- If no recording ID is provided for 'check' or 'test', it will use the default from your request
- The 'create-test' command will create a test recording with sample transcript
- All commands will show detailed debugging information
`);
}

async function checkRecording(recordingId) {
  console.log(`🔍 CHECKING RECORDING ANALYSIS STATUS`);
  console.log(`Recording ID: ${recordingId}`);
  console.log('=' .repeat(60));

  try {
    // Get all data in parallel
    const [recordingResult, topicsResult, speakersResult, usageResult] = await Promise.all([
      supabase.from('recordings').select('*').eq('id', recordingId),
      supabase.from('topic_segments').select('*').eq('recording_id', recordingId),
      supabase.from('speaker_segments').select('*').eq('recording_id', recordingId),
      supabase.from('ai_usage_logs').select('*').eq('recording_id', recordingId).order('created_at', { ascending: false })
    ]);

    // Recording info
    if (recordingResult.error) {
      console.log('❌ Recording query error:', recordingResult.error.message);
      return;
    }

    if (!recordingResult.data || recordingResult.data.length === 0) {
      console.log('❌ Recording not found');
      console.log('💡 Tip: Use "list" command to see available recordings');
      return;
    }

    const recording = recordingResult.data[0];
    console.log(`\n📋 RECORDING DETAILS`);
    console.log(`   Title: "${recording.title}"`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Created: ${new Date(recording.created_at).toLocaleString()}`);
    console.log(`   User ID: ${recording.user_id}`);
    console.log(`   Has Transcript: ${!!recording.transcript ? 'Yes' : 'No'}`);
    console.log(`   Transcript Length: ${recording.transcript?.length || 0} characters`);
    console.log(`   Has Summary: ${!!recording.summary ? 'Yes' : 'No'}`);
    console.log(`   Has AI Summary: ${!!recording.ai_summary ? 'Yes' : 'No'}`);
    console.log(`   AI Generated At: ${recording.ai_generated_at || 'Not set'}`);
    console.log(`   File URL: ${recording.file_url ? 'Yes' : 'No'}`);

    // Topic segments
    if (topicsResult.error) {
      console.log(`\n❌ Topic segments error: ${topicsResult.error.message}`);
    } else {
      const topics = topicsResult.data || [];
      console.log(`\n📊 TOPIC SEGMENTS: ${topics.length}`);
      if (topics.length > 0) {
        topics.forEach((topic, index) => {
          console.log(`   ${index + 1}. "${topic.topic}"`);
          console.log(`      Time: ${topic.start_time}s - ${topic.end_time}s`);
          console.log(`      Category: ${topic.category || 'not set'}`);
          console.log(`      Confidence: ${topic.confidence || 'not set'}`);
          console.log(`      Summary: ${topic.summary || 'not set'}`);
          if (topic.metadata) {
            console.log(`      Metadata: ${Object.keys(topic.metadata).length} keys`);
          }
        });
      }
    }

    // Speaker segments  
    if (speakersResult.error) {
      console.log(`\n❌ Speaker segments error: ${speakersResult.error.message}`);
    } else {
      const speakers = speakersResult.data || [];
      console.log(`\n🎤 SPEAKER SEGMENTS: ${speakers.length}`);
      if (speakers.length > 0) {
        const uniqueSpeakers = [...new Set(speakers.map(s => s.speaker_name))];
        console.log(`   Unique speakers: ${uniqueSpeakers.join(', ')}`);
        console.log(`   Sample segments:`);
        speakers.slice(0, 3).forEach((segment, index) => {
          console.log(`   ${index + 1}. ${segment.speaker_name} (${segment.start_time}s-${segment.end_time}s)`);
          console.log(`      Text: ${segment.text?.substring(0, 80)}...`);
        });
      }
    }

    // AI usage logs
    if (usageResult.error) {
      console.log(`\n❌ Usage logs error: ${usageResult.error.message}`);
    } else {
      const usage = usageResult.data || [];
      console.log(`\n📈 AI USAGE LOGS: ${usage.length}`);
      if (usage.length > 0) {
        usage.slice(0, 3).forEach((log, index) => {
          console.log(`   ${index + 1}. ${log.operation} (${log.provider})`);
          console.log(`      Model: ${log.model_used}, Tokens: ${log.total_tokens}`);
          console.log(`      Cost: $${log.estimated_cost?.toFixed(4) || 'unknown'}`);
          console.log(`      Time: ${new Date(log.created_at).toLocaleString()}`);
        });
      }
    }

    // Analysis status summary
    console.log(`\n💡 ANALYSIS STATUS SUMMARY`);
    if (!recording.transcript) {
      console.log('❌ No transcript - recording needs processing first');
      console.log('   → Run audio processing to generate transcript');
    } else if (topicsResult.data?.length === 0) {
      console.log('⚠️  Has transcript but no topic analysis');
      console.log('   → Run: analyze-speakers-topics Edge function');
      console.log('   → Use "test" command to test the function');
    } else {
      console.log('✅ Fully analyzed with topics and segments');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function listRecordings() {
  console.log(`📋 LISTING ALL RECORDINGS`);
  console.log('=' .repeat(40));

  try {
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, title, status, created_at, transcript, ai_generated_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching recordings:', error.message);
      return;
    }

    if (!recordings || recordings.length === 0) {
      console.log('📭 No recordings found in database');
      console.log('💡 Tip: Use "create-test" command to create a test recording');
      return;
    }

    console.log(`📊 Found ${recordings.length} recordings:\n`);

    // Get topic counts for each recording
    const recordingIds = recordings.map(r => r.id);
    const { data: topicCounts } = await supabase
      .from('topic_segments')
      .select('recording_id')
      .in('recording_id', recordingIds);

    const topicCountMap = {};
    topicCounts?.forEach(tc => {
      topicCountMap[tc.recording_id] = (topicCountMap[tc.recording_id] || 0) + 1;
    });

    recordings.forEach((recording, index) => {
      const topicCount = topicCountMap[recording.id] || 0;
      console.log(`${index + 1}. "${recording.title}"`);
      console.log(`   ID: ${recording.id}`);
      console.log(`   Status: ${recording.status}`);
      console.log(`   Created: ${new Date(recording.created_at).toLocaleString()}`);
      console.log(`   Has Transcript: ${!!recording.transcript ? 'Yes' : 'No'}`);
      console.log(`   Topic Segments: ${topicCount}`);
      console.log(`   AI Generated: ${recording.ai_generated_at ? 'Yes' : 'No'}`);
      
      // Analysis status
      let status = '';
      if (!recording.transcript) {
        status = '❌ Needs processing';
      } else if (topicCount === 0) {
        status = '⚠️  Needs topic analysis';
      } else {
        status = '✅ Fully analyzed';
      }
      console.log(`   Analysis: ${status}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testAnalyzeFunction(recordingId) {
  console.log(`🧪 TESTING ANALYZE-SPEAKERS-TOPICS FUNCTION`);
  console.log(`Recording ID: ${recordingId}`);
  console.log('=' .repeat(60));

  try {
    // First check prerequisites
    console.log('1️⃣ Checking prerequisites...');
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('id, title, transcript, status')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      console.log('❌ Recording not found');
      return;
    }

    console.log(`✅ Recording: "${recording.title}"`);
    console.log(`   Status: ${recording.status}`);
    console.log(`   Has transcript: ${!!recording.transcript ? 'Yes' : 'No'}`);
    
    if (!recording.transcript) {
      console.log('❌ Cannot test - no transcript available');
      return;
    }

    // Test the function
    console.log('\n2️⃣ Calling analyze-speakers-topics function...');
    const startTime = Date.now();
    
    const { data: result, error: functionError } = await supabase.functions.invoke('analyze-speakers-topics', {
      body: { recording_id: recordingId }
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Execution time: ${duration}ms`);

    if (functionError) {
      console.error('❌ Function error:', functionError);
      return;
    }

    console.log('✅ Function executed successfully!');
    console.log(`   Topics generated: ${result.topics_count || 0}`);
    console.log(`   Speakers found: ${result.speakers?.length || 0}`);
    console.log(`   Provider: ${result.provider || 'unknown'}`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

async function createTestRecording() {
  console.log(`🛠️  CREATING TEST RECORDING`);
  console.log('=' .repeat(30));

  const testData = {
    title: 'Test Recording for Analysis Debug',
    description: 'Generated by recording-analysis-toolkit for debugging purposes',
    status: 'completed',
    file_type: 'audio',
    transcript: `Hi, this is John from Acme Sales. I'm calling to follow up on our conversation about your software needs.

Hello John, this is Sarah, the CTO at TechCorp. Thanks for calling. We've been reviewing your proposal.

Great! I wanted to discuss the pricing we talked about. Based on your requirements for 500 users, our enterprise package would be $50,000 annually.

That's within our budget range. However, I have some concerns about the implementation timeline. Our IT team is pretty stretched right now.

I understand completely. We can work with your timeline. What would be ideal for you?

Ideally, we'd like to start the implementation in Q2 next year. That would give us time to prepare our infrastructure.

Perfect. I'll note that in our system. Now, regarding the technical specifications you mentioned...

Yes, we need API integration with our existing CRM system. Is that something you support?

Absolutely. We have pre-built connectors for most major CRM platforms. Which system are you using?

We're using Salesforce Enterprise. We need real-time data synchronization.

That's one of our most popular integrations. We can have that set up during the implementation phase.

Excellent. What are the next steps to move forward with this?

I'll send you a formal proposal by end of week, and we can schedule a technical deep-dive call with our engineering team.

Sounds good. I'll review it with my team and get back to you within a week.

Perfect. Thank you for your time today, Sarah. I'll be in touch soon.

Thank you, John. Looking forward to working together.`,
    content_type: 'sales_call',
    enable_coaching: true
  };

  try {
    const { data: newRecording, error } = await supabase
      .from('recordings')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating test recording:', error.message);
      return;
    }

    console.log('✅ Test recording created successfully!');
    console.log(`   ID: ${newRecording.id}`);
    console.log(`   Title: ${newRecording.title}`);
    console.log(`   Status: ${newRecording.status}`);
    console.log(`   Transcript length: ${newRecording.transcript.length} characters`);
    console.log(`\n💡 You can now test with this recording:`);
    console.log(`   node recording-analysis-toolkit.js check ${newRecording.id}`);
    console.log(`   node recording-analysis-toolkit.js test ${newRecording.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkDatabaseStatus() {
  console.log(`🔍 DATABASE STATUS CHECK`);
  console.log('=' .repeat(30));

  try {
    const tables = ['recordings', 'topic_segments', 'speaker_segments', 'ai_usage_logs'];
    
    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: ${count} records`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }

    console.log(`\n📊 Connection info:`);
    console.log(`   Supabase URL: ${supabaseUrl}`);
    console.log(`   Has Anon Key: ${!!supabaseKey}`);
    console.log(`   Has Service Key: ${!!supabaseServiceKey}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
const command = process.argv[2];
const recordingId = process.argv[3] || '756c2e77-8c48-4755-9009-312d28d47189';

switch (command) {
  case 'check':
    checkRecording(recordingId);
    break;
  case 'list':
    listRecordings();
    break;
  case 'test':
    testAnalyzeFunction(recordingId);
    break;
  case 'create-test':
    createTestRecording();
    break;
  case 'db-status':
    checkDatabaseStatus();
    break;
  case 'help':
  default:
    showHelp();
    break;
}