import { AutomationRule, ruleEngine } from './ruleEngine';

export interface ScheduledJob {
  id: string;
  rule_id: string;
  next_run: Date;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run?: Date;
  last_result?: any;
}

export class AutomationScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // Start the scheduler
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Automation scheduler started');
    
    // Check for jobs to run every minute
    this.scheduleNextCheck();
  }

  // Stop the scheduler
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearTimeout(interval);
    });
    this.intervals.clear();
    
    console.log('Automation scheduler stopped');
  }

  // Add a scheduled job for a rule
  addJob(rule: AutomationRule): void {
    if (rule.trigger.type !== 'schedule' || !rule.trigger.config.cron) {
      return;
    }

    const job: ScheduledJob = {
      id: crypto.randomUUID(),
      rule_id: rule.id,
      next_run: this.calculateNextRun(rule.trigger.config.cron, rule.trigger.config.timezone),
      cron_expression: rule.trigger.config.cron,
      timezone: rule.trigger.config.timezone || 'UTC',
      is_active: rule.enabled
    };

    this.jobs.set(rule.id, job);
    console.log(`Scheduled job added for rule ${rule.name}:`, job);
  }

  // Remove a scheduled job
  removeJob(ruleId: string): void {
    this.jobs.delete(ruleId);
    
    const interval = this.intervals.get(ruleId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(ruleId);
    }
  }

  // Update a scheduled job
  updateJob(rule: AutomationRule): void {
    this.removeJob(rule.id);
    if (rule.trigger.type === 'schedule') {
      this.addJob(rule);
    }
  }

  // Get all scheduled jobs
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  // Get job by rule ID
  getJob(ruleId: string): ScheduledJob | undefined {
    return this.jobs.get(ruleId);
  }

  // Schedule the next check for due jobs
  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    // Check every minute
    const now = new Date();
    const nextMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);
    const msUntilNextMinute = nextMinute.getTime() - now.getTime();

    setTimeout(() => {
      this.checkDueJobs();
      this.scheduleNextCheck();
    }, msUntilNextMinute);
  }

  // Check for jobs that are due to run
  private async checkDueJobs(): Promise<void> {
    const now = new Date();
    
    for (const job of this.jobs.values()) {
      if (!job.is_active) continue;
      
      if (now >= job.next_run) {
        await this.executeJob(job);
      }
    }
  }

  // Execute a scheduled job
  private async executeJob(job: ScheduledJob): Promise<void> {
    try {
      console.log(`Executing scheduled job for rule ${job.rule_id}`);
      
      const result = await ruleEngine.executeRule(job.rule_id, {
        trigger_data: { 
          type: 'schedule',
          scheduled_time: job.next_run.toISOString(),
          cron_expression: job.cron_expression
        }
      });

      // Update job with execution result
      job.last_run = new Date();
      job.last_result = result;
      job.next_run = this.calculateNextRun(job.cron_expression, job.timezone);

      console.log(`Scheduled job completed for rule ${job.rule_id}:`, result);
    } catch (error) {
      console.error(`Error executing scheduled job for rule ${job.rule_id}:`, error);
      
      job.last_run = new Date();
      job.last_result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      job.next_run = this.calculateNextRun(job.cron_expression, job.timezone);
    }
  }

  // Calculate the next run time based on cron expression
  private calculateNextRun(cronExpression: string, timezone: string = 'UTC'): Date {
    // This is a simplified cron parser for demo purposes
    // In a real implementation, you would use a proper cron library like 'node-cron' or 'cron-parser'
    
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Simple parsing for common patterns
    const nextRun = new Date(now);
    
    // Handle simple hourly patterns like "0 * * * *" (every hour)
    if (minute !== '*' && hour === '*') {
      const targetMinute = parseInt(minute);
      nextRun.setMinutes(targetMinute, 0, 0);
      
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 1);
      }
    }
    // Handle simple daily patterns like "0 9 * * *" (9 AM daily)
    else if (minute !== '*' && hour !== '*' && dayOfMonth === '*') {
      const targetMinute = parseInt(minute);
      const targetHour = parseInt(hour);
      
      nextRun.setHours(targetHour, targetMinute, 0, 0);
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }
    // Handle weekly patterns like "0 9 * * 1" (9 AM on Mondays)
    else if (minute !== '*' && hour !== '*' && dayOfWeek !== '*') {
      const targetMinute = parseInt(minute);
      const targetHour = parseInt(hour);
      const targetDayOfWeek = parseInt(dayOfWeek); // 0 = Sunday
      
      nextRun.setHours(targetHour, targetMinute, 0, 0);
      
      const currentDayOfWeek = nextRun.getDay();
      let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;
      
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
    }
    // Default: add 1 hour for any unhandled patterns
    else {
      nextRun.setHours(nextRun.getHours() + 1);
    }

    return nextRun;
  }

  // Parse cron expression to human-readable format
  static parseCronToReadable(cronExpression: string): string {
    const parts = cronExpression.split(' ');
    
    if (parts.length !== 5) {
      return 'Invalid cron expression';
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Common patterns
    if (cronExpression === '* * * * *') {
      return 'Every minute';
    }
    
    if (minute === '0' && hour === '*') {
      return 'Every hour';
    }
    
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const h = parseInt(hour);
      const m = parseInt(minute);
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      return `Daily at ${time}`;
    }
    
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const h = parseInt(hour);
      const m = parseInt(minute);
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[parseInt(dayOfWeek)] || 'Unknown';
      return `Weekly on ${day} at ${time}`;
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '1') {
      return 'Monthly on the 1st at midnight';
    }
    
    return `Custom: ${cronExpression}`;
  }

  // Get next few scheduled runs for a job
  getUpcomingRuns(ruleId: string, count: number = 5): Date[] {
    const job = this.jobs.get(ruleId);
    if (!job) return [];

    const runs: Date[] = [];
    let nextRun = new Date(job.next_run);

    for (let i = 0; i < count; i++) {
      runs.push(new Date(nextRun));
      
      // Calculate the next run after this one
      try {
        nextRun = this.calculateNextRun(job.cron_expression, job.timezone);
        // Ensure we're moving forward in time
        if (nextRun <= runs[runs.length - 1]) {
          nextRun = new Date(runs[runs.length - 1].getTime() + 60000); // Add 1 minute
        }
      } catch (error) {
        break;
      }
    }

    return runs;
  }

  // Enable/disable a scheduled job
  toggleJob(ruleId: string, isActive: boolean): void {
    const job = this.jobs.get(ruleId);
    if (job) {
      job.is_active = isActive;
    }
  }
}

// Global scheduler instance
export const scheduler = new AutomationScheduler();