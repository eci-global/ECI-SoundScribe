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
  AlertCircle
} from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'webhook';
    config: any;
  };
  actions: string[];
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  runs: number;
  successRate: number;
}

export default function AutomationBuilder() {
  const [automations, setAutomations] = useState<Automation[]>([
    {
      id: '1',
      name: 'Daily Summary Reports',
      description: 'Generate and email daily summary reports to managers',
      trigger: {
        type: 'schedule',
        config: { cron: '0 9 * * *', timezone: 'America/New_York' }
      },
      actions: ['generate_summary', 'send_email'],
      status: 'active',
      lastRun: '2025-01-20T09:00:00Z',
      nextRun: '2025-01-21T09:00:00Z',
      runs: 156,
      successRate: 98.5
    },
    {
      id: '2',
      name: 'New Recording Processing',
      description: 'Automatically process new recordings when uploaded',
      trigger: {
        type: 'event',
        config: { event: 'recording.created' }
      },
      actions: ['transcribe', 'analyze_sentiment', 'generate_summary', 'notify_user'],
      status: 'active',
      lastRun: '2025-01-20T11:45:00Z',
      runs: 1243,
      successRate: 95.2
    },
    {
      id: '3',
      name: 'Weekly Backup',
      description: 'Backup database and files to cloud storage',
      trigger: {
        type: 'schedule',
        config: { cron: '0 2 * * 0', timezone: 'UTC' }
      },
      actions: ['backup_database', 'backup_files', 'verify_backup', 'send_notification'],
      status: 'active',
      lastRun: '2025-01-14T02:00:00Z',
      nextRun: '2025-01-21T02:00:00Z',
      runs: 52,
      successRate: 100
    },
    {
      id: '4',
      name: 'Coaching Score Alert',
      description: 'Alert managers when coaching scores drop below threshold',
      trigger: {
        type: 'event',
        config: { event: 'score.below_threshold', threshold: 60 }
      },
      actions: ['check_score', 'send_alert', 'create_task'],
      status: 'error',
      lastRun: '2025-01-19T14:30:00Z',
      runs: 89,
      successRate: 78.4
    }
  ]);

  const getStatusIcon = (status: string) => {
    const icons = {
      active: { icon: CheckCircle, color: 'text-green-600' },
      paused: { icon: PauseCircle, color: 'text-orange-600' },
      error: { icon: XCircle, color: 'text-red-600' }
    };
    const config = icons[status as keyof typeof icons];
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800',
      error: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getTriggerIcon = (type: string) => {
    const icons = {
      schedule: Clock,
      event: Zap,
      webhook: GitBranch
    };
    const Icon = icons[type as keyof typeof icons] || Zap;
    return <Icon className="h-4 w-4" />;
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id 
        ? { ...auto, status: auto.status === 'active' ? 'paused' : 'active' }
        : auto
    ));
  };

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Automation Builder</h1>
            <p className="text-body text-eci-gray-600">Create and manage automated workflows</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Automations</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {automations.filter(a => a.status === 'active').length}
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
                    {automations.reduce((sum, a) => sum + a.runs, 0).toLocaleString()}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Avg Success Rate</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {(automations.reduce((sum, a) => sum + a.successRate, 0) / automations.length).toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Errors</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {automations.filter(a => a.status === 'error').length}
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
                <h2 className="text-title font-semibold text-eci-gray-900">Automations</h2>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Automation
                </Button>
              </div>

              <div className="space-y-4">
                {automations.map((automation) => (
                  <div key={automation.id} className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 flex-1">
                        <div>{getStatusIcon(automation.status)}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-body font-semibold text-eci-gray-900">{automation.name}</h3>
                            {getStatusBadge(automation.status)}
                            <div className="flex items-center gap-1 text-caption text-eci-gray-600">
                              {getTriggerIcon(automation.trigger.type)}
                              <span>{automation.trigger.type}</span>
                            </div>
                          </div>
                          
                          <p className="text-body-small text-eci-gray-600 mb-3">{automation.description}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-caption text-eci-gray-600">Actions:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {automation.actions.map((action, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {action}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-caption text-eci-gray-500">
                              {automation.lastRun && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last run: {new Date(automation.lastRun).toLocaleString()}
                                </div>
                              )}
                              {automation.nextRun && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Next run: {new Date(automation.nextRun).toLocaleString()}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {automation.runs} runs
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {automation.successRate}% success
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAutomation(automation.id)}
                          disabled={automation.status === 'error'}
                        >
                          {automation.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    
  );
}