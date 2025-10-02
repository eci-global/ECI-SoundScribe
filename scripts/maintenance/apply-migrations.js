#!/usr/bin/env node

/**
 * Database Migration Application Script
 * 
 * This script helps you apply the manager feedback system migrations
 * to your Supabase database in development.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration files to apply in order
const MIGRATION_FILES = [
  'supabase/migrations/20250120000001_create_manager_feedback_corrections.sql',
  'supabase/migrations/20250120000002_create_constraint_system_tables.sql'
];

function readMigrationFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading migration file ${filePath}:`, error.message);
    return null;
  }
}

function displayMigrationInstructions() {
  console.log('\n🚀 Database Migration Instructions\n');
  console.log('To apply the manager feedback system migrations:\n');
  
  console.log('📋 OPTION 1: Supabase Dashboard (Recommended)');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste each migration file below');
  console.log('4. Run each migration in order\n');
  
  console.log('📋 OPTION 2: Direct SQL Execution');
  console.log('1. Connect to your PostgreSQL database');
  console.log('2. Run the SQL commands from each migration file');
  console.log('3. Verify tables were created successfully\n');
  
  console.log('📋 OPTION 3: Supabase CLI');
  console.log('1. Run: npx supabase db push');
  console.log('2. Verify migrations were applied\n');
}

function displayMigrationContent() {
  console.log('\n📄 MIGRATION FILES CONTENT\n');
  console.log('=' .repeat(80));
  
  MIGRATION_FILES.forEach((filePath, index) => {
    console.log(`\n🔧 MIGRATION ${index + 1}: ${filePath}`);
    console.log('-'.repeat(60));
    
    const content = readMigrationFile(filePath);
    if (content) {
      console.log(content);
    } else {
      console.log(`❌ Could not read migration file: ${filePath}`);
    }
    
    console.log('\n' + '='.repeat(80));
  });
}

function displayVerificationQueries() {
  console.log('\n🧪 VERIFICATION QUERIES\n');
  console.log('Run these queries after applying migrations to verify success:\n');
  
  console.log('-- Check if all tables exist');
  console.log(`
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'manager_feedback_corrections',
  'ai_calibration_constraints',
  'constraint_updates',
  'validation_queue',
  'validation_alerts',
  'ai_calibration_logs'
);
  `);
  
  console.log('\n-- Check RLS policies');
  console.log(`
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('manager_feedback_corrections', 'ai_calibration_constraints');
  `);
  
  console.log('\n-- Test insert permissions (replace UUIDs with real ones)');
  console.log(`
INSERT INTO manager_feedback_corrections (
  evaluation_id,
  manager_id,
  recording_id,
  original_ai_scores,
  original_overall_score,
  corrected_scores,
  corrected_overall_score,
  criteria_adjustments,
  change_reason,
  manager_notes,
  confidence_level,
  score_variance,
  high_variance
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual evaluation ID
  '00000000-0000-0000-0000-000000000000', -- Replace with your user ID
  '00000000-0000-0000-0000-000000000000', -- Replace with actual recording ID
  '{"opening": {"score": 3.0}, "objection_handling": {"score": 2.5}}',
  2.75,
  '{"opening": {"score": 3.5}, "objection_handling": {"score": 3.0}}',
  3.25,
  '{"opening": {"score": 3.5, "original": 3.0}, "objection_handling": {"score": 3.0, "original": 2.5}}',
  'too_lenient',
  'Test feedback submission',
  4,
  0.5,
  false
);
  `);
}

function main() {
  console.log('🎯 Manager Feedback System - Database Migration Helper\n');
  
  // Check if migration files exist
  const missingFiles = MIGRATION_FILES.filter(filePath => {
    const fullPath = path.join(__dirname, filePath);
    return !fs.existsSync(fullPath);
  });
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing migration files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\nPlease ensure all migration files exist before proceeding.\n');
    return;
  }
  
  console.log('✅ All migration files found!');
  
  // Display instructions
  displayMigrationInstructions();
  
  // Display migration content
  displayMigrationContent();
  
  // Display verification queries
  displayVerificationQueries();
  
  console.log('\n🎉 Migration setup complete!');
  console.log('\nNext steps:');
  console.log('1. Apply the migrations using one of the methods above');
  console.log('2. Run the verification queries');
  console.log('3. Test the feedback system with real data');
  console.log('4. Update your application to use the new tables');
}

// Run the script
main();
