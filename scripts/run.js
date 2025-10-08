#!/usr/bin/env node

/**
 * SoundScribe Scripts Runner
 * 
 * This is the main entry point for all SoundScribe maintenance scripts.
 * It provides a unified interface for running database, testing, and
 * maintenance operations.
 */

import DatabaseMaintenance from './database/database-maintenance.js';
import TestRunner from './testing/test-runner.js';

class ScriptsRunner {
  constructor() {
    this.database = new DatabaseMaintenance();
    this.testing = new TestRunner();
  }

  /**
   * Show main help information
   */
  showHelp() {
    console.log(`
🗄️  SoundScribe Scripts Runner
==============================

This is the main entry point for all SoundScribe maintenance scripts.

Usage:
  node scripts/run.js [category] [command] [options]

Categories:
  database                 Database maintenance and operations
  testing                 Test execution and validation
  help                    Show this help message

Database Commands:
  node scripts/run.js database list
  node scripts/run.js database check
  node scripts/run.js database run <script>

Testing Commands:
  node scripts/run.js testing list
  node scripts/run.js testing system
  node scripts/run.js testing database
  node scripts/run.js testing run <test>

Examples:
  node scripts/run.js database check
  node scripts/run.js testing system
  node scripts/run.js database run fix-recordings-table.sql
  node scripts/run.js testing run check-recordings.js

Directory Structure:
  scripts/
  ├── run.js                    # This file (main entry point)
  ├── database/                 # Database maintenance scripts
  │   ├── database-maintenance.js
  │   ├── fix-*.sql            # Schema fixes
  │   ├── quick-fix-*.sql      # Quick fixes
  │   └── check-*.sql          # Data checks
  ├── testing/                  # Test scripts
  │   ├── test-runner.js
  │   ├── test-*.js            # Test scripts
  │   └── check-*.js           # Check scripts
  ├── deployment/              # Deployment scripts
  └── maintenance/             # General maintenance
`);
  }

  /**
   * Run database commands
   */
  async runDatabase(command, arg) {
    switch (command) {
      case 'list':
        this.database.listScripts();
        break;
      case 'check':
        await this.database.checkConnection();
        await this.database.checkTables();
        break;
      case 'run':
        if (!arg) {
          console.log('❌ Please specify a script name');
          this.database.showHelp();
          return;
        }
        await this.database.runScript(arg);
        break;
      default:
        this.database.showHelp();
        break;
    }
  }

  /**
   * Run testing commands
   */
  async runTesting(command, arg) {
    switch (command) {
      case 'list':
        this.testing.listTests();
        break;
      case 'system':
        await this.testing.runSystemTests();
        break;
      case 'database':
        await this.testing.testDatabaseConnection();
        break;
      case 'auth':
        await this.testing.testAuthentication();
        break;
      case 'functions':
        await this.testing.testEdgeFunctions();
        break;
      case 'run':
        if (!arg) {
          console.log('❌ Please specify a test name');
          this.testing.showHelp();
          return;
        }
        await this.testing.runTest(arg);
        break;
      default:
        this.testing.showHelp();
        break;
    }
  }

  /**
   * Main execution
   */
  async run() {
    const category = process.argv[2];
    const command = process.argv[3];
    const arg = process.argv[4];

    switch (category) {
      case 'database':
        await this.runDatabase(command, arg);
        break;
      case 'testing':
        await this.runTesting(command, arg);
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }
}

// Main execution
async function main() {
  const runner = new ScriptsRunner();
  await runner.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ScriptsRunner;
