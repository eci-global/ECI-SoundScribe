#!/usr/bin/env node

/**
 * SoundScribe Database Maintenance Script
 * 
 * This script consolidates common database maintenance tasks
 * and provides a unified interface for database operations.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class DatabaseMaintenance {
  constructor() {
    this.scriptsDir = path.join(process.cwd(), 'scripts', 'database');
  }

  /**
   * List all available database scripts
   */
  listScripts() {
    console.log('📋 Available Database Scripts:');
    console.log('================================');
    
    const categories = {
      'Schema Fixes': ['fix-*.sql'],
      'Quick Fixes': ['quick-fix-*.sql'],
      'Data Checks': ['check-*.sql'],
      'Schema Additions': ['add-*.sql'],
      'Permissions': ['grant-*.sql', 'force-*.sql'],
      'Maintenance': ['enable-*.sql', 'manual-*.sql']
    };

    Object.entries(categories).forEach(([category, patterns]) => {
      console.log(`\n${category}:`);
      patterns.forEach(pattern => {
        const files = this.findFiles(pattern);
        files.forEach(file => console.log(`  - ${file}`));
      });
    });
  }

  /**
   * Find files matching a pattern
   */
  findFiles(pattern) {
    try {
      const files = fs.readdirSync(this.scriptsDir);
      const regex = new RegExp(pattern.replace('*', '.*'));
      return files.filter(file => regex.test(file));
    } catch (error) {
      return [];
    }
  }

  /**
   * Check database connection
   */
  async checkConnection() {
    console.log('🔍 Checking database connection...');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('❌ Database connection failed:', error.message);
        return false;
      }
      
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.log('❌ Database connection error:', error.message);
      return false;
    }
  }

  /**
   * Check table existence
   */
  async checkTables() {
    console.log('🔍 Checking table existence...');
    
    const tables = [
      'profiles',
      'recordings', 
      'user_roles',
      'employees',
      'teams',
      'employee_call_participation',
      'employee_scorecards',
      'employee_performance_trends',
      'manager_coaching_notes',
      'employee_voice_profiles'
    ];

    const results = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          results[table] = { exists: false, error: error.message };
        } else {
          results[table] = { exists: true, error: null };
        }
      } catch (err) {
        results[table] = { exists: false, error: err.message };
      }
    }

    console.log('\n📊 Table Status:');
    console.log('================');
    Object.entries(results).forEach(([table, status]) => {
      const icon = status.exists ? '✅' : '❌';
      console.log(`${icon} ${table}: ${status.exists ? 'EXISTS' : 'MISSING'}`);
      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    });

    return results;
  }

  /**
   * Run a specific database script
   */
  async runScript(scriptName) {
    console.log(`🔧 Running script: ${scriptName}`);
    
    const scriptPath = path.join(this.scriptsDir, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      console.log(`❌ Script not found: ${scriptPath}`);
      return false;
    }

    try {
      const sql = fs.readFileSync(scriptPath, 'utf8');
      console.log('📄 Script content loaded');
      
      // Note: Direct SQL execution requires service role or RPC function
      console.log('⚠️  Note: This script contains SQL that needs to be executed in Supabase Dashboard');
      console.log('📋 SQL Content:');
      console.log('==============');
      console.log(sql);
      
      return true;
    } catch (error) {
      console.log(`❌ Error reading script: ${error.message}`);
      return false;
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🗄️  SoundScribe Database Maintenance Tool
==========================================

Usage:
  node database-maintenance.js [command] [options]

Commands:
  list                    List all available database scripts
  check                   Check database connection and table status
  run <script>           Run a specific database script
  help                   Show this help message

Examples:
  node database-maintenance.js list
  node database-maintenance.js check
  node database-maintenance.js run fix-recordings-table.sql

Available Scripts:
  - Schema fixes: fix-*.sql
  - Quick fixes: quick-fix-*.sql  
  - Data checks: check-*.sql
  - Schema additions: add-*.sql
  - Permissions: grant-*.sql, force-*.sql
  - Maintenance: enable-*.sql, manual-*.sql
`);
  }
}

// Main execution
async function main() {
  const maintenance = new DatabaseMaintenance();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'list':
      maintenance.listScripts();
      break;
      
    case 'check':
      await maintenance.checkConnection();
      await maintenance.checkTables();
      break;
      
    case 'run':
      if (!arg) {
        console.log('❌ Please specify a script name');
        maintenance.showHelp();
        process.exit(1);
      }
      await maintenance.runScript(arg);
      break;
      
    case 'help':
    default:
      maintenance.showHelp();
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DatabaseMaintenance;
