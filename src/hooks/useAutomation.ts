import { useState, useEffect, useCallback } from 'react';
import { AutomationRule, ruleEngine, ExecutionResult } from '@/utils/automation/ruleEngine';
import { useAuth } from '@/hooks/useAuth';
import * as automationService from '@/services/automationService';

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
  description?: string;
  trigger: {
    type: 'schedule' | 'event' | 'webhook' | 'manual';
    config: any;
  };
  conditions?: Array<{
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

export const useAutomation = (organizationId?: string) => {
  const { session } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the organization ID from session or prop
  const getOrganizationId = useCallback(() => {
    if (organizationId) return organizationId;
    // Try to get from session metadata or user metadata
    return session?.user?.user_metadata?.organization_id || null;
  }, [organizationId, session]);

  // Load rules from database
  const loadRules = useCallback(async () => {
    const orgId = getOrganizationId();
    if (!orgId) {
      setError('No organization ID found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await automationService.getAutomationRules(orgId);
      setRules(data);

      // Load stats
      const statsData = await automationService.getAutomationStats(orgId);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rules';
      setError(errorMessage);
      console.error('Error loading automation rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getOrganizationId]);

  // Initialize automation system
  useEffect(() => {
    if (session) {
      loadRules();
    }
  }, [session, loadRules]);

  // Create a new automation rule
  const createRule = async (params: CreateRuleParams): Promise<AutomationRule> => {
    const orgId = getOrganizationId();
    if (!orgId) {
      throw new Error('No organization ID found');
    }

    setIsLoading(true);
    setError(null);

    try {
      const rule = await automationService.createAutomationRule(orgId, {
        name: params.name,
        description: params.description,
        trigger_type: params.trigger.type,
        trigger_config: params.trigger.config,
        conditions: params.conditions || [],
        actions: params.actions
      });

      // Update local state
      setRules(prev => [...prev, rule]);

      // Reload stats
      const statsData = await automationService.getAutomationStats(orgId);
      setStats(statsData);

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
      const updateParams: automationService.UpdateRuleParams = {};

      if (updates.name !== undefined) updateParams.name = updates.name;
      if (updates.description !== undefined) updateParams.description = updates.description;
      if (updates.enabled !== undefined) updateParams.enabled = updates.enabled;
      if (updates.trigger) {
        updateParams.trigger_type = updates.trigger.type;
        updateParams.trigger_config = updates.trigger.config;
      }
      if (updates.conditions !== undefined) updateParams.conditions = updates.conditions;
      if (updates.actions !== undefined) updateParams.actions = updates.actions;

      const updatedRule = await automationService.updateAutomationRule(ruleId, updateParams);

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
    const orgId = getOrganizationId();
    if (!orgId) {
      throw new Error('No organization ID found');
    }

    setIsLoading(true);
    setError(null);

    try {
      await automationService.deleteAutomationRule(ruleId);

      // Update local state
      setRules(prev => prev.filter(r => r.id !== ruleId));

      // Reload stats
      const statsData = await automationService.getAutomationStats(orgId);
      setStats(statsData);
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
    const orgId = getOrganizationId();
    if (!orgId) {
      throw new Error('No organization ID found');
    }

    setIsLoading(true);
    setError(null);

    try {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) {
        throw new Error('Rule not found');
      }

      const updatedRule = await automationService.toggleAutomationRule(ruleId, !rule.enabled);

      // Update local state
      setRules(prev => prev.map(r => r.id === ruleId ? updatedRule : r));

      // Reload stats
      const statsData = await automationService.getAutomationStats(orgId);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute a rule manually
  const executeRule = async (ruleId: string): Promise<ExecutionResult> => {
    setError(null);

    try {
      // Execute using the rule engine
      const result = await ruleEngine.executeRule(ruleId, {
        trigger_data: { type: 'manual' }
      });

      // Record the execution
      await automationService.recordExecution(ruleId, result, {
        trigger_type: 'manual'
      });

      // Reload rules to get updated execution counts
      await loadRules();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute rule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Get automation statistics
  const getStats = (): AutomationStats => {
    if (stats) return stats;

    // Fallback to calculating from rules if stats not loaded
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
      scheduled_jobs: rules.filter(r => r.trigger.type === 'schedule').length,
      event_rules: rules.filter(r => r.trigger.type === 'event').length
    };
  };

  // Get execution history for a rule
  const getExecutionHistory = async (ruleId: string) => {
    try {
      return await automationService.getExecutionHistory(ruleId);
    } catch (err) {
      console.error('Error fetching execution history:', err);
      return [];
    }
  };

  return {
    // State
    rules,
    isLoading,
    error,
    stats,

    // Actions
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    executeRule,

    // Getters
    getStats,
    getExecutionHistory,

    // Utilities
    loadRules
  };
};
