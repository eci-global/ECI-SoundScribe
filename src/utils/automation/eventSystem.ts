import { AutomationRule, ruleEngine } from './ruleEngine';

export interface EventTrigger {
  event: string;
  table?: string;
  operation?: 'insert' | 'update' | 'delete';
  conditions?: Record<string, any>;
}

export interface EventData {
  event: string;
  table?: string;
  operation?: string;
  data: any;
  previous_data?: any;
  timestamp: string;
  user_id?: string;
}

export class AutomationEventSystem {
  private eventRules: Map<string, AutomationRule[]> = new Map();
  private eventHistory: EventData[] = [];
  private maxHistorySize = 1000;

  // Register a rule for event-based triggers
  registerRule(rule: AutomationRule): void {
    if (rule.trigger.type !== 'event') return;

    const eventKey = this.getEventKey(rule.trigger.config);
    
    if (!this.eventRules.has(eventKey)) {
      this.eventRules.set(eventKey, []);
    }
    
    const rules = this.eventRules.get(eventKey)!;
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
    } else {
      rules.push(rule);
    }
  }

  // Unregister a rule
  unregisterRule(ruleId: string): void {
    for (const [eventKey, rules] of this.eventRules.entries()) {
      const index = rules.findIndex(r => r.id === ruleId);
      if (index >= 0) {
        rules.splice(index, 1);
        if (rules.length === 0) {
          this.eventRules.delete(eventKey);
        }
      }
    }
  }

  // Emit an event and trigger relevant rules
  async emitEvent(eventData: EventData): Promise<void> {
    console.log('Event emitted:', eventData);
    
    // Store event in history
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Find matching rules
    const matchingRules = this.findMatchingRules(eventData);
    
    // Execute matching rules
    for (const rule of matchingRules) {
      if (!rule.enabled) continue;
      
      try {
        await ruleEngine.executeRule(rule.id, {
          trigger_data: eventData,
          user_id: eventData.user_id
        });
      } catch (error) {
        console.error(`Error executing rule ${rule.id} for event ${eventData.event}:`, error);
      }
    }
  }

  // Find rules that match the event
  private findMatchingRules(eventData: EventData): AutomationRule[] {
    const matchingRules: AutomationRule[] = [];
    
    // Check for exact event matches
    const exactEventKey = this.getEventKey({ event: eventData.event });
    const exactRules = this.eventRules.get(exactEventKey) || [];
    matchingRules.push(...exactRules);
    
    // Check for table-specific matches
    if (eventData.table && eventData.operation) {
      const tableEventKey = this.getEventKey({ 
        event: eventData.event, 
        table: eventData.table, 
        operation: eventData.operation 
      });
      const tableRules = this.eventRules.get(tableEventKey) || [];
      matchingRules.push(...tableRules);
    }
    
    // Check for operation-specific matches
    if (eventData.operation) {
      const operationEventKey = this.getEventKey({ 
        event: eventData.event, 
        operation: eventData.operation 
      });
      const operationRules = this.eventRules.get(operationEventKey) || [];
      matchingRules.push(...operationRules);
    }
    
    // Remove duplicates
    const uniqueRules = matchingRules.filter((rule, index, self) => 
      self.findIndex(r => r.id === rule.id) === index
    );
    
    return uniqueRules;
  }

  // Generate event key for rule mapping
  private getEventKey(config: any): string {
    const parts = [config.event];
    
    if (config.table) {
      parts.push(`table:${config.table}`);
    }
    
    if (config.operation) {
      parts.push(`op:${config.operation}`);
    }
    
    return parts.join('|');
  }

  // Get event history
  getEventHistory(limit?: number): EventData[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  // Get events for a specific table
  getTableEvents(table: string, limit?: number): EventData[] {
    const tableEvents = this.eventHistory.filter(event => event.table === table);
    if (limit) {
      return tableEvents.slice(-limit);
    }
    return tableEvents;
  }

  // Get events by type
  getEventsByType(eventType: string, limit?: number): EventData[] {
    const typeEvents = this.eventHistory.filter(event => event.event === eventType);
    if (limit) {
      return typeEvents.slice(-limit);
    }
    return typeEvents;
  }

  // Clear event history
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Get registered rules for an event
  getRulesForEvent(eventKey: string): AutomationRule[] {
    return this.eventRules.get(eventKey) || [];
  }

  // Get all registered event keys
  getRegisteredEvents(): string[] {
    return Array.from(this.eventRules.keys());
  }
}

// Pre-defined event types
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Recording events
  RECORDING_CREATED: 'recording.created',
  RECORDING_UPDATED: 'recording.updated',
  RECORDING_DELETED: 'recording.deleted',
  RECORDING_PROCESSED: 'recording.processed',
  RECORDING_FAILED: 'recording.failed',
  
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_DELETED: 'task.deleted',
  
  // Chat events
  CHAT_STARTED: 'chat.started',
  CHAT_MESSAGE: 'chat.message',
  CHAT_ENDED: 'chat.ended',
  
  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_BACKUP: 'system.backup',
  
  // Performance events
  PERFORMANCE_ALERT: 'performance.alert',
  STORAGE_FULL: 'storage.full',
  MEMORY_HIGH: 'memory.high',
  
  // Security events
  SECURITY_BREACH: 'security.breach',
  FAILED_LOGIN: 'security.failed_login',
  PERMISSION_DENIED: 'security.permission_denied'
};

// Utility functions for emitting common events
export class EventEmitters {
  constructor(private eventSystem: AutomationEventSystem) {}

  // Emit user-related events
  async emitUserCreated(user: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.USER_CREATED,
      table: 'profiles',
      operation: 'insert',
      data: user,
      timestamp: new Date().toISOString(),
      user_id: user.id
    });
  }

  async emitUserUpdated(user: any, previousUser: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.USER_UPDATED,
      table: 'profiles',
      operation: 'update',
      data: user,
      previous_data: previousUser,
      timestamp: new Date().toISOString(),
      user_id: user.id
    });
  }

  // Emit recording-related events
  async emitRecordingCreated(recording: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.RECORDING_CREATED,
      table: 'recordings',
      operation: 'insert',
      data: recording,
      timestamp: new Date().toISOString(),
      user_id: recording.user_id
    });
  }

  async emitRecordingProcessed(recording: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.RECORDING_PROCESSED,
      table: 'recordings',
      operation: 'update',
      data: recording,
      timestamp: new Date().toISOString(),
      user_id: recording.user_id
    });
  }

  async emitRecordingFailed(recording: any, error: string): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.RECORDING_FAILED,
      table: 'recordings',
      operation: 'update',
      data: { ...recording, error },
      timestamp: new Date().toISOString(),
      user_id: recording.user_id
    });
  }

  // Emit task-related events
  async emitTaskCreated(task: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.TASK_CREATED,
      table: 'tasks',
      operation: 'insert',
      data: task,
      timestamp: new Date().toISOString(),
      user_id: task.user_id
    });
  }

  async emitTaskCompleted(task: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.TASK_COMPLETED,
      table: 'tasks',
      operation: 'update',
      data: task,
      timestamp: new Date().toISOString(),
      user_id: task.user_id
    });
  }

  // Emit chat-related events
  async emitChatStarted(session: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.CHAT_STARTED,
      table: 'chat_sessions',
      operation: 'insert',
      data: session,
      timestamp: new Date().toISOString(),
      user_id: session.user_id
    });
  }

  async emitChatMessage(message: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.CHAT_MESSAGE,
      table: 'chat_messages',
      operation: 'insert',
      data: message,
      timestamp: new Date().toISOString(),
      user_id: message.user_id
    });
  }

  // Emit system events
  async emitSystemError(error: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.SYSTEM_ERROR,
      data: { error: error.message || error, stack: error.stack },
      timestamp: new Date().toISOString()
    });
  }

  async emitPerformanceAlert(metrics: any): Promise<void> {
    await this.eventSystem.emitEvent({
      event: EventTypes.PERFORMANCE_ALERT,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  }
}

// Global event system instance
export const eventSystem = new AutomationEventSystem();
export const eventEmitters = new EventEmitters(eventSystem);