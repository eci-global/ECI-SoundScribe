import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Target, Users, Calendar, Clock, Plus, Edit2, Trash2 } from 'lucide-react';

interface TargetRule {
  id: string;
  name: string;
  description: string;
  criteria: {
    type: 'user_group' | 'time_based' | 'performance' | 'custom';
    conditions: string[];
  };
  targets: string[];
  enabled: boolean;
  priority: number;
  created: string;
  matches: number;
}

export default function TargetRules() {
  const [rules, setRules] = useState<TargetRule[]>([
    {
      id: '1',
      name: 'New Sales Reps Coaching',
      description: 'Intensive coaching for sales reps in their first 90 days',
      criteria: {
        type: 'user_group',
        conditions: ['user.group = "Sales Team"', 'user.start_date > 90_days_ago']
      },
      targets: ['enhanced_coaching', 'daily_summaries'],
      enabled: true,
      priority: 1,
      created: '2025-01-10T10:00:00Z',
      matches: 23
    },
    {
      id: '2',
      name: 'Weekend Call Routing',
      description: 'Route weekend calls to on-call support team',
      criteria: {
        type: 'time_based',
        conditions: ['day_of_week IN (6, 7)', 'time BETWEEN 09:00 AND 17:00']
      },
      targets: ['support_queue', 'priority_processing'],
      enabled: true,
      priority: 2,
      created: '2025-01-12T14:30:00Z',
      matches: 45
    },
    {
      id: '3',
      name: 'High-Value Customer Calls',
      description: 'Prioritize processing for enterprise customer calls',
      criteria: {
        type: 'custom',
        conditions: ['customer.tier = "enterprise"', 'call.duration > 600']
      },
      targets: ['immediate_processing', 'executive_summary'],
      enabled: true,
      priority: 3,
      created: '2025-01-15T09:00:00Z',
      matches: 78
    },
    {
      id: '4',
      name: 'Low Performance Alert',
      description: 'Flag calls with poor quality scores for review',
      criteria: {
        type: 'performance',
        conditions: ['call.quality_score < 60', 'sentiment.score < 0.3']
      },
      targets: ['manager_review', 'coaching_required'],
      enabled: false,
      priority: 4,
      created: '2025-01-08T11:00:00Z',
      matches: 12
    }
  ]);

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getCriteriaIcon = (type: string) => {
    const icons = {
      user_group: Users,
      time_based: Clock,
      performance: Target,
      custom: Target
    };
    const Icon = icons[type as keyof typeof icons] || Target;
    return <Icon className="h-4 w-4" />;
  };

  const getCriteriaColor = (type: string) => {
    const colors = {
      user_group: 'text-blue-600 bg-blue-50',
      time_based: 'text-purple-600 bg-purple-50',
      performance: 'text-orange-600 bg-orange-50',
      custom: 'text-green-600 bg-green-50'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Target Rules</h1>
            <p className="text-body text-eci-gray-600">Configure automated targeting and routing rules</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Rules</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {rules.filter(r => r.enabled).length}
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Total Rules</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">{rules.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Total Matches</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {rules.reduce((sum, rule) => sum + rule.matches, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Avg Matches/Rule</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {Math.round(rules.reduce((sum, rule) => sum + rule.matches, 0) / rules.length)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Rules List */}
          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title font-semibold text-eci-gray-900">Targeting Rules</h2>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Rule
                </Button>
              </div>

              <div className="space-y-4">
                {rules.sort((a, b) => a.priority - b.priority).map((rule) => (
                  <div key={rule.id} className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-caption text-eci-gray-600">Priority</span>
                            <Badge variant="outline">{rule.priority}</Badge>
                          </div>
                          <h3 className="text-body font-semibold text-eci-gray-900">{rule.name}</h3>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getCriteriaColor(rule.criteria.type)}`}>
                            {getCriteriaIcon(rule.criteria.type)}
                            {rule.criteria.type.replace('_', ' ')}
                          </div>
                        </div>
                        
                        <p className="text-body-small text-eci-gray-600 mb-3">{rule.description}</p>
                        
                        <div className="space-y-2 mb-3">
                          <div>
                            <span className="text-caption text-eci-gray-600">Conditions:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.criteria.conditions.map((condition, idx) => (
                                <code key={idx} className="text-caption bg-eci-gray-100 px-2 py-1 rounded">
                                  {condition}
                                </code>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-caption text-eci-gray-600">Targets:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.targets.map((target, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {target}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-caption text-eci-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {new Date(rule.created).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {rule.matches} matches
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}