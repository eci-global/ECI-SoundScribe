// Quick script to add sample BDR data for testing analytics
// Run this to populate the database with realistic sample data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321'; // Local Supabase
const supabaseKey = 'your-anon-key'; // Replace with your actual key

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleData() {
  console.log('🎯 Adding sample BDR training data...');

  try {
    // Add sample training program
    const { data: program, error: programError } = await supabase
      .from('bdr_training_programs')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Q1 2025 Sales Training Program',
        description: 'Comprehensive BDR training program with coaching analytics',
        is_active: true
      });

    if (programError) {
      console.log('Program error (might already exist):', programError.message);
    } else {
      console.log('✅ Training program added');
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }

    // Add sample datasets with agent names
    const datasets = [
      { id: '550e8400-e29b-41d4-a716-446655440001', agent_name: 'Sarah Johnson', call_title: 'Outbound Prospecting Call - Tech Solutions' },
      { id: '550e8400-e29b-41d4-a716-446655440002', agent_name: 'Mike Rodriguez', call_title: 'Follow-up Call - Enterprise Account' },
      { id: '550e8400-e29b-41d4-a716-446655440003', agent_name: 'Emma Chen', call_title: 'Discovery Call - Healthcare Prospect' },
      { id: '550e8400-e29b-41d4-a716-446655440004', agent_name: 'David Smith', call_title: 'Qualification Call - SMB Lead' },
      { id: '550e8400-e29b-41d4-a716-446655440005', agent_name: 'Lisa Park', call_title: 'Demo Scheduling Call - SaaS Platform' }
    ];

    for (const dataset of datasets) {
      const { error } = await supabase
        .from('bdr_training_datasets')
        .upsert({
          ...dataset,
          training_program_id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: user.id
        });

      if (error) {
        console.log(`Dataset error for ${dataset.agent_name}:`, error.message);
      }
    }
    console.log('✅ Training datasets added');

    // Add sample scorecard evaluations
    const evaluations = [
      { dataset_id: '550e8400-e29b-41d4-a716-446655440001', opening: 4, objection: 3, qualification: 4, tone: 3, assertiveness: 4, business: 3, closing: 4, talk_time: 3, overall: 3.5, notes: 'Excellent opening and closing. Work on objection handling.' },
      { dataset_id: '550e8400-e29b-41d4-a716-446655440002', opening: 3, objection: 4, qualification: 3, tone: 4, assertiveness: 3, business: 3, closing: 3, talk_time: 4, overall: 3.3, notes: 'Great energy and objection handling. Focus on qualification depth.' },
      { dataset_id: '550e8400-e29b-41d4-a716-446655440003', opening: 3, objection: 3, qualification: 4, tone: 3, assertiveness: 3, business: 4, closing: 3, talk_time: 3, overall: 3.2, notes: 'Strong business acumen and qualification skills.' },
      { dataset_id: '550e8400-e29b-41d4-a716-446655440004', opening: 2, objection: 3, qualification: 2, tone: 3, assertiveness: 2, business: 2, closing: 3, talk_time: 2, overall: 2.4, notes: 'Show improvement in opening and assertiveness.' },
      { dataset_id: '550e8400-e29b-41d4-a716-446655440005', opening: 3, objection: 2, qualification: 3, tone: 4, assertiveness: 3, business: 3, closing: 2, talk_time: 4, overall: 3.0, notes: 'Excellent talk time management. Work on closing.' }
    ];

    for (const eval of evaluations) {
      const { error } = await supabase
        .from('bdr_scorecard_evaluations')
        .upsert({
          training_dataset_id: eval.dataset_id,
          training_program_id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: user.id,
          opening_score: eval.opening,
          objection_handling_score: eval.objection,
          qualification_score: eval.qualification,
          tone_energy_score: eval.tone,
          assertiveness_control_score: eval.assertiveness,
          business_acumen_score: eval.business,
          closing_score: eval.closing,
          talk_time_score: eval.talk_time,
          overall_score: eval.overall,
          manager_notes: eval.notes
        });

      if (error) {
        console.log(`Evaluation error:`, error.message);
      }
    }
    console.log('✅ Scorecard evaluations added');

    console.log('🎉 Sample data added successfully! Refresh your analytics dashboard.');

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

addSampleData();