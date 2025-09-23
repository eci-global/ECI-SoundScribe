export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  created_at: string;
  updated_at: string;
  last_executed?: string;
  execution_count: number;
  success_count: number;
  error_count: number;
}

export interface AutomationTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  config: {
    // Schedule config
    cron?: string;
    timezone?: string;
    
    // Event config
    event?: string;
    table?: string;
    operation?: 'insert' | 'update' | 'delete';
    
    // Webhook config
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    
    // Manual config (no additional config needed)
  };
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface AutomationAction {
  id: string;
  type: 'send_email' | 'create_task' | 'update_record' | 'send_notification' | 'call_webhook' | 'run_query' | 'export_data';
  config: {
    // Email action
    to?: string | string[];
    subject?: string;
    body?: string;
    template?: string;
    
    // Task action
    title?: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    
    // Update record action
    table?: string;
    record_id?: string;
    updates?: Record<string, any>;
    
    // Notification action
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    channels?: string[];
    
    // Webhook action
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    payload?: Record<string, any>;
    
    // Query action
    sql?: string;
    parameters?: Record<string, any>;
    
    // Export action
    export_type?: 'csv' | 'json' | 'pdf';
    filters?: Record<string, any>;
    filename?: string;
  };
}

export interface ExecutionContext {
  trigger_data?: any;
  user_id?: string;
  timestamp: string;
  rule_id: string;
  execution_id: string;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  execution_time_ms: number;
  actions_executed: number;
  actions_failed: number;
}

export class AutomationRuleEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private executionHistory: Map<string, ExecutionResult[]> = new Map();

  // Add a rule to the engine
  addRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
  }

  // Remove a rule from the engine
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.executionHistory.delete(ruleId);
  }

  // Update a rule
  updateRule(rule: AutomationRule): void {
    if (this.rules.has(rule.id)) {
      this.rules.set(rule.id, { ...rule, updated_at: new Date().toISOString() });
    }
  }

  // Get all rules
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  // Get rule by ID
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  // Enable/disable a rule
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updated_at = new Date().toISOString();
    }
  }

  // Execute a rule manually
  async executeRule(ruleId: string, context?: Partial<ExecutionContext>): Promise<ExecutionResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return {
        success: false,
        message: 'Rule not found',
        error: `Rule with ID ${ruleId} not found`,
        execution_time_ms: 0,
        actions_executed: 0,
        actions_failed: 0
      };
    }

    if (!rule.enabled) {
      return {
        success: false,
        message: 'Rule is disabled',
        error: 'Cannot execute disabled rule',
        execution_time_ms: 0,
        actions_executed: 0,
        actions_failed: 0
      };
    }

    const executionId = crypto.randomUUID();
    const executionContext: ExecutionContext = {
      trigger_data: context?.trigger_data,
      user_id: context?.user_id,
      timestamp: new Date().toISOString(),
      rule_id: ruleId,
      execution_id: executionId
    };

    const startTime = Date.now();
    let actionsExecuted = 0;
    let actionsFailed = 0;
    const actionResults: any[] = [];

    try {
      // Check conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, executionContext);
      
      if (!conditionsMet) {
        return {
          success: true,
          message: 'Rule conditions not met, skipping execution',
          execution_time_ms: Date.now() - startTime,
          actions_executed: 0,
          actions_failed: 0
        };
      }

      // Execute actions
      for (const action of rule.actions) {
        try {
          const actionResult = await this.executeAction(action, executionContext);
          actionResults.push(actionResult);
          actionsExecuted++;
        } catch (error) {
          actionsFailed++;
          actionResults.push({ 
            action_id: action.id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Update rule statistics
      rule.execution_count++;
      rule.last_executed = executionContext.timestamp;
      if (actionsFailed === 0) {
        rule.success_count++;
      } else {
        rule.error_count++;
      }

      const result: ExecutionResult = {
        success: actionsFailed === 0,
        message: actionsFailed === 0 ? 'Rule executed successfully' : `Rule executed with ${actionsFailed} action failures`,
        data: actionResults,
        execution_time_ms: Date.now() - startTime,
        actions_executed: actionsExecuted,
        actions_failed: actionsFailed
      };

      // Store execution history
      if (!this.executionHistory.has(ruleId)) {
        this.executionHistory.set(ruleId, []);
      }
      const history = this.executionHistory.get(ruleId)!;
      history.push(result);
      // Keep only last 100 executions
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      return result;
    } catch (error) {
      rule.error_count++;
      return {
        success: false,
        message: 'Rule execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime,
        actions_executed: actionsExecuted,
        actions_failed: actionsFailed
      };
    }
  }

  // Evaluate conditions
  private async evaluateConditions(conditions: AutomationCondition[], context: ExecutionContext): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    const currentLogicalOperator: 'AND' | 'OR' | null = null;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = await this.evaluateCondition(condition, context);

      if (i === 0) {
        result = conditionResult;
      } else {
        const operator = conditions[i - 1].logical_operator || 'AND';
        if (operator === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }

    return result;
  }

  // Evaluate a single condition
  private async evaluateCondition(condition: AutomationCondition, context: ExecutionContext): Promise<boolean> {
    // Get the value to compare (from trigger data or context)
    const actualValue = this.getValueFromContext(condition.field, context);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      case 'is_empty':
        return !actualValue || actualValue === '' || actualValue === null || actualValue === undefined;
      case 'is_not_empty':
        return actualValue && actualValue !== '' && actualValue !== null && actualValue !== undefined;
      default:
        return false;
    }
  }

  // Get value from execution context
  private getValueFromContext(field: string, context: ExecutionContext): any {
    const fieldParts = field.split('.');
    let value: any = context.trigger_data;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Execute an action
  private async executeAction(action: AutomationAction, context: ExecutionContext): Promise<any> {
    switch (action.type) {
      case 'send_email':
        return await this.sendEmail(action, context);
      case 'create_task':
        return await this.createTask(action, context);
      case 'update_record':
        return await this.updateRecord(action, context);
      case 'send_notification':
        return await this.sendNotification(action, context);
      case 'call_webhook':
        return await this.callWebhook(action, context);
      case 'run_query':
        return await this.runQuery(action, context);
      case 'export_data':
        return await this.exportData(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Action implementations (simplified for demo)
  private async sendEmail(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would integrate with an email service
    console.log('Sending email:', {
      to: action.config.to,
      subject: action.config.subject,
      body: action.config.body
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Email sent successfully',
      data: { recipients: action.config.to }
    };
  }

  private async createTask(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would create a task in the database
    console.log('Creating task:', {
      title: action.config.title,
      description: action.config.description,
      priority: action.config.priority
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Task created successfully',
      data: { task_id: crypto.randomUUID() }
    };
  }

  private async updateRecord(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would update a database record
    console.log('Updating record:', {
      table: action.config.table,
      record_id: action.config.record_id,
      updates: action.config.updates
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Record updated successfully',
      data: { updated_fields: Object.keys(action.config.updates || {}) }
    };
  }

  private async sendNotification(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would send a notification
    console.log('Sending notification:', {
      message: action.config.message,
      type: action.config.type,
      channels: action.config.channels
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Notification sent successfully',
      data: { channels: action.config.channels }
    };
  }

  private async callWebhook(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would make an HTTP request
    console.log('Calling webhook:', {
      url: action.config.url,
      method: action.config.method,
      payload: action.config.payload
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Webhook called successfully',
      data: { url: action.config.url, method: action.config.method }
    };
  }

  private async runQuery(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would execute a database query
    console.log('Running query:', {
      sql: action.config.sql,
      parameters: action.config.parameters
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Query executed successfully',
      data: { affected_rows: Math.floor(Math.random() * 10) }
    };
  }

  private async exportData(action: AutomationAction, context: ExecutionContext): Promise<any> {
    // In a real implementation, this would export data
    console.log('Exporting data:', {
      export_type: action.config.export_type,
      filters: action.config.filters,
      filename: action.config.filename
    });
    
    return {
      action_id: action.id,
      success: true,
      message: 'Data exported successfully',
      data: { filename: action.config.filename, records: Math.floor(Math.random() * 1000) }
    };
  }

  // Get execution history for a rule
  getExecutionHistory(ruleId: string): ExecutionResult[] {
    return this.executionHistory.get(ruleId) || [];
  }

  // Get execution statistics
  getExecutionStats(ruleId: string): { total: number; success: number; error: number; success_rate: number } {
    const history = this.getExecutionHistory(ruleId);
    const total = history.length;
    const success = history.filter(r => r.success).length;
    const error = total - success;
    const success_rate = total > 0 ? (success / total) * 100 : 0;

    return { total, success, error, success_rate };
  }
}

// Global rule engine instance
export const ruleEngine = new AutomationRuleEngine();