// Test script for admin tools functionality
import { AutomationRuleEngine, AutomationRule } from '../utils/automation/ruleEngine';
import { AutomationScheduler } from '../utils/automation/scheduler';
import { AutomationEventSystem, EventTypes } from '../utils/automation/eventSystem';

// Test the rule engine
const testRuleEngine = () => {
  console.log('Testing Rule Engine...');
  
  const engine = new AutomationRuleEngine();
  
  // Create a test rule
  const testRule: AutomationRule = {
    id: 'test-rule-1',
    name: 'Test Email Rule',
    description: 'Send email when user is created',
    enabled: true,
    trigger: {
      type: 'event',
      config: { event: EventTypes.USER_CREATED }
    },
    conditions: [],
    actions: [{
      id: 'action-1',
      type: 'send_email',
      config: {
        to: ['admin@test.com'],
        subject: 'New User Created',
        body: 'A new user has been created in the system.'
      }
    }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    error_count: 0
  };
  
  // Add rule to engine
  engine.addRule(testRule);
  
  // Execute the rule
  engine.executeRule('test-rule-1', {
    trigger_data: {
      event: EventTypes.USER_CREATED,
      data: { id: '123', email: 'test@example.com' }
    }
  }).then(result => {
    console.log('Rule execution result:', result);
  });
  
  console.log('Rule Engine test completed');
};

// Test the scheduler
const testScheduler = () => {
  console.log('Testing Scheduler...');
  
  const scheduler = new AutomationScheduler();
  
  // Create a scheduled rule
  const scheduledRule: AutomationRule = {
    id: 'scheduled-rule-1',
    name: 'Daily Backup',
    description: 'Run daily backup at 2 AM',
    enabled: true,
    trigger: {
      type: 'schedule',
      config: { cron: '0 2 * * *', timezone: 'UTC' }
    },
    conditions: [],
    actions: [{
      id: 'backup-action',
      type: 'export_data',
      config: {
        export_type: 'json',
        filename: 'daily_backup.json'
      }
    }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    error_count: 0
  };
  
  // Add job to scheduler
  scheduler.addJob(scheduledRule);
  
  // Get upcoming runs
  const upcomingRuns = scheduler.getUpcomingRuns('scheduled-rule-1', 3);
  console.log('Upcoming runs:', upcomingRuns);
  
  // Test cron parsing
  const cronDescription = AutomationScheduler.parseCronToReadable('0 2 * * *');
  console.log('Cron description:', cronDescription);
  
  console.log('Scheduler test completed');
};

// Test the event system
const testEventSystem = () => {
  console.log('Testing Event System...');
  
  const eventSystem = new AutomationEventSystem();
  
  // Create an event-triggered rule
  const eventRule: AutomationRule = {
    id: 'event-rule-1',
    name: 'Recording Processing',
    description: 'Process recording when uploaded',
    enabled: true,
    trigger: {
      type: 'event',
      config: { event: EventTypes.RECORDING_CREATED }
    },
    conditions: [{
      id: 'condition-1',
      field: 'data.status',
      operator: 'equals',
      value: 'uploaded'
    }],
    actions: [{
      id: 'process-action',
      type: 'update_record',
      config: {
        table: 'recordings',
        updates: { status: 'processing' }
      }
    }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    error_count: 0
  };
  
  // Register rule
  eventSystem.registerRule(eventRule);
  
  // Emit test event
  eventSystem.emitEvent({
    event: EventTypes.RECORDING_CREATED,
    table: 'recordings',
    operation: 'insert',
    data: { id: '456', status: 'uploaded', title: 'Test Recording' },
    timestamp: new Date().toISOString(),
    user_id: 'user-123'
  });
  
  // Get event history
  const history = eventSystem.getEventHistory(5);
  console.log('Event history:', history);
  
  console.log('Event System test completed');
};

// Run all tests
export const runAdminToolsTests = () => {
  console.log('=== Admin Tools Test Suite ===');
  
  try {
    testRuleEngine();
    testScheduler();
    testEventSystem();
    
    console.log('=== All Tests Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
};

// Export for use in other modules
export { testRuleEngine, testScheduler, testEventSystem };