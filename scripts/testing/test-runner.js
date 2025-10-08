#!/usr/bin/env node

/**
 * SoundScribe Test Runner
 * 
 * This script consolidates all testing utilities and provides
 * a unified interface for running various types of tests.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class TestRunner {
  constructor() {
    this.scriptsDir = path.join(process.cwd(), 'scripts', 'testing');
  }

  /**
   * List all available test scripts
   */
  listTests() {
    console.log('🧪 Available Test Scripts:');
    console.log('==========================');
    
    const categories = {
      'Database Tests': ['check-*.js', 'check-*.cjs', 'check-*.mjs'],
      'System Tests': ['test-*.js', 'test-*.html'],
      'Simple Tests': ['simple-test.js', 'test.js'],
      'Comprehensive Tests': ['comprehensive-*.cjs', 'summary-*.cjs']
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
   * Run database connectivity test
   */
  async testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
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
   * Test authentication
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication...');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('❌ Authentication test failed:', error.message);
        return false;
      }
      
      console.log('✅ Authentication service accessible');
      return true;
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return false;
    }
  }

  /**
   * Test Edge Functions
   */
  async testEdgeFunctions() {
    console.log('⚡ Testing Edge Functions...');
    
    const functions = [
      'process-recording',
      'chat-with-recording',
      'generate-coaching',
      'detect-employee-voice',
      'train-employee-voice'
    ];

    const results = {};
    
    for (const func of functions) {
      try {
        const { data, error } = await supabase.functions.invoke(func, {
          body: { test: true }
        });
        
        if (error) {
          results[func] = { status: 'error', message: error.message };
        } else {
          results[func] = { status: 'success', message: 'Function accessible' };
        }
      } catch (err) {
        results[func] = { status: 'error', message: err.message };
      }
    }

    console.log('\n📊 Edge Function Status:');
    console.log('========================');
    Object.entries(results).forEach(([func, result]) => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} ${func}: ${result.message}`);
    });

    return results;
  }

  /**
   * Run a specific test script
   */
  async runTest(testName) {
    console.log(`🧪 Running test: ${testName}`);
    
    const testPath = path.join(this.scriptsDir, testName);
    
    if (!fs.existsSync(testPath)) {
      console.log(`❌ Test not found: ${testPath}`);
      return false;
    }

    try {
      // Import and run the test
      const testModule = await import(`file://${testPath}`);
      console.log('📄 Test script loaded and executed');
      return true;
    } catch (error) {
      console.log(`❌ Error running test: ${error.message}`);
      return false;
    }
  }

  /**
   * Run all system tests
   */
  async runSystemTests() {
    console.log('🚀 Running comprehensive system tests...');
    
    const results = {
      database: await this.testDatabaseConnection(),
      authentication: await this.testAuthentication(),
      edgeFunctions: await this.testEdgeFunctions()
    };

    console.log('\n📊 System Test Results:');
    console.log('======================');
    Object.entries(results).forEach(([test, result]) => {
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });

    return results;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🧪 SoundScribe Test Runner
==========================

Usage:
  node test-runner.js [command] [options]

Commands:
  list                    List all available test scripts
  system                  Run comprehensive system tests
  database                Test database connectivity
  auth                    Test authentication
  functions               Test Edge Functions
  run <test>             Run a specific test script
  help                   Show this help message

Examples:
  node test-runner.js list
  node test-runner.js system
  node test-runner.js database
  node test-runner.js run check-recordings.js

Available Tests:
  - Database Tests: check-*.js, check-*.cjs, check-*.mjs
  - System Tests: test-*.js, test-*.html
  - Simple Tests: simple-test.js, test.js
  - Comprehensive Tests: comprehensive-*.cjs, summary-*.cjs
`);
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'list':
      runner.listTests();
      break;
      
    case 'system':
      await runner.runSystemTests();
      break;
      
    case 'database':
      await runner.testDatabaseConnection();
      break;
      
    case 'auth':
      await runner.testAuthentication();
      break;
      
    case 'functions':
      await runner.testEdgeFunctions();
      break;
      
    case 'run':
      if (!arg) {
        console.log('❌ Please specify a test name');
        runner.showHelp();
        process.exit(1);
      }
      await runner.runTest(arg);
      break;
      
    case 'help':
    default:
      runner.showHelp();
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TestRunner;
