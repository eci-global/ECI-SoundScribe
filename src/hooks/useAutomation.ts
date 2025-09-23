import { useState, useEffect } from 'react';
import { AutomationRule, ruleEngine, ExecutionResult } from '@/utils/automation/ruleEngine';
import { scheduler, ScheduledJob } from '@/utils/automation/scheduler';
import { eventSystem, EventTypes } from '@/utils/automation/eventSystem';

export interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface AutomationAction {
  id: string;
  type: 'send_email' | 'send_notification' | 'create_task' | 'update_record' | 'call_webhook' | 'run_query' | 'export_data';
  config: any;
}

export interface AutomationStats {
  total_rules: number;
  active_rules: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  scheduled_jobs: number;
  event_rules: number;
}

export interface CreateRuleParams {
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'webhook' | 'manual';
    config: any;
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    logical_operator?: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: string;
    config: any;
  }>;
}

export const useAutomation = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize automation system
  useEffect(() => {
    loadRules();
  }, []);

  // Load rules from storage or database
  const loadRules = () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from the database
      // For demo, we'll create some sample rules
      const sampleRules: AutomationRule[] = [
        {
          id: 'rule-1',
          name: 'Daily Summary Reports',
          description: 'Generate and email daily summary reports to managers',
          enabled: true,
          trigger: {
            type: 'schedule',
            config: { cron: '0 9 * * *', timezone: 'America/New_York' }
          },
          conditions: [],
          actions: [
            {
              id: 'action-1',
              type: 'export_data',
              config: {
                export_type: 'pdf',
                filters: { date_range: 'last_24_hours' },
                filename: 'daily_summary_report.pdf'
              }
            },
            {
              id: 'action-2',
              type: 'send_email',
              config: {
                to: ['managers@company.com'],
                subject: 'Daily Summary Report',
                body: 'Please find attached the daily summary report.',
                template: 'daily_report'
              }
            }
          ],
          created_at: '2025-01-15T00:00:00Z',
          updated_at: '2025-01-20T00:00:00Z',
          last_executed: '2025-01-20T09:00:00Z',
          execution_count: 156,
          success_count: 154,
          error_count: 2
        }
      ];

      setRules(sampleRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new automation rule
  const createRule = async (params: CreateRuleParams): Promise<AutomationRule> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const rule: AutomationRule = {
        id: crypto.randomUUID(),
        name: params.name,
        description: params.description,
        enabled: true,
        trigger: params.trigger,
        conditions: params.conditions.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          operator: c.operator as AutomationCondition['operator']
        })),
        actions: params.actions.map(a => ({
          ...a,
          id: crypto.randomUUID(),
          type: a.type as AutomationAction['type']
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_count: 0,
        success_count: 0,
        error_count: 0
      };

      // Update local state
      setRules(prev => [...prev, rule]);
      
      return rule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing rule
  const updateRule = async (ruleId: string, updates: Partial<AutomationRule>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const existingRule = rules.find(r => r.id === ruleId);
      if (!existingRule) {
        throw new Error('Rule not found');
      }

      const updatedRule: AutomationRule = {
        ...existingRule,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Update local state
      setRules(prev => prev.map(r => r.id === ruleId ? updatedRule : r));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a rule
  const deleteRule = async (ruleId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update local state
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle rule enabled/disabled
  const toggleRule = async (ruleId: string): Promise<void> => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    await updateRule(ruleId, { enabled: !rule.enabled });
  };

  // Execute a rule manually
  const executeRule = async (ruleId: string): Promise<ExecutionResult> => {
    setError(null);
    
    try {
      // In a real implementation, this would call the rule engine
      // For now, return a mock result that matches the ExecutionResult interface
      const result: ExecutionResult = {
        success: true,
        message: 'Rule executed successfully',
        execution_time_ms: Math.random() * 1000,
        actions_executed: 1,
        actions_failed: 0
      };
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Get automation statistics
  const getStats = (): AutomationStats => {
    const activeRules = rules.filter(r => r.enabled);
    const totalExecutions = rules.reduce((sum, r) => sum + r.execution_count, 0);
    const successfulExecutions = rules.reduce((sum, r) => sum + r.success_count, 0);
    const failedExecutions = rules.reduce((sum, r) => sum + r.error_count, 0);
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      total_rules: rules.length,
      active_rules: activeRules.length,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      success_rate: successRate,
      scheduled_jobs: 0,
      event_rules: rules.filter(r => r.trigger.type === 'event').length
    };
  };

  return {
    // State
    rules,
    isLoading,
    error,
    
    // Actions
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    executeRule,
    
    // Getters
    getStats,
    
    // Utilities
    loadRules
  };
};
