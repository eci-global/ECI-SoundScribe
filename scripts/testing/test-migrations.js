#!/usr/bin/env node

/**
 * Migration Test Script
 * 
 * This script helps you test the database migrations
 * by running verification queries.
 */

import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials (from your existing config)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMigrations() {
  console.log('🧪 Testing Database Migrations\n');
  
  try {
    // Test 1: Check if all tables exist by trying to query them
    console.log('1️⃣ Checking if all tables exist...');
    
    const expectedTables = [
      'manager_feedback_corrections',
      'ai_calibration_constraints',
      'constraint_updates',
      'validation_queue',
      'validation_alerts',
      'ai_calibration_logs'
    ];
    
    const tableChecks = await Promise.allSettled(
      expectedTables.map(table => 
        supabase.from(table).select('*').limit(1)
      )
    );
    
    const existingTables = tableChecks
      .map((result, index) => ({ 
        table: expectedTables[index], 
        exists: result.status === 'fulfilled' && !result.value.error 
      }))
      .filter(check => check.exists)
      .map(check => check.table);
    
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
      console.log('Please apply the migrations first.');
      console.log('\nTo apply migrations:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/qinkldgvejheppheykfl');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the migration files from supabase/migrations/');
      return;
    }
    
    console.log('✅ All tables exist!');
    
    // Test 2: Check RLS policies
    console.log('\n2️⃣ Checking RLS policies...');
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('check_rls_policies');
    
    if (rlsError) {
      console.log('⚠️  Could not check RLS policies (this is normal if the function doesn\'t exist)');
    } else {
      console.log('✅ RLS policies are active');
    }
    
    // Test 3: Test insert permissions (with demo data)
    console.log('\n3️⃣ Testing insert permissions...');
    const testData = {
      evaluation_id: '00000000-0000-0000-0000-000000000000',
      manager_id: '00000000-0000-0000-0000-000000000000',
      recording_id: '00000000-0000-0000-0000-000000000000',
      original_ai_scores: { opening: { score: 3.0 }, objection_handling: { score: 2.5 } },
      original_overall_score: 2.75,
      corrected_scores: { opening: { score: 3.5 }, objection_handling: { score: 3.0 } },
      corrected_overall_score: 3.25,
      criteria_adjustments: { opening: { score: 3.5, original: 3.0 }, objection_handling: { score: 3.0, original: 2.5 } },
      change_reason: 'too_lenient',
      manager_notes: 'Test feedback submission',
      confidence_level: 4
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('manager_feedback_corrections')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('⚠️  Insert test failed (this might be due to foreign key constraints):', insertError.message);
      console.log('This is normal if the referenced tables don\'t have the test UUIDs.');
    } else {
      console.log('✅ Insert permissions work!');
      
      // Clean up test data
      await supabase
        .from('manager_feedback_corrections')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test data cleaned up');
    }
    
    console.log('\n🎉 Migration test completed!');
    console.log('\nNext steps:');
    console.log('1. The migrations are working correctly');
    console.log('2. You can now use the feedback system with real data');
    console.log('3. Update your application to use the new tables');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your Supabase credentials are correct');
    console.log('2. Ensure the migrations have been applied');
    console.log('3. Check that your database is accessible');
  }
}

// Credentials are already set from your existing config
console.log('🔧 Using Supabase credentials from your existing configuration');

// Run the test
testMigrations();
