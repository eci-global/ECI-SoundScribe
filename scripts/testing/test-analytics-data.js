// Quick test script to add sample data and test analytics
// This will help us verify if the Edge Function is working

import { createClient } from '@supabase/supabase-js';

// Use your actual Supabase project URL - check your .env or integrations file
const supabaseUrl = 'https://qinkldgvejheppheykfl.supabase.co'; // From config.toml project_id
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4'; // From client.ts

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalytics() {
  console.log('🧪 Testing Analytics Data...');

  try {
    // First, let's see if we can get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log('⚠️ No authenticated user, using anonymous access');
    } else {
      console.log('✅ Current user:', user?.email);
    }

    // Check if sample data exists
    console.log('\n📊 Checking existing data...');

    const { data: programs } = await supabase
      .from('bdr_training_programs')
      .select('*')
      .limit(5);
    console.log('Training Programs:', programs?.length || 0);

    const { data: evaluations } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('*')
      .limit(5);
    console.log('Scorecard Evaluations:', evaluations?.length || 0);

    if (evaluations && evaluations.length > 0) {
      console.log('Sample evaluation:', {
        call_identifier: evaluations[0].call_identifier,
        user_id: evaluations[0].user_id,
        created_at: evaluations[0].created_at
      });
    }

    // Test the analytics Edge Function with your specific training program ID
    console.log('\n🚀 Testing Analytics Edge Function...');
    const trainingProgramId = '03f558d4-dfb2-4ea3-ae98-8ec2857acf2e'; // Your actual program ID
    const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('get-training-analytics', {
      body: {
        type: 'user_progress',
        trainingProgramId: trainingProgramId,
        options: {}
      }
    });

    // Also check data for that specific training program
    const { data: programEvaluations } = await supabase
      .from('bdr_scorecard_evaluations')
      .select('*')
      .eq('training_program_id', trainingProgramId)
      .limit(5);
    console.log('Evaluations for program', trainingProgramId, ':', programEvaluations?.length || 0);

    if (programEvaluations && programEvaluations.length > 0) {
      console.log('\n📋 Sample evaluation details:');
      programEvaluations.forEach((evaluation, idx) => {
        console.log(`${idx + 1}. call_identifier: "${evaluation.call_identifier}", user_id: ${evaluation.user_id?.slice(0, 8)}, scores: [${evaluation.opening_score}, ${evaluation.objection_handling_score}, ${evaluation.qualification_score}]`);
      });
    }

    if (analyticsError) {
      console.error('❌ Analytics Error:', analyticsError);
    } else {
      console.log('✅ Analytics Response:', {
        success: !!analyticsData?.data,
        hasUserProgress: !!analyticsData?.data?.user_progress,
        hasTopPerformers: !!analyticsData?.data?.top_performers,
        topPerformersCount: analyticsData?.data?.top_performers?.length || 0
      });

      if (analyticsData?.data?.top_performers?.length > 0) {
        console.log('Top Performers Found:');
        analyticsData.data.top_performers.forEach((performer, index) => {
          console.log(`  ${index + 1}. ${performer.userName} (Score: ${performer.overallScore})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// If we need to add sample data
async function addSampleData() {
  console.log('➕ Adding sample BDR data...');

  try {
    // Add sample training program
    const { error: programError } = await supabase
      .from('bdr_training_programs')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Q1 2025 Sales Training Program',
        description: 'Comprehensive BDR training program with coaching analytics',
        is_active: true
      });

    if (programError && !programError.message.includes('already exists')) {
      console.log('Program error:', programError.message);
    } else {
      console.log('✅ Training program ready');
    }

    // Add Milan Jandu's evaluation (matching your upload)
    const { error: evalError } = await supabase
      .from('bdr_scorecard_evaluations')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440999',
        training_program_id: '550e8400-e29b-41d4-a716-446655440000',
        call_identifier: 'Milan Jandu', // This is what should show in analytics
        user_id: '550e8400-e29b-41d4-a716-446655440000', // Use the same ID for consistency
        opening_score: 3,
        objection_handling_score: 4,
        qualification_score: 3,
        tone_energy_score: 3,
        assertiveness_control_score: 3,
        business_acumen_score: 3,
        closing_score: 4,
        talk_time_score: 3,
        overall_score: 3.25,
        manager_notes: 'Strong performance from Milan Jandu with excellent closing techniques.',
        created_at: new Date().toISOString()
      });

    if (evalError) {
      console.log('Evaluation error:', evalError.message);
    } else {
      console.log('✅ Milan Jandu scorecard evaluation added');
    }

  } catch (error) {
    console.error('❌ Failed to add sample data:', error);
  }
}

// Run the tests
console.log('🎯 BDR Analytics Test Suite Starting...\n');
await addSampleData();
console.log('\n' + '='.repeat(50) + '\n');
await testAnalytics();