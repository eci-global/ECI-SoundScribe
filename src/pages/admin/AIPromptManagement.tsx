/**
 * AI Prompt Management
 *
 * Interface for managing AI prompt templates with editing, versioning,
 * and variable management capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  Eye,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Code,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import {
  promptTemplateClient,
  type PromptTemplate,
  type PromptVariable,
  type PromptCategory,
  PROMPT_TEMPLATE_QUERY_KEYS
} from '@/utils/promptTemplateClient';

export default function AIPromptManagement() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PromptTemplate>>({});
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [renderedPreview, setRenderedPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, [filterCategory, filterStatus]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const filters = {
        category: filterCategory && filterCategory !== 'all' ? filterCategory : undefined,
        is_active: filterStatus && filterStatus !== 'all' ? filterStatus === 'active' : undefined
      };
      const data = await promptTemplateClient.getTemplates(filters);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load prompt templates');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await promptTemplateClient.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedTemplate(null);
    setEditForm({
      name: '',
      category: 'bdr_coaching',
      description: '',
      template_content: '',
      variables: [],
      is_active: true
    });
    setVariables([]);
    setValidationErrors([]);
  };

  const handleEdit = (template: PromptTemplate) => {
    setIsCreating(false);
    setIsEditing(true);
    setSelectedTemplate(template);
    setEditForm({ ...template });
    setVariables(template.variables || []);
    setValidationErrors([]);
  };

  const handleSave = async () => {
    try {
      if (!editForm.name || !editForm.category || !editForm.template_content) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate template
      const validation = promptTemplateClient.validateTemplate(
        editForm.template_content || '',
        variables
      );

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Template validation failed');
        return;
      }

      setValidationErrors([]);

      const templateData = {
        ...editForm,
        variables
      } as PromptTemplate;

      if (isCreating) {
        await promptTemplateClient.createTemplate(templateData);
        toast.success('Template created successfully');
      } else if (selectedTemplate) {
        templateData.id = selectedTemplate.id;
        await promptTemplateClient.updateTemplate(templateData as PromptTemplate & { id: string });
        toast.success('Template updated successfully');
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (template: PromptTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      await promptTemplateClient.deleteTemplate(template.id!);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      const newName = `${template.name} (Copy)`;
      await promptTemplateClient.duplicateTemplate(template.id!, newName);
      toast.success('Template duplicated successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handlePreview = async () => {
    try {
      if (!selectedTemplate?.id) return;
      const rendered = await promptTemplateClient.renderTemplate(
        selectedTemplate.id,
        testVariables
      );
      setRenderedPreview(rendered);
    } catch (error) {
      console.error('Error rendering preview:', error);
      toast.error('Failed to render preview');
    }
  };

  const addVariable = () => {
    setVariables([
      ...variables,
      { name: '', type: 'text', description: '', required: false }
    ]);
  };

  const updateVariable = (index: number, field: keyof PromptVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const extractVariablesFromContent = () => {
    const content = editForm.template_content || '';
    const extracted = promptTemplateClient.extractVariables(content);
    const newVariables = extracted
      .filter(name => !variables.find(v => v.name === name))
      .map(name => ({
        name,
        type: 'text' as const,
        description: '',
        required: false
      }));

    if (newVariables.length > 0) {
      setVariables([...variables, ...newVariables]);
      toast.success(`Added ${newVariables.length} variables from template`);
    } else {
      toast.info('No new variables found in template');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Prompt Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage AI prompt templates, variables, and versions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTemplates}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category.replace('_', ' ').toUpperCase()} ({cat.template_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {templates.length === 0 ? 'Create your first prompt template to get started.' : 'Try adjusting your search or filters.'}
            </p>
            {templates.length === 0 && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.name}
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {template.category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Used {template.usage_count || 0} times
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Template name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={editForm.category || ''}
                    onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bdr_coaching">BDR Coaching</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Template description"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content">Template Content *</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={extractVariablesFromContent}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Extract Variables
                  </Button>
                </div>
                <Textarea
                  id="content"
                  value={editForm.template_content || ''}
                  onChange={(e) => setEditForm({ ...editForm, template_content: e.target.value })}
                  placeholder="Enter your prompt template here. Use {{variable_name}} for variables."
                  rows={12}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use double braces for variables: {`{{variable_name}}`}
                </p>
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

            <TabsContent value="variables" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Template Variables</h3>
                <Button variant="outline" onClick={addVariable}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variable
                </Button>
              </div>

              {variables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No variables defined. Variables make your templates reusable.
                </div>
              ) : (
                <div className="space-y-4">
                  {variables.map((variable, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Variable name"
                            value={variable.name}
                            onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <Select
                            value={variable.type}
                            onValueChange={(value) => updateVariable(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Description"
                            value={variable.description || ''}
                            onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          />
                        </div>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={variable.required || false}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariable(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {selectedTemplate && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Template Preview</h3>
                    <Button onClick={handlePreview}>
                      <Play className="h-4 w-4 mr-2" />
                      Render Preview
                    </Button>
                  </div>

                  {variables.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Test Variables</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {variables.map((variable) => (
                          <div key={variable.name}>
                            <Label htmlFor={`test-${variable.name}`}>
                              {variable.name} {variable.required && '*'}
                            </Label>
                            <Input
                              id={`test-${variable.name}`}
                              value={testVariables[variable.name] || ''}
                              onChange={(e) => setTestVariables({
                                ...testVariables,
                                [variable.name]: e.target.value
                              })}
                              placeholder={variable.description || `Enter ${variable.name}`}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {renderedPreview && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Rendered Output</h4>
                      <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border text-sm">
                        {renderedPreview}
                      </pre>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template View Dialog */}
      <Dialog open={selectedTemplate !== null && !isEditing} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.name}
              <Badge variant={selectedTemplate?.is_active ? 'default' : 'secondary'}>
                {selectedTemplate?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-gray-600">{selectedTemplate.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Category</h4>
                <Badge variant="outline">{selectedTemplate.category.replace('_', ' ')}</Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Template Content</h4>
                <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border text-sm">
                  {selectedTemplate.template_content}
                </pre>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Variables</h4>
                  <div className="space-y-2">
                    {selectedTemplate.variables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{variable.type}</Badge>
                        <span className="font-medium">{variable.name}</span>
                        {variable.required && <Badge variant="destructive">Required</Badge>}
                        <span className="text-gray-600">{variable.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Used {selectedTemplate.usage_count || 0} times</span>
                <span>•</span>
                <span>Created {new Date(selectedTemplate.created_at!).toLocaleDateString()}</span>
                {selectedTemplate.updated_at && (
                  <>
                    <span>•</span>
                    <span>Updated {new Date(selectedTemplate.updated_at).toLocaleDateString()}</span>
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