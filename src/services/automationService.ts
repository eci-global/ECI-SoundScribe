import { supabase } from '@/integrations/supabase/client';
import type { AutomationRule, AutomationTrigger, AutomationAction, AutomationCondition, ExecutionResult } from '@/utils/automation/ruleEngine';

export interface DatabaseAutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type: string;
  trigger_config: any;
  conditions: any[];
  actions: any[];
  execution_count: number;
  success_count: number;
  error_count: number;
  last_executed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecution {
  id: string;
  rule_id: string;
  trigger_type: string;
  trigger_data: any;
  execution_context: any;
  status: 'success' | 'failed' | 'partial';
  success: boolean;
  message: string | null;
  error: string | null;
  execution_time_ms: number;
  actions_executed: number;
  actions_failed: number;
  action_results: any[];
  started_at: string;
  completed_at: string;
}

export interface ScheduledJob {
  id: string;
  rule_id: string;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_result: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleParams {
  name: string;
  description?: string;
  trigger_type: 'schedule' | 'event' | 'webhook' | 'manual';
  trigger_config: any;
  conditions?: any[];
  actions: any[];
  enabled?: boolean;
}

export interface UpdateRuleParams {
  name?: string;
  description?: string;
  enabled?: boolean;
  trigger_type?: string;
  trigger_config?: any;
  conditions?: any[];
  actions?: any[];
}

// Convert database rule to AutomationRule format
function mapDatabaseRuleToAutomationRule(dbRule: DatabaseAutomationRule): AutomationRule {
  return {
    id: dbRule.id,
    name: dbRule.name,
    description: dbRule.description || '',
    enabled: dbRule.enabled,
    trigger: {
      type: dbRule.trigger_type as AutomationTrigger['type'],
      config: dbRule.trigger_config
    },
    conditions: dbRule.conditions || [],
    actions: dbRule.actions || [],
    created_at: dbRule.created_at,
    updated_at: dbRule.updated_at,
    last_executed: dbRule.last_executed_at || undefined,
    execution_count: dbRule.execution_count,
    success_count: dbRule.success_count,
    error_count: dbRule.error_count
  };
}

/**
 * Get all automation rules for the current organization
 */
export async function getAutomationRules(organizationId: string): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from('automations.rules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching automation rules:', error);
    throw new Error(`Failed to fetch automation rules: ${error.message}`);
  }

  return (data || []).map(mapDatabaseRuleToAutomationRule);
}

/**
 * Get a single automation rule by ID
 */
export async function getAutomationRule(ruleId: string): Promise<AutomationRule | null> {
  const { data, error } = await supabase
    .from('automations.rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching automation rule:', error);
    throw new Error(`Failed to fetch automation rule: ${error.message}`);
  }

  return data ? mapDatabaseRuleToAutomationRule(data) : null;
}

/**
 * Create a new automation rule
 */
export async function createAutomationRule(organizationId: string, params: CreateRuleParams): Promise<AutomationRule> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('automations.rules')
    .insert({
      organization_id: organizationId,
      name: params.name,
      description: params.description || null,
      enabled: params.enabled ?? true,
      trigger_type: params.trigger_type,
      trigger_config: params.trigger_config,
      conditions: params.conditions || [],
      actions: params.actions,
      created_by: user?.id || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating automation rule:', error);
    throw new Error(`Failed to create automation rule: ${error.message}`);
  }

  // If it's a scheduled rule, create a scheduled job
  if (params.trigger_type === 'schedule' && params.trigger_config.cron) {
    await createScheduledJob(data.id, params.trigger_config.cron, params.trigger_config.timezone || 'UTC');
  }

  return mapDatabaseRuleToAutomationRule(data);
}

/**
 * Update an existing automation rule
 */
export async function updateAutomationRule(ruleId: string, params: UpdateRuleParams): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automations.rules')
    .update(params)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating automation rule:', error);
    throw new Error(`Failed to update automation rule: ${error.message}`);
  }

  // Update scheduled job if trigger changed
  if (params.trigger_type === 'schedule' && params.trigger_config?.cron) {
    await updateScheduledJob(ruleId, params.trigger_config.cron, params.trigger_config.timezone || 'UTC');
  }

  return mapDatabaseRuleToAutomationRule(data);
}

/**
 * Delete an automation rule
 */
export async function deleteAutomationRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('automations.rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting automation rule:', error);
    throw new Error(`Failed to delete automation rule: ${error.message}`);
  }
}

/**
 * Toggle an automation rule's enabled status
 */
export async function toggleAutomationRule(ruleId: string, enabled: boolean): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automations.rules')
    .update({ enabled })
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling automation rule:', error);
    throw new Error(`Failed to toggle automation rule: ${error.message}`);
  }

  // Update scheduled job status
  await toggleScheduledJob(ruleId, enabled);

  return mapDatabaseRuleToAutomationRule(data);
}

/**
 * Get execution history for a rule
 */
export async function getExecutionHistory(ruleId: string, limit: number = 50): Promise<AutomationExecution[]> {
  const { data, error } = await supabase
    .from('automations.executions')
    .select('*')
    .eq('rule_id', ruleId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching execution history:', error);
    throw new Error(`Failed to fetch execution history: ${error.message}`);
  }

  return data || [];
}

/**
 * Record an execution result
 */
export async function recordExecution(ruleId: string, result: ExecutionResult, context: any = {}): Promise<void> {
  const { error } = await supabase
    .from('automations.executions')
    .insert({
      rule_id: ruleId,
      trigger_type: context.trigger_type || 'manual',
      trigger_data: context.trigger_data || {},
      execution_context: context,
      status: result.success ? (result.actions_failed > 0 ? 'partial' : 'success') : 'failed',
      success: result.success,
      message: result.message,
      error: result.error || null,
      execution_time_ms: result.execution_time_ms,
      actions_executed: result.actions_executed,
      actions_failed: result.actions_failed,
      action_results: result.data || []
    });

  if (error) {
    console.error('Error recording execution:', error);
    // Don't throw here - we don't want to fail the automation if we can't record it
  }
}

/**
 * Create a scheduled job for a rule
 */
async function createScheduledJob(ruleId: string, cronExpression: string, timezone: string): Promise<void> {
  const nextRun = calculateNextRun(cronExpression);

  const { error } = await supabase
    .from('automations.scheduled_jobs')
    .insert({
      rule_id: ruleId,
      cron_expression: cronExpression,
      timezone,
      is_active: true,
      next_run_at: nextRun.toISOString()
    });

  if (error) {
    console.error('Error creating scheduled job:', error);
    // Don't throw - the rule was created successfully
  }
}

/**
 * Update a scheduled job
 */
async function updateScheduledJob(ruleId: string, cronExpression: string, timezone: string): Promise<void> {
  const nextRun = calculateNextRun(cronExpression);

  const { error } = await supabase
    .from('automations.scheduled_jobs')
    .update({
      cron_expression: cronExpression,
      timezone,
      next_run_at: nextRun.toISOString()
    })
    .eq('rule_id', ruleId);

  if (error) {
    console.error('Error updating scheduled job:', error);
  }
}

/**
 * Toggle a scheduled job's active status
 */
async function toggleScheduledJob(ruleId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('automations.scheduled_jobs')
    .update({ is_active: isActive })
    .eq('rule_id', ruleId);

  if (error) {
    console.error('Error toggling scheduled job:', error);
  }
}

/**
 * Get scheduled job for a rule
 */
export async function getScheduledJob(ruleId: string): Promise<ScheduledJob | null> {
  const { data, error } = await supabase
    .from('automations.scheduled_jobs')
    .select('*')
    .eq('rule_id', ruleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching scheduled job:', error);
    return null;
  }

  return data;
}

/**
 * Get automation statistics
 */
export async function getAutomationStats(organizationId: string) {
  const { data: rules, error } = await supabase
    .from('automations.rules')
    .select('enabled, execution_count, success_count, error_count, trigger_type')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching automation stats:', error);
    return {
      total_rules: 0,
      active_rules: 0,
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      success_rate: 0,
      scheduled_jobs: 0,
      event_rules: 0
    };
  }

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
    scheduled_jobs: rules.filter(r => r.trigger_type === 'schedule').length,
    event_rules: rules.filter(r => r.trigger_type === 'event').length
  };
}

/**
 * Simple function to calculate next run time
 * For production, use a proper cron library
 */
function calculateNextRun(cronExpression: string): Date {
  const now = new Date();
  const parts = cronExpression.split(' ');

  if (parts.length !== 5) {
    // Default to 1 hour from now if invalid
    return new Date(now.getTime() + 3600000);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const nextRun = new Date(now);

  // Handle simple daily patterns like "0 9 * * *" (9 AM daily)
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*') {
    const targetMinute = parseInt(minute);
    const targetHour = parseInt(hour);

    nextRun.setHours(targetHour, targetMinute, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }
  // Default: add 1 hour
  else {
    nextRun.setHours(nextRun.getHours() + 1);
  }

  return nextRun;
}
