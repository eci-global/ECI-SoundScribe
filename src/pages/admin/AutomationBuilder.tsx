import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Clock,
  PlayCircle,
  PauseCircle,
  Calendar,
  Share2 as GitBranch,
  Settings,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Play,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAutomation } from '@/hooks/useAutomation';
import { useAuth } from '@/hooks/useAuth';
import { AutomationRule } from '@/utils/automation/ruleEngine';

export default function AutomationBuilder() {
  const { session } = useAuth();
  const organizationId = session?.user?.user_metadata?.organization_id;
  const { rules, isLoading, error, getStats, toggleRule, deleteRule, executeRule } = useAutomation(organizationId);
  const [executingRules, setExecutingRules] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const stats = getStats();

  const getStatusIcon = (status: string) => {
    const icons = {
      active: { icon: CheckCircle, color: 'text-green-600' },
      paused: { icon: PauseCircle, color: 'text-orange-600' },
      error: { icon: XCircle, color: 'text-red-600' }
    };
    const config = icons[status as keyof typeof icons] || icons.active;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const getStatusBadge = (rule: AutomationRule) => {
    const status = rule.enabled ? 'active' : 'paused';
    const hasErrors = rule.error_count > 0 && rule.error_count / rule.execution_count > 0.2;

    if (hasErrors) {
      return <Badge className="bg-red-100 text-red-800">errors</Badge>;
    }

    const variants = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const getTriggerIcon = (type: string) => {
    const icons = {
      schedule: Clock,
      event: Zap,
      webhook: GitBranch,
      manual: Play
    };
    const Icon = icons[type as keyof typeof icons] || Zap;
    return <Icon className="h-4 w-4" />;
  };

  const getTriggerLabel = (rule: AutomationRule) => {
    if (rule.trigger.type === 'schedule' && rule.trigger.config.cron) {
      return formatCronExpression(rule.trigger.config.cron);
    }
    if (rule.trigger.type === 'event' && rule.trigger.config.event) {
      return rule.trigger.config.event;
    }
    return rule.trigger.type;
  };

  const formatCronExpression = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (cron === '* * * * *') return 'Every minute';
    if (minute === '0' && hour === '*') return 'Every hour';
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const h = parseInt(hour);
      const m = parseInt(minute);
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      return `Daily at ${time}`;
    }
    if (minute !== '*' && hour !== '*' && dayOfWeek !== '*') {
      const h = parseInt(hour);
      const m = parseInt(minute);
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[parseInt(dayOfWeek)] || 'Unknown';
      return `Weekly on ${day} at ${time}`;
    }

    return cron;
  };

  const handleToggleAutomation = async (ruleId: string) => {
    try {
      await toggleRule(ruleId);
    } catch (err) {
      console.error('Failed to toggle automation:', err);
    }
  };

  const handleDeleteAutomation = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteRule(ruleId);
    } catch (err) {
      console.error('Failed to delete automation:', err);
    }
  };

  const handleExecuteNow = async (ruleId: string) => {
    setExecutingRules(prev => new Set(prev).add(ruleId));

    try {
      const result = await executeRule(ruleId);

      if (result.success) {
        alert(`Automation executed successfully!\n\nActions executed: ${result.actions_executed}\nExecution time: ${result.execution_time_ms.toFixed(0)}ms`);
      } else {
        alert(`Automation execution failed:\n${result.message || result.error}`);
      }
    } catch (err) {
      console.error('Failed to execute automation:', err);
      alert('Failed to execute automation. Please try again.');
    } finally {
      setExecutingRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  if (isLoading && rules.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-eci-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-display text-eci-gray-900 mb-2">Automation Builder</h1>
          <p className="text-body text-eci-gray-600">Create and manage automated workflows</p>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-body-small">{error}</p>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Active Automations</p>
                <p className="text-title-large font-semibold text-eci-gray-900">
                  {stats.active_rules}
                </p>
              </div>
              <PlayCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Total Runs</p>
                <p className="text-title-large font-semibold text-eci-gray-900">
                  {stats.total_executions.toLocaleString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Success Rate</p>
                <p className="text-title-large font-semibold text-eci-gray-900">
                  {stats.success_rate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-600 mb-1">Failed Runs</p>
                <p className="text-title-large font-semibold text-eci-gray-900">
                  {stats.failed_executions}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Automations List */}
        <Card className="bg-white shadow-sm">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-title font-semibold text-eci-gray-900">
                Automations ({rules.length})
              </h2>
              <Button
                className="flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Create Automation
              </Button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 text-eci-gray-400 mx-auto mb-4" />
                <h3 className="text-title text-eci-gray-900 mb-2">No automations yet</h3>
                <p className="text-body text-eci-gray-600 mb-4">
                  Create your first automation to streamline your workflows
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 flex-1">
                        <div>{getStatusIcon(rule.enabled ? 'active' : 'paused')}</div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-body font-semibold text-eci-gray-900">{rule.name}</h3>
                            {getStatusBadge(rule)}
                            <div className="flex items-center gap-1 text-caption text-eci-gray-600">
                              {getTriggerIcon(rule.trigger.type)}
                              <span>{getTriggerLabel(rule)}</span>
                            </div>
                          </div>

                          {rule.description && (
                            <p className="text-body-small text-eci-gray-600 mb-3">{rule.description}</p>
                          )}

                          <div className="space-y-2">
                            {rule.actions && rule.actions.length > 0 && (
                              <div>
                                <span className="text-caption text-eci-gray-600">Actions:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rule.actions.map((action, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {typeof action === 'string' ? action : action.type || 'Unknown'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-6 text-caption text-eci-gray-500">
                              {rule.last_executed && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last run: {new Date(rule.last_executed).toLocaleString()}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {rule.execution_count} runs
                              </div>
                              {rule.execution_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {((rule.success_count / rule.execution_count) * 100).toFixed(1)}% success
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => handleExecuteNow(rule.id)}
                          disabled={!rule.enabled || executingRules.has(rule.id)}
                          title="Execute now"
                        >
                          {executingRules.has(rule.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAutomation(rule.id)}
                          disabled={isLoading}
                          className="h-8 px-3"
                        >
                          {rule.enabled ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteAutomation(rule.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Create Modal Placeholder */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="bg-white p-6 max-w-2xl w-full mx-4">
              <h2 className="text-title font-semibold text-eci-gray-900 mb-4">Create Automation</h2>
              <p className="text-body text-eci-gray-600 mb-6">
                Automation creation form coming soon. This will allow you to create scheduled tasks,
                event-driven workflows, and webhook-based automations.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Close
                </Button>
                <Button disabled>
                  Create
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
