/**
 * AI Experiments
 *
 * Interface for managing A/B tests and experiments on AI prompts
 * and configurations to optimize performance and accuracy.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  TestTube,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  Settings,
  Zap,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIExperiment {
  id?: string;
  name: string;
  description: string;
  experiment_type: 'prompt_optimization' | 'model_comparison' | 'parameter_tuning' | 'response_format' | 'custom';
  status?: 'draft' | 'running' | 'completed' | 'paused' | 'archived' | 'promoting';
  config_a: any;
  config_b: any;
  traffic_split?: number;
  start_date?: string;
  end_date?: string;
  sample_size?: number;
  current_participants?: number;
  success_metric?: string;
  statistical_significance?: number;
  confidence_level?: number;
  results?: any;
  winner?: 'A' | 'B' | 'inconclusive';
  auto_promote?: boolean;
  hypothesis?: string;
  notes?: string;
  tags?: Array<string | { label: string; description?: string }>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface ExperimentStats {
  total: number;
  running: number;
  completed: number;
  total_participants: number;
  avg_significance: number;
  successful_experiments: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

interface PerformanceData {
  experiment_id: string;
  total_participants: number;
  variant_a_count: number;
  variant_b_count: number;
  daily_participants: Array<{
    date: string;
    variant_a: number;
    variant_b: number;
  }>;
}

export default function AIExperiments() {
  const [experiments, setExperiments] = useState<AIExperiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<AIExperiment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AIExperiment>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [configAJson, setConfigAJson] = useState('');
  const [configBJson, setConfigBJson] = useState('');

  useEffect(() => {
    loadExperiments();
    loadStats();
  }, []);

  const loadExperiments = async () => {
    setIsLoading(true);
    try {
      // Get current session to ensure we have valid auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to access AI Control Center');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };

      const { data, error } = await supabase.functions.invoke('ai-experiments', {
        method: 'GET',
        headers: authHeaders
      });

      if (error) {
        console.error('Error loading experiments:', error);
        // Handle specific authentication errors
        if (error.message?.includes('JWT expired') || error.message?.includes('Invalid JWT')) {
          toast.error('Session expired. Please refresh the page and log in again.');
        } else if (error.message?.includes('Admin access required')) {
          toast.error('Admin access required for AI Control Center');
        } else {
          toast.error('Failed to load AI experiments');
        }
        return;
      }

      setExperiments(data.experiments || []);
    } catch (error) {
      console.error('Error loading experiments:', error);
      toast.error('Failed to load AI experiments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get current session to ensure we have valid auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session available for loading stats');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };

      const { data, error } = await supabase.functions.invoke('ai-experiments/stats', {
        method: 'GET',
        headers: authHeaders
      });

      if (error) {
        console.error('Error loading stats:', error);
        // Handle specific authentication errors
        if (error.message?.includes('JWT expired') || error.message?.includes('Invalid JWT')) {
          toast.error('Session expired. Please refresh the page and log in again.');
        } else if (error.message?.includes('Admin access required')) {
          console.warn('Admin access required for stats');
        }
        return;
      }

      setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPerformanceData = async (experimentId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.warn('No session available for loading performance data');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };
      const { data, error } = await supabase.functions.invoke(`ai-experiments/performance-data?experiment_id=${experimentId}`, {
        method: 'GET',
        headers: authHeaders
      });

      if (error) {
        console.error('Error loading performance data:', error);
        return;
      }

      setPerformanceData(data.performance_data);
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedExperiment(null);
    setEditForm({
      name: '',
      description: '',
      experiment_type: 'prompt_optimization',
      config_a: {},
      config_b: {},
      traffic_split: 50,
      sample_size: 1000,
      success_metric: 'accuracy',
      confidence_level: 0.95,
      auto_promote: false,
      hypothesis: '',
      notes: '',
      tags: []
    });
    setConfigAJson('{\n  "prompt": "Version A of the prompt",\n  "temperature": 0.7,\n  "max_tokens": 150\n}');
    setConfigBJson('{\n  "prompt": "Version B of the prompt",\n  "temperature": 0.7,\n  "max_tokens": 150\n}');
  };

  const handleEdit = (experiment: AIExperiment) => {
    setIsCreating(false);
    setIsEditing(true);
    setSelectedExperiment(experiment);
    setEditForm({ ...experiment });
    setConfigAJson(JSON.stringify(experiment.config_a || {}, null, 2));
    setConfigBJson(JSON.stringify(experiment.config_b || {}, null, 2));
  };

  const handleView = (experiment: AIExperiment) => {
    setSelectedExperiment(experiment);
    if (experiment.id) {
      loadPerformanceData(experiment.id);
    }
  };

  const handleSave = async () => {
    try {
      if (!editForm.name || !editForm.description || !editForm.experiment_type) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Parse JSON configurations
      let parsedConfigA, parsedConfigB;
      try {
        parsedConfigA = JSON.parse(configAJson);
        parsedConfigB = JSON.parse(configBJson);
      } catch (error) {
        toast.error('Invalid JSON in configuration A or B');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error('Please log in to access AI Control Center');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };

      const method = isCreating ? 'POST' : 'PUT';
      const { data, error } = await supabase.functions.invoke('ai-experiments', {
        method,
        headers: authHeaders,
        body: {
          ...editForm,
          config_a: parsedConfigA,
          config_b: parsedConfigB
        }
      });

      if (error) {
        console.error('Error saving experiment:', error);
        toast.error('Failed to save AI experiment');
        return;
      }

      if (isCreating) {
        toast.success('AI experiment created successfully');
      } else {
        toast.success('AI experiment updated successfully');
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedExperiment(null);
      loadExperiments();
      loadStats();
    } catch (error) {
      console.error('Error saving experiment:', error);
      toast.error('Failed to save AI experiment');
    }
  };

  const handleStart = async (experiment: AIExperiment) => {
    if (!experiment.id) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error('Please log in to access AI Control Center');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };
      const { error } = await supabase.functions.invoke('ai-experiments/start', {
        method: 'POST',
        headers: authHeaders,
        body: { experiment_id: experiment.id }
      });

      if (error) {
        console.error('Error starting experiment:', error);
        toast.error('Failed to start experiment');
        return;
      }

      toast.success('Experiment started successfully');
      loadExperiments();
      loadStats();
    } catch (error) {
      console.error('Error starting experiment:', error);
      toast.error('Failed to start experiment');
    }
  };

  const handleStop = async (experiment: AIExperiment) => {
    if (!experiment.id) return;

    const reason = prompt('Reason for stopping (optional):') || 'manual_stop';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error('Please log in to access AI Control Center');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };
      const { error } = await supabase.functions.invoke('ai-experiments/stop', {
        method: 'POST',
        headers: authHeaders,
        body: { experiment_id: experiment.id, reason }
      });

      if (error) {
        console.error('Error stopping experiment:', error);
        toast.error('Failed to stop experiment');
        return;
      }

      toast.success('Experiment stopped successfully');
      loadExperiments();
      loadStats();
    } catch (error) {
      console.error('Error stopping experiment:', error);
      toast.error('Failed to stop experiment');
    }
  };

  const handleDelete = async (experiment: AIExperiment) => {
    if (!confirm(`Are you sure you want to delete "${experiment.name}"?`)) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error('Please log in to access AI Control Center');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`
      };
      const { error } = await supabase.functions.invoke('ai-experiments', {
        method: 'DELETE',
        headers: authHeaders,
        body: { id: experiment.id }
      });

      if (error) {
        console.error('Error deleting experiment:', error);
        toast.error('Failed to delete AI experiment');
        return;
      }

      toast.success('AI experiment deleted successfully');
      loadExperiments();
      loadStats();
    } catch (error) {
      console.error('Error deleting experiment:', error);
      toast.error('Failed to delete AI experiment');
    }
  };

  const getExperimentTypeLabel = (type: string) => {
    const labels = {
      'prompt_optimization': 'Prompt Optimization',
      'model_comparison': 'Model Comparison',
      'parameter_tuning': 'Parameter Tuning',
      'response_format': 'Response Format',
      'custom': 'Custom'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'running': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'archived': 'bg-gray-100 text-gray-600',
      'promoting': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getWinnerColor = (winner: string) => {
    if (winner === 'A') return 'bg-blue-100 text-blue-800';
    if (winner === 'B') return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const normalizeText = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      const joined = value
        .map((item) => normalizeText(item))
        .filter((item) => item.length > 0)
        .join(', ');
      return joined || JSON.stringify(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  };
  const getTagDisplay = (tag: NonNullable<AIExperiment['tags']>[number]) => {
    if (typeof tag === 'string') {
      return { text: tag, description: undefined };
    }

    if (tag && typeof tag === 'object') {
      const rawLabel = (tag as { label?: unknown }).label;
      const rawDescription = (tag as { description?: unknown }).description;
      const text = normalizeText(rawLabel);
      const descriptionText = normalizeText(rawDescription);
      return {
        text,
        description: descriptionText.length > 0 ? descriptionText : undefined
      };
    }

    const fallback = normalizeText(tag);
    return {
      text: fallback,
      description: undefined
    };
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-600" />
            AI Experiments
          </h1>
          <p className="text-gray-600 mt-1">
            A/B test prompts and optimize AI performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadExperiments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Experiment
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Total Experiments</div>
                <div className="font-medium">{stats.total}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm text-gray-500">Running</div>
                <div className="font-medium">{stats.running}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm text-gray-500">Total Participants</div>
                <div className="font-medium">{stats.total_participants?.toLocaleString()}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm text-gray-500">Successful</div>
                <div className="font-medium">{stats.successful_experiments}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Experiments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : experiments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI experiments</h3>
            <p className="text-gray-600 mb-4">Create your first AI experiment to get started.</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Experiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {experiments.map(experiment => (
            <Card key={experiment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {experiment.name}
                      <Badge className={getStatusColor(experiment.status || 'draft')}>
                        {experiment.status || 'draft'}
                      </Badge>
                      {experiment.winner && (
                        <Badge className={getWinnerColor(experiment.winner)}>
                          Winner: {experiment.winner}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getExperimentTypeLabel(experiment.experiment_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {experiment.traffic_split || 50}% / {100 - (experiment.traffic_split || 50)}% split
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {experiment.description && (
                    <p className="text-sm text-gray-600">{experiment.description}</p>
                  )}

                  {/* Progress and Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Participants</div>
                      <div className="font-medium">{experiment.current_participants || 0} / {experiment.sample_size || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Significance</div>
                      <div className="font-medium">
                        {experiment.statistical_significance
                          ? `${(experiment.statistical_significance * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Metric</div>
                      <div className="font-medium">{experiment.success_metric || 'accuracy'}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {experiment.sample_size && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((experiment.current_participants || 0) / experiment.sample_size) * 100)}%`
                        }}
                      ></div>
                    </div>
                  )}

                  {/* Tags */}
                  {Array.isArray(experiment.tags) && experiment.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {experiment.tags.map((tag, index) => {
                        const tagDisplay = getTagDisplay(tag);
                        if (!tagDisplay.text) {
                          return null;
                        }

                        return (
                          <Badge
                            key={`${tagDisplay.text}-${index}`}
                            variant="secondary"
                            className="text-xs"
                            title={tagDisplay.description ?? undefined}
                          >
                            {tagDisplay.text}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(experiment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(experiment)}
                      disabled={experiment.status === 'running'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {experiment.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStart(experiment)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {experiment.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStop(experiment)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(experiment)}
                      className="text-red-600 hover:text-red-700"
                      disabled={experiment.status === 'running'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create AI Experiment' : 'Edit AI Experiment'}
            </DialogTitle>
            <DialogDescription>Adjust AI experiment details, configurations, and rollout settings.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., BDR Prompt A/B Test"
                  />
                </div>
                <div>
                  <Label htmlFor="experiment_type">Experiment Type *</Label>
                  <Select
                    value={editForm.experiment_type || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, experiment_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experiment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt_optimization">Prompt Optimization</SelectItem>
                      <SelectItem value="model_comparison">Model Comparison</SelectItem>
                      <SelectItem value="parameter_tuning">Parameter Tuning</SelectItem>
                      <SelectItem value="response_format">Response Format</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Describe the experiment purpose and hypothesis"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="hypothesis">Hypothesis</Label>
                <Textarea
                  id="hypothesis"
                  value={editForm.hypothesis || ''}
                  onChange={(e) => setEditForm({ ...editForm, hypothesis: e.target.value })}
                  placeholder="What do you expect to happen?"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="config_a">Configuration A (JSON)</Label>
                  <Textarea
                    id="config_a"
                    value={configAJson}
                    onChange={(e) => setConfigAJson(e.target.value)}
                    placeholder='{"prompt": "Version A", "temperature": 0.7}'
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="config_b">Configuration B (JSON)</Label>
                  <Textarea
                    id="config_b"
                    value={configBJson}
                    onChange={(e) => setConfigBJson(e.target.value)}
                    placeholder='{"prompt": "Version B", "temperature": 0.7}'
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sample_size">Sample Size</Label>
                  <Input
                    id="sample_size"
                    type="number"
                    value={editForm.sample_size || 1000}
                    onChange={(e) => setEditForm({ ...editForm, sample_size: parseInt(e.target.value) })}
                    min="10"
                  />
                </div>
                <div>
                  <Label htmlFor="success_metric">Success Metric</Label>
                  <Input
                    id="success_metric"
                    value={editForm.success_metric || 'accuracy'}
                    onChange={(e) => setEditForm({ ...editForm, success_metric: e.target.value })}
                    placeholder="e.g., accuracy, response_quality"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="traffic_split">Traffic Split: {editForm.traffic_split || 50}% / {100 - (editForm.traffic_split || 50)}%</Label>
                <Slider
                  id="traffic_split"
                  min={10}
                  max={90}
                  step={5}
                  value={[editForm.traffic_split || 50]}
                  onValueChange={(value) => setEditForm({ ...editForm, traffic_split: value[0] })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="confidence_level">Confidence Level</Label>
                <Select
                  value={(editForm.confidence_level || 0.95).toString()}
                  onValueChange={(value) => setEditForm({ ...editForm, confidence_level: parseFloat(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.90">90%</SelectItem>
                    <SelectItem value="0.95">95%</SelectItem>
                    <SelectItem value="0.99">99%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.auto_promote === true}
                    onChange={(e) => setEditForm({ ...editForm, auto_promote: e.target.checked })}
                  />
                  <span className="text-sm">Auto-promote winner</span>
                </label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Experiment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={selectedExperiment !== null && !isEditing} onOpenChange={() => setSelectedExperiment(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedExperiment?.name}
              <Badge className={getStatusColor(selectedExperiment?.status || 'draft')}>
                {selectedExperiment?.status || 'draft'}
              </Badge>
            </DialogTitle>
            <DialogDescription>Review experiment metrics, participants, and historical performance.</DialogDescription>
          </DialogHeader>

          {selectedExperiment && (
            <div className="space-y-4">
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="font-medium">{getExperimentTypeLabel(selectedExperiment.experiment_type)}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-500">Participants</div>
                      <div className="font-medium">{selectedExperiment.current_participants || 0} / {selectedExperiment.sample_size}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Traffic Split</div>
                      <div className="font-medium">{selectedExperiment.traffic_split}% / {100 - (selectedExperiment.traffic_split || 50)}%</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-sm text-gray-500">Significance</div>
                      <div className="font-medium">
                        {selectedExperiment.statistical_significance
                          ? `${(selectedExperiment.statistical_significance * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Performance Data */}
              {performanceData && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Performance Data</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Variant A Participants</div>
                      <div className="font-medium">{performanceData.variant_a_count}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Variant B Participants</div>
                      <div className="font-medium">{performanceData.variant_b_count}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Results */}
              {selectedExperiment.results && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Results</h4>
                  <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(selectedExperiment.results, null, 2)}
                  </pre>
                </Card>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Created {new Date(selectedExperiment.created_at!).toLocaleDateString()}</span>
                <span>•</span>
                <span>Last updated {new Date(selectedExperiment.updated_at!).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

































