import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Weight,
  FileText,
  Save
} from 'lucide-react';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
  type?: 'text' | 'number' | 'select' | 'boolean';
  options?: string[]; // For select type
  required?: boolean;
}

interface CriteriaBuilderProps {
  initialCriteria?: Record<string, any>;
  onCriteriaChange: (criteria: Record<string, any>) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const CriteriaBuilder: React.FC<CriteriaBuilderProps> = ({
  initialCriteria = {},
  onCriteriaChange,
  onValidationChange
}) => {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCriterion, setNewCriterion] = useState<Partial<Criterion>>({
    name: '',
    weight: 0,
    description: '',
    type: 'text',
    required: false
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Convert initial criteria to criteria array
    if (Object.keys(initialCriteria).length > 0) {
      const criteriaArray = Object.entries(initialCriteria).map(([key, value]) => ({
        id: key,
        name: value.name || '',
        weight: value.weight || 0,
        description: value.description || '',
        type: value.type || 'text',
        options: value.options || [],
        required: value.required || false
      }));
      setCriteria(criteriaArray);
    }
  }, [initialCriteria]);

  useEffect(() => {
    // Convert criteria array back to object format
    const criteriaObject = criteria.reduce((acc, criterion) => {
      acc[criterion.id] = {
        name: criterion.name,
        weight: criterion.weight,
        description: criterion.description,
        type: criterion.type,
        options: criterion.options,
        required: criterion.required
      };
      return acc;
    }, {} as Record<string, any>);

    onCriteriaChange(criteriaObject);
    validateCriteria();
  }, [criteria, onCriteriaChange]);

  const validateCriteria = () => {
    const errors: string[] = [];
    
    if (criteria.length === 0) {
      errors.push('At least one criterion is required');
    }

    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (totalWeight !== 100 && totalWeight !== 0) {
      errors.push(`Total weight must equal 100% (currently ${totalWeight}%)`);
    }

    const duplicateNames = criteria.filter((criterion, index, arr) => 
      arr.findIndex(c => c.name.toLowerCase() === criterion.name.toLowerCase()) !== index
    );
    if (duplicateNames.length > 0) {
      errors.push('Criterion names must be unique');
    }

    const emptyNames = criteria.filter(criterion => !criterion.name.trim());
    if (emptyNames.length > 0) {
      errors.push('All criteria must have a name');
    }

    const negativeWeights = criteria.filter(criterion => criterion.weight < 0);
    if (negativeWeights.length > 0) {
      errors.push('Weights cannot be negative');
    }

    setValidationErrors(errors);
    onValidationChange?.(errors.length === 0, errors);
  };

  const addCriterion = () => {
    if (!newCriterion.name?.trim()) {
      setValidationErrors(['Criterion name is required']);
      return;
    }

    if (criteria.some(c => c.name.toLowerCase() === newCriterion.name!.toLowerCase())) {
      setValidationErrors(['A criterion with this name already exists']);
      return;
    }

    const criterion: Criterion = {
      id: `criterion_${Date.now()}`,
      name: newCriterion.name,
      weight: newCriterion.weight || 0,
      description: newCriterion.description || '',
      type: newCriterion.type || 'text',
      options: newCriterion.options || [],
      required: newCriterion.required || false
    };

    setCriteria([...criteria, criterion]);
    setNewCriterion({
      name: '',
      weight: 0,
      description: '',
      type: 'text',
      required: false
    });
    setShowAddForm(false);
    setValidationErrors([]);
  };

  const updateCriterion = (id: string, updates: Partial<Criterion>) => {
    setCriteria(criteria.map(criterion => 
      criterion.id === id ? { ...criterion, ...updates } : criterion
    ));
    setEditingCriterion(null);
  };

  const deleteCriterion = (id: string) => {
    setCriteria(criteria.filter(criterion => criterion.id !== id));
  };

  const addOption = (criterionId: string, option: string) => {
    if (!option.trim()) return;
    
    setCriteria(criteria.map(criterion => 
      criterion.id === criterionId 
        ? { ...criterion, options: [...(criterion.options || []), option] }
        : criterion
    ));
  };

  const removeOption = (criterionId: string, optionIndex: number) => {
    setCriteria(criteria.map(criterion => 
      criterion.id === criterionId 
        ? { 
            ...criterion, 
            options: criterion.options?.filter((_, index) => index !== optionIndex) || []
          }
        : criterion
    ));
  };

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Evaluation Criteria</h3>
          <p className="text-sm text-gray-600">
            Define the criteria for evaluating performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={totalWeight === 100 ? 'default' : 'secondary'}>
            Total Weight: {totalWeight}%
          </Badge>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Criterion</span>
          </Button>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm">{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Criteria list */}
      <div className="space-y-3">
        {criteria.map((criterion) => (
          <Card key={criterion.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-base">{criterion.name}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Weight className="h-3 w-3" />
                      <span>{criterion.weight}%</span>
                      {criterion.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCriterion(criterion.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCriterion(criterion.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">{criterion.description}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Type:</span>
                  <Badge variant="outline">{criterion.type}</Badge>
                </div>
                {criterion.options && criterion.options.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500">Options:</span>
                    <div className="flex flex-wrap gap-1">
                      {criterion.options.map((option, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add criterion form */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Add New Criterion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="criterion_name">Criterion Name *</Label>
                <Input
                  id="criterion_name"
                  value={newCriterion.name || ''}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                  placeholder="e.g., Communication Skills"
                />
              </div>
              <div>
                <Label htmlFor="criterion_weight">Weight (%) *</Label>
                <Input
                  id="criterion_weight"
                  type="number"
                  min="0"
                  max="100"
                  value={newCriterion.weight || ''}
                  onChange={(e) => setNewCriterion({ ...newCriterion, weight: parseInt(e.target.value) || 0 })}
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="criterion_description">Description</Label>
              <Textarea
                id="criterion_description"
                value={newCriterion.description || ''}
                onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                placeholder="Describe what this criterion evaluates..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="criterion_type">Type</Label>
                <select
                  id="criterion_type"
                  value={newCriterion.type || 'text'}
                  onChange={(e) => setNewCriterion({ ...newCriterion, type: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="text">Text Response</option>
                  <option value="number">Numeric Score</option>
                  <option value="select">Multiple Choice</option>
                  <option value="boolean">Yes/No</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="criterion_required"
                  checked={newCriterion.required || false}
                  onChange={(e) => setNewCriterion({ ...newCriterion, required: e.target.checked })}
                />
                <Label htmlFor="criterion_required">Required</Label>
              </div>
            </div>

            {/* Options for select type */}
            {newCriterion.type === 'select' && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {newCriterion.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(newCriterion.options || [])];
                          newOptions[index] = e.target.value;
                          setNewCriterion({ ...newCriterion, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = newCriterion.options?.filter((_, i) => i !== index) || [];
                          setNewCriterion({ ...newCriterion, options: newOptions });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...(newCriterion.options || []), ''];
                      setNewCriterion({ ...newCriterion, options: newOptions });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCriterion({
                    name: '',
                    weight: 0,
                    description: '',
                    type: 'text',
                    required: false
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={addCriterion}>
                <Save className="h-4 w-4 mr-2" />
                Add Criterion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit criterion modal */}
      {editingCriterion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Criterion</CardTitle>
            </CardHeader>
            <CardContent>
              <EditCriterionForm
                criterion={criteria.find(c => c.id === editingCriterion)!}
                onSave={(updates) => {
                  updateCriterion(editingCriterion, updates);
                }}
                onCancel={() => setEditingCriterion(null)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {criteria.length === 0 && !showAddForm && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Criteria Defined</h3>
            <p className="text-gray-500 text-center mb-4">
              Add evaluation criteria to define how performance will be scored.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Criterion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Edit criterion form component
interface EditCriterionFormProps {
  criterion: Criterion;
  onSave: (updates: Partial<Criterion>) => void;
  onCancel: () => void;
}

const EditCriterionForm: React.FC<EditCriterionFormProps> = ({
  criterion,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Criterion>>(criterion);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit_name">Criterion Name *</Label>
          <Input
            id="edit_name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="edit_weight">Weight (%) *</Label>
          <Input
            id="edit_weight"
            type="number"
            min="0"
            max="100"
            value={formData.weight || ''}
            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="edit_description">Description</Label>
        <Textarea
          id="edit_description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit_type">Type</Label>
          <select
            id="edit_type"
            value={formData.type || 'text'}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="text">Text Response</option>
            <option value="number">Numeric Score</option>
            <option value="select">Multiple Choice</option>
            <option value="boolean">Yes/No</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit_required"
            checked={formData.required || false}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
          />
          <Label htmlFor="edit_required">Required</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default CriteriaBuilder;
