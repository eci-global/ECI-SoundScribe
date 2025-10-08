/**
 * AI Scoring Rubrics
 *
 * Interface for managing scoring rubrics and evaluation frameworks
 * used by AI systems for consistent scoring across different criteria.
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
import {
  Sliders,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Save,
  X,
  RefreshCw,
  Target,
  BarChart3,
  Settings,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import diagnoseAIControlCenter from '@/utils/aiControlCenterDiagnostics';
import { supabase } from '@/integrations/supabase/client';
import CriteriaBuilder from '@/components/admin/CriteriaBuilder';

interface ScoringRubric {
  id?: string;
  name: string;
  category: 'bdr_criteria' | 'coaching_framework' | 'quality_assessment' | 'performance_evaluation' | 'custom';
  description?: string;
  criteria: any;
  scale_type: '0-4' | '1-5' | 'percentage' | 'binary' | 'custom';
  scale_definition: any;
  is_active?: boolean;
  is_default?: boolean;
  usage_count?: number;
  validation_rules?: any;
  accuracy_metrics?: any;
  version?: number;
  tags?: Array<string | { label: string; description?: string }>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface RubricValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  total_weight?: number;
  criteria_count?: number;
}

interface RubricStats {
  total: number;
  active: number;
  by_category: Record<string, number>;
  by_scale_type: Record<string, number>;
  total_usage: number;
  avg_version: number;
}

export default function AIScoringRubrics() {
  const [rubrics, setRubrics] = useState<ScoringRubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<ScoringRubric | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ScoringRubric>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<RubricStats | null>(null);
  const [validationResult, setValidationResult] = useState<RubricValidationResult | null>(null);
  const [criteriaJson, setCriteriaJson] = useState('');
  const [scaleDefinitionJson, setScaleDefinitionJson] = useState('');
  const [criteriaBuilderData, setCriteriaBuilderData] = useState<Record<string, any>>({});
  const [criteriaValidationErrors, setCriteriaValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadRubrics();
    loadStats();
  }, []);

  const loadRubrics = async () => {
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

      const { data, error } = await supabase.functions.invoke('ai-scoring-rubrics', {
        method: 'GET',
        headers: authHeaders
      });

      if (error) {
        console.error('Error loading rubrics:', error);
        // Handle specific authentication errors
        if (error.message?.includes('JWT expired') || error.message?.includes('Invalid JWT')) {
          toast.error('Session expired. Please refresh the page and log in again.');
        } else if (error.message?.includes('Admin access required')) {
          toast.error('Admin access required for AI Control Center');
        } else {
          toast.error('Failed to load scoring rubrics');
        }
        return;
      }

      setRubrics(data.rubrics || []);
    } catch (error) {
      console.error('Error loading rubrics:', error);
      toast.error('Failed to load scoring rubrics');
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

      const { data, error } = await supabase.functions.invoke('ai-scoring-rubrics/stats', {
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

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedRubric(null);
    setEditForm({
      name: '',
      category: 'bdr_criteria',
      description: '',
      criteria: {},
      scale_type: '0-4',
      scale_definition: {
        "0": "Not Demonstrated",
        "1": "Developing",
        "2": "Meets Expectations",
        "3": "Strong Performance",
        "4": "Best-in-Class"
      },
      is_active: true,
      is_default: false,
      validation_rules: {},
      tags: []
    });
    setCriteriaJson('{}');
    setScaleDefinitionJson(JSON.stringify({
      "0": "Not Demonstrated",
      "1": "Developing",
      "2": "Meets Expectations",
      "3": "Strong Performance",
      "4": "Best-in-Class"
    }, null, 2));
    // Initialize empty criteria builder data
    setCriteriaBuilderData({});
  };

  const handleEdit = (rubric: ScoringRubric) => {
    setIsCreating(false);
    setIsEditing(true);
    setSelectedRubric(rubric);
    setEditForm({ ...rubric });
    setCriteriaJson(JSON.stringify(rubric.criteria || {}, null, 2));
    setScaleDefinitionJson(JSON.stringify(rubric.scale_definition || {}, null, 2));
    // Initialize criteria builder data
    setCriteriaBuilderData(rubric.criteria || {});
  };

  const handleValidateCriteria = async () => {
    try {
      let parsedCriteria;
      try {
        parsedCriteria = JSON.parse(criteriaJson);
      } catch (error) {
        toast.error('Invalid JSON in criteria field');
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

      const { data, error } = await supabase.functions.invoke('ai-scoring-rubrics/validate-criteria', {
        method: 'POST',
        headers: authHeaders,
        body: {
          criteria: parsedCriteria,
          scale_type: editForm.scale_type
        }
      });

      if (error) {
        console.error('Error validating criteria:', error);
        toast.error('Failed to validate criteria');
        return;
      }

      setValidationResult(data.validation_result);
      if (data.validation_result.valid) {
        toast.success('Criteria validation successful');
      } else {
        toast.warning('Criteria validation issues found');
      }
    } catch (error) {
      console.error('Error validating criteria:', error);
      toast.error('Failed to validate criteria');
    }
  };

  const handleSave = async () => {
    try {
      if (!editForm.name || !editForm.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Use criteria builder data if available, otherwise fall back to JSON
      let parsedCriteria, parsedScaleDefinition;
      try {
        // Use criteria builder data if it has content, otherwise parse JSON
        if (Object.keys(criteriaBuilderData).length > 0) {
          parsedCriteria = criteriaBuilderData;
        } else {
          parsedCriteria = JSON.parse(criteriaJson);
        }
        parsedScaleDefinition = JSON.parse(scaleDefinitionJson);
      } catch (error) {
        toast.error('Invalid JSON in criteria or scale definition');
        return;
      }

      // Validate criteria before saving
      if (criteriaValidationErrors.length > 0) {
        toast.error('Please fix criteria validation errors before saving');
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
      const { data, error } = await supabase.functions.invoke('ai-scoring-rubrics', {
        method,
        headers: authHeaders,
        body: {
          ...editForm,
          criteria: parsedCriteria,
          scale_definition: parsedScaleDefinition
        }
      });

      if (error) {
        console.error('Error saving rubric:', error);
        toast.error('Failed to save scoring rubric');
        return;
      }

      if (isCreating) {
        toast.success('Scoring rubric created successfully');
      } else {
        toast.success('Scoring rubric updated successfully');
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedRubric(null);
      setValidationResult(null);
      loadRubrics();
      loadStats();
    } catch (error) {
      console.error('Error saving rubric:', error);
      toast.error('Failed to save scoring rubric');
    }
  };

  const handleDelete = async (rubric: ScoringRubric) => {
    if (!confirm(`Are you sure you want to delete "${rubric.name}"?`)) return;

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

      const { error } = await supabase.functions.invoke('ai-scoring-rubrics', {
        method: 'DELETE',
        headers: authHeaders,
        body: { id: rubric.id }
      });

      if (error) {
        console.error('Error deleting rubric:', error);
        toast.error('Failed to delete scoring rubric');
        return;
      }

      toast.success('Scoring rubric deleted successfully');
      loadRubrics();
      loadStats();
    } catch (error) {
      console.error('Error deleting rubric:', error);
      toast.error('Failed to delete scoring rubric');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'bdr_criteria': 'BDR Criteria',
      'coaching_framework': 'Coaching Framework',
      'quality_assessment': 'Quality Assessment',
      'performance_evaluation': 'Performance Evaluation',
      'custom': 'Custom'
    };
    return labels[category] || category;
  };

  const getScaleTypeLabel = (scaleType: string) => {
    const labels = {
      '0-4': '0-4 Scale',
      '1-5': '1-5 Scale',
      'percentage': 'Percentage (0-100%)',
      'binary': 'Binary (Pass/Fail)',
      'custom': 'Custom Scale'
    };
    return labels[scaleType] || scaleType;
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

  const getTagDisplay = (tag: NonNullable<ScoringRubric['tags']>[number]) => {
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
            <Sliders className="h-8 w-8 text-blue-600" />
            Scoring Rubrics
          </h1>
          <p className="text-gray-600 mt-1">
            Manage AI scoring rubrics and evaluation frameworks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRubrics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rubric
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Total Rubrics</div>
                <div className="font-medium">{stats.total}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm text-gray-500">Active</div>
                <div className="font-medium">{stats.active}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm text-gray-500">Total Usage</div>
                <div className="font-medium">{stats.total_usage?.toLocaleString()}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm text-gray-500">Avg Version</div>
                <div className="font-medium">{stats.avg_version}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rubrics List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : rubrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sliders className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scoring rubrics</h3>
            <p className="text-gray-600 mb-4">Create your first scoring rubric to get started.</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Scoring Rubric
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rubrics.map(rubric => (
            <Card key={rubric.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {normalizeText(rubric.name)}
                      <Badge variant={rubric.is_active ? 'default' : 'secondary'}>
                        {rubric.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {rubric.is_default && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(rubric.category)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getScaleTypeLabel(rubric.scale_type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rubric.description && (
                    <p className="text-sm text-gray-600">{normalizeText(rubric.description)}</p>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Usage Count</div>
                      <div className="font-medium">{rubric.usage_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Version</div>
                      <div className="font-medium">v{rubric.version || 1}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Criteria</div>
                      <div className="font-medium">{Object.keys(rubric.criteria || {}).length}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {Array.isArray(rubric.tags) && rubric.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rubric.tags.map((tag, index) => {
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
                      onClick={() => setSelectedRubric(rubric)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(rubric)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rubric)}
                      className="text-red-600 hover:text-red-700"
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
              {isCreating ? 'Create Scoring Rubric' : 'Edit Scoring Rubric'}
            </DialogTitle>
            <DialogDescription>Define and manage AI scoring rubric structure, weights, and validation rules.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="criteria">Criteria</TabsTrigger>
              <TabsTrigger value="scale">Scale Definition</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., BDR Call Evaluation Rubric"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={editForm.category || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bdr_criteria">BDR Criteria</SelectItem>
                      <SelectItem value="coaching_framework">Coaching Framework</SelectItem>
                      <SelectItem value="quality_assessment">Quality Assessment</SelectItem>
                      <SelectItem value="performance_evaluation">Performance Evaluation</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Describe the purpose and usage of this scoring rubric"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="scale_type">Scale Type *</Label>
                <Select
                  value={editForm.scale_type || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, scale_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scale type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-4">0-4 Scale</SelectItem>
                    <SelectItem value="1-5">1-5 Scale</SelectItem>
                    <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                    <SelectItem value="binary">Binary (Pass/Fail)</SelectItem>
                    <SelectItem value="custom">Custom Scale</SelectItem>
                  </SelectContent>
                </Select>
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
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_default === true}
                    onChange={(e) => setEditForm({ ...editForm, is_default: e.target.checked })}
                  />
                  <span className="text-sm">Default for category</span>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="criteria" className="space-y-4">
              <CriteriaBuilder
                initialCriteria={criteriaBuilderData}
                onCriteriaChange={setCriteriaBuilderData}
                onValidationChange={(isValid, errors) => {
                  setCriteriaValidationErrors(errors);
                  // Update the JSON for backward compatibility
                  setCriteriaJson(JSON.stringify(criteriaBuilderData, null, 2));
                }}
              />

              {/* Show validation errors if any */}
              {criteriaValidationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {criteriaValidationErrors.map((error, index) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Advanced JSON Editor (Collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Advanced: Edit JSON directly
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="criteria_json">Criteria Definition (JSON)</Label>
                    <Textarea
                      id="criteria_json"
                      value={criteriaJson}
                      onChange={(e) => {
                        setCriteriaJson(e.target.value);
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setCriteriaBuilderData(parsed);
                        } catch (error) {
                          // Invalid JSON, keep current data
                        }
                      }}
                      placeholder='{"criterion1": {"name": "Criterion Name", "weight": 25, "description": "..."}, ...}'
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Advanced users can edit the JSON directly. Changes will be reflected in the visual builder above.
                    </p>
                  </div>

                  <Button onClick={handleValidateCriteria} variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Criteria
                  </Button>

                  {validationResult && (
                    <Alert className={validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      {validationResult.valid ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      <AlertDescription>
                        <div className="space-y-2">
                          <div>
                            <strong>Validation Result:</strong> {validationResult.valid ? 'Valid' : 'Invalid'}
                          </div>
                          {validationResult.total_weight && (
                            <div>Total Weight: {validationResult.total_weight}</div>
                          )}
                          {validationResult.criteria_count && (
                            <div>Criteria Count: {validationResult.criteria_count}</div>
                          )}
                          {validationResult.errors && validationResult.errors.length > 0 && (
                            <div>
                              <strong>Errors:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {validationResult.errors.map((error, index) => (
                                  <li key={index} className="text-sm">{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </details>
            </TabsContent>

            <TabsContent value="scale" className="space-y-4">
              <div>
                <Label htmlFor="scale_definition">Scale Definition (JSON)</Label>
                <Textarea
                  id="scale_definition"
                  value={scaleDefinitionJson}
                  onChange={(e) => setScaleDefinitionJson(e.target.value)}
                  placeholder='{"0": "Not Demonstrated", "1": "Developing", "2": "Meets Expectations", ...}'
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define what each score level means for this rubric.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Validation rules help ensure consistency and accuracy in scoring.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Validation Rules</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Require all criteria to be scored</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Validate total weight equals 100%</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">Require manager approval for scores above threshold</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">Enable automatic calibration with training data</span>
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
              Save Rubric
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={selectedRubric !== null && !isEditing} onOpenChange={() => setSelectedRubric(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {normalizeText(selectedRubric?.name)}
              <Badge variant={selectedRubric?.is_active ? 'default' : 'secondary'}>
                {selectedRubric?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
            <DialogDescription>Review rubric configuration, usage metrics, and underlying criteria.</DialogDescription>
          </DialogHeader>

          {selectedRubric && (
            <div className="space-y-4">
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Category</div>
                      <div className="font-medium">{getCategoryLabel(selectedRubric.category)}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-500">Scale Type</div>
                      <div className="font-medium">{getScaleTypeLabel(selectedRubric.scale_type)}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-sm text-gray-500">Usage Count</div>
                      <div className="font-medium">{selectedRubric.usage_count || 0}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Description */}
              {selectedRubric.description && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{normalizeText(selectedRubric.description)}</p>
                </Card>
              )}

              {/* Criteria */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Scoring Criteria</h4>
                <div className="space-y-2">
                  {Object.entries(selectedRubric.criteria || {}).map(([key, criterion]: [string, any]) => (
                    <div key={key} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-medium">{normalizeText(criterion.name) || normalizeText(key)}</h5>
                        <Badge variant="outline">{normalizeText(criterion.weight)}%</Badge>
                      </div>
                      {criterion.description && (
                        <p className="text-sm text-gray-600">{normalizeText(criterion.description)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Scale Definition */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Scale Definition</h4>
                <div className="space-y-2">
                  {Object.entries(selectedRubric.scale_definition || {}).map(([level, description]: [string, any]) => (
                    <div key={level} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 justify-center">{level}</Badge>
                      <span className="text-sm">{normalizeText(description)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Created {new Date(selectedRubric.created_at!).toLocaleDateString()}</span>
                <span>•</span>
                <span>Version {selectedRubric.version}</span>
                <span>•</span>
                <span>Last updated {new Date(selectedRubric.updated_at!).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



















