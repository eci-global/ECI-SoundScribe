/**
 * AI Model Configuration
 *
 * Interface for managing AI model configurations including Azure OpenAI,
 * Whisper, and other AI services with parameters and health monitoring.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Clock,
  Zap,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube,
  BarChart3,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ModelConfiguration {
  id?: string;
  name: string;
  service_type: 'azure_openai' | 'openai' | 'whisper' | 'custom';
  model_name: string;
  deployment_name?: string;
  endpoint_url?: string;
  api_version?: string;
  parameters: ModelParameters;
  rate_limits: RateLimits;
  is_active: boolean;
  is_default?: boolean;
  health_status?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_health_check?: string;
  total_requests?: number;
  current_month_spend?: number;
  average_response_time_ms?: number;
  error_rate?: number;
  cost_per_1k_tokens?: number;
  monthly_budget_limit?: number;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface ModelParameters {
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  timeout_seconds: number;
}

interface RateLimits {
  requests_per_minute: number;
  tokens_per_minute: number;
  concurrent_requests: number;
  daily_spend_limit: number;
}

interface HealthMetrics {
  response_time: number;
  success_rate: number;
  error_rate: number;
  availability: number;
  cost_per_1k_tokens: number;
}

export default function AIModelConfiguration() {
  const [configurations, setConfigurations] = useState<ModelConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ModelConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ModelConfiguration>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<Record<string, HealthMetrics>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Mock data - In real implementation, this would come from the database
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-model-management', {
        method: 'GET'
      });

      if (error) {
        console.error('Error loading configurations:', error);
        toast.error('Failed to load model configurations');
        return;
      }

      setConfigurations(data.configurations || []);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load model configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedConfig(null);
    setEditForm({
      name: '',
      service_type: 'azure_openai',
      model_name: 'gpt-4o-mini',
      deployment_name: '',
      endpoint_url: 'https://eastus.api.cognitive.microsoft.com/',
      api_version: '2024-10-01-preview',
      parameters: {
        temperature: 0,
        max_tokens: 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        timeout_seconds: 30
      },
      rate_limits: {
        requests_per_minute: 100,
        tokens_per_minute: 50000,
        concurrent_requests: 10,
        daily_spend_limit: 100
      },
      is_active: true
    });
  };

  const handleEdit = (config: ModelConfiguration) => {
    setIsCreating(false);
    setIsEditing(true);
    setSelectedConfig(config);
    setEditForm({ ...config });
  };

  const handleSave = async () => {
    try {
      if (!editForm.name || !editForm.service_type || !editForm.model_name) {
        toast.error('Please fill in all required fields');
        return;
      }

      const method = isCreating ? 'POST' : 'PUT';
      const { data, error } = await supabase.functions.invoke('ai-model-management', {
        method,
        body: editForm
      });

      if (error) {
        console.error('Error saving configuration:', error);
        toast.error('Failed to save configuration');
        return;
      }

      if (isCreating) {
        toast.success('Model configuration created successfully');
      } else {
        toast.success('Model configuration updated successfully');
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedConfig(null);
      loadConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleDelete = async (config: ModelConfiguration) => {
    if (!confirm(`Are you sure you want to delete "${config.name}"?`)) return;

    try {
      const { error } = await supabase.functions.invoke('ai-model-management', {
        method: 'DELETE',
        body: { id: config.id }
      });

      if (error) {
        console.error('Error deleting configuration:', error);
        toast.error('Failed to delete configuration');
        return;
      }

      toast.success('Configuration deleted successfully');
      loadConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleTestConnection = async (config: ModelConfiguration) => {
    try {
      setTestResults({ ...testResults, [config.id!]: { testing: true } });

      const { data, error } = await supabase.functions.invoke('ai-model-management/test-connection', {
        method: 'POST',
        body: { id: config.id }
      });

      if (error) {
        setTestResults({
          ...testResults,
          [config.id!]: {
            success: false,
            message: 'Failed to test connection - ' + error.message
          }
        });
        return;
      }

      const testResult = data.test_result;
      setTestResults({
        ...testResults,
        [config.id!]: {
          success: testResult.success,
          response_time: testResult.response_time,
          message: testResult.success ? 'Connection successful' : testResult.error || 'Connection failed'
        }
      });

      if (testResult.success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResults({
        ...testResults,
        [config.id!]: {
          success: false,
          message: 'Failed to test connection'
        }
      });
      toast.error('Failed to test connection');
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'unhealthy': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            Model Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure AI models, parameters, and health monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadConfigurations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
        </div>
      </div>

      {/* Configuration List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : configurations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No model configurations</h3>
            <p className="text-gray-600 mb-4">Add your first AI model configuration to get started.</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configurations.map(config => {
            const HealthIcon = getHealthIcon(config.health_status);
            const testResult = testResults[config.id!];

            return (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {config.name}
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {config.model_type}
                        </Badge>
                        <div className={`flex items-center gap-1 text-xs ${getHealthColor(config.health_status)}`}>
                          <HealthIcon className="h-3 w-3" />
                          {config.health_status || 'unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Response Time</div>
                        <div className="font-medium">{config.average_response_time_ms}ms</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Requests</div>
                        <div className="font-medium">{config.total_requests?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Monthly Cost</div>
                        <div className="font-medium">{formatCurrency(config.current_month_spend || 0)}</div>
                      </div>
                    </div>

                    {/* Rate Limits */}
                    <div className="text-sm">
                      <div className="text-gray-500 mb-1">Rate Limits</div>
                      <div className="flex items-center gap-4">
                        <span>{config.rate_limits.requests_per_minute} req/min</span>
                        <span>{config.rate_limits.tokens_per_minute.toLocaleString()} tokens/min</span>
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className={`text-sm p-2 rounded ${testResult.testing ? 'bg-blue-50' : testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        {testResult.testing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Testing connection...
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                              {testResult.message}
                            </span>
                            {testResult.success && (
                              <span className="text-gray-600">{testResult.response_time}ms</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(config)}
                        disabled={testResult?.testing}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConfig(config)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(config)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Configuration Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Add Model Configuration' : 'Edit Model Configuration'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="limits">Rate Limits</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Configuration Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., Azure GPT-4o Mini (Primary)"
                  />
                </div>
                <div>
                  <Label htmlFor="provider">Provider *</Label>
                  <Select
                    value={editForm.provider || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, provider: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model_type">Model Type *</Label>
                  <Select
                    value={editForm.model_type || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, model_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="whisper-1">Whisper-1</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deployment_name">Deployment Name *</Label>
                  <Input
                    id="deployment_name"
                    value={editForm.deployment_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, deployment_name: e.target.value })}
                    placeholder="e.g., gpt-4o-mini"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="endpoint_url">Endpoint URL *</Label>
                <Input
                  id="endpoint_url"
                  value={editForm.endpoint_url || ''}
                  onChange={(e) => setEditForm({ ...editForm, endpoint_url: e.target.value })}
                  placeholder="https://eastus.api.cognitive.microsoft.com/"
                />
              </div>

              <div>
                <Label htmlFor="api_version">API Version</Label>
                <Input
                  id="api_version"
                  value={editForm.api_version || ''}
                  onChange={(e) => setEditForm({ ...editForm, api_version: e.target.value })}
                  placeholder="2024-10-01-preview"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_active !== false}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="parameters" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editForm.parameters?.temperature || 0]}
                      onValueChange={(value) => setEditForm({
                        ...editForm,
                        parameters: { ...editForm.parameters!, temperature: value[0] }
                      })}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0 (deterministic)</span>
                      <span>{editForm.parameters?.temperature || 0}</span>
                      <span>2 (creative)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    type="number"
                    id="max_tokens"
                    value={editForm.parameters?.max_tokens || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      parameters: { ...editForm.parameters!, max_tokens: parseInt(e.target.value) }
                    })}
                    placeholder="4000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="top_p">Top P</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editForm.parameters?.top_p || 1]}
                      onValueChange={(value) => setEditForm({
                        ...editForm,
                        parameters: { ...editForm.parameters!, top_p: value[0] }
                      })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{editForm.parameters?.top_p || 1}</span>
                      <span>1</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
                  <Input
                    type="number"
                    id="timeout_seconds"
                    value={editForm.parameters?.timeout_seconds || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      parameters: { ...editForm.parameters!, timeout_seconds: parseInt(e.target.value) }
                    })}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency_penalty">Frequency Penalty</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editForm.parameters?.frequency_penalty || 0]}
                      onValueChange={(value) => setEditForm({
                        ...editForm,
                        parameters: { ...editForm.parameters!, frequency_penalty: value[0] }
                      })}
                      min={-2}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      {editForm.parameters?.frequency_penalty || 0}
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="presence_penalty">Presence Penalty</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[editForm.parameters?.presence_penalty || 0]}
                      onValueChange={(value) => setEditForm({
                        ...editForm,
                        parameters: { ...editForm.parameters!, presence_penalty: value[0] }
                      })}
                      min={-2}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      {editForm.parameters?.presence_penalty || 0}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Rate limits help prevent API abuse and manage costs. Set conservative limits initially.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requests_per_minute">Requests per Minute</Label>
                  <Input
                    type="number"
                    id="requests_per_minute"
                    value={editForm.rate_limits?.requests_per_minute || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      rate_limits: { ...editForm.rate_limits!, requests_per_minute: parseInt(e.target.value) }
                    })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="tokens_per_minute">Tokens per Minute</Label>
                  <Input
                    type="number"
                    id="tokens_per_minute"
                    value={editForm.rate_limits?.tokens_per_minute || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      rate_limits: { ...editForm.rate_limits!, tokens_per_minute: parseInt(e.target.value) }
                    })}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="concurrent_requests">Concurrent Requests</Label>
                  <Input
                    type="number"
                    id="concurrent_requests"
                    value={editForm.rate_limits?.concurrent_requests || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      rate_limits: { ...editForm.rate_limits!, concurrent_requests: parseInt(e.target.value) }
                    })}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="daily_spend_limit">Daily Spend Limit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="daily_spend_limit"
                    value={editForm.rate_limits?.daily_spend_limit || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      rate_limits: { ...editForm.rate_limits!, daily_spend_limit: parseFloat(e.target.value) }
                    })}
                    placeholder="100.00"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  API keys are encrypted at rest and never logged. Rotate keys regularly for security.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="api_key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    id="api_key"
                    placeholder="Enter API key..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Keep your API keys secure and rotate them regularly
                </p>
              </div>

              <div>
                <Label>Security Features</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Enable request logging (excludes API keys)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Rate limit enforcement</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Daily spend limit protection</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">IP whitelist (enterprise only)</span>
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Details/Analytics Dialog */}
      <Dialog open={selectedConfig !== null && !isEditing} onOpenChange={() => setSelectedConfig(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConfig?.name}
              <Badge variant={selectedConfig?.is_active ? 'default' : 'secondary'}>
                {selectedConfig?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedConfig && (
            <div className="space-y-4">
              {/* Performance Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Avg Response</div>
                      <div className="font-medium">{selectedConfig.average_response_time_ms}ms</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-500">Total Requests</div>
                      <div className="font-medium">{selectedConfig.total_requests?.toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-sm text-gray-500">Monthly Spend</div>
                      <div className="font-medium">{formatCurrency(selectedConfig.current_month_spend || 0)}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${getHealthColor(selectedConfig.health_status)}`} />
                    <div>
                      <div className="text-sm text-gray-500">Health</div>
                      <div className="font-medium capitalize">{selectedConfig.health_status}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Configuration Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider:</span>
                      <span className="capitalize">{selectedConfig.provider.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Model:</span>
                      <span>{selectedConfig.model_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deployment:</span>
                      <span>{selectedConfig.deployment_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">API Version:</span>
                      <span>{selectedConfig.api_version}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-3">Parameters</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Temperature:</span>
                      <span>{selectedConfig.parameters.temperature}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Tokens:</span>
                      <span>{selectedConfig.parameters.max_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Top P:</span>
                      <span>{selectedConfig.parameters.top_p}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Timeout:</span>
                      <span>{selectedConfig.parameters.timeout_seconds}s</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Rate Limits */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Rate Limits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Requests/min</div>
                    <div className="font-medium">{selectedConfig.rate_limits.requests_per_minute}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tokens/min</div>
                    <div className="font-medium">{selectedConfig.rate_limits.tokens_per_minute.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Concurrent</div>
                    <div className="font-medium">{selectedConfig.rate_limits.concurrent_requests}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Daily Limit</div>
                    <div className="font-medium">{formatCurrency(selectedConfig.rate_limits.daily_spend_limit)}</div>
                  </div>
                </div>
              </Card>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Created {new Date(selectedConfig.created_at!).toLocaleDateString()}</span>
                <span>•</span>
                <span>Last updated {new Date(selectedConfig.updated_at!).toLocaleDateString()}</span>
                {selectedConfig.last_health_check && (
                  <>
                    <span>•</span>
                    <span>Health checked {new Date(selectedConfig.last_health_check).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}