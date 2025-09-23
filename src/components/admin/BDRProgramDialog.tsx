import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BDRTrainingProgram, BDRCriteria, DEFAULT_BDR_CRITERIA } from '@/types/bdr-training';

interface BDRProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: BDRTrainingProgram | null;
  onSave: (program: Partial<BDRTrainingProgram>) => void;
}

const BDRProgramDialog: React.FC<BDRProgramDialogProps> = ({
  open,
  onOpenChange,
  program,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetScoreThreshold: 70,
    minimumCallsRequired: 5,
    tags: [] as string[],
    scorecardCriteria: DEFAULT_BDR_CRITERIA
  });
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name,
        description: program.description || '',
        targetScoreThreshold: program.targetScoreThreshold,
        minimumCallsRequired: program.minimumCallsRequired,
        tags: program.tags || [],
        scorecardCriteria: program.scorecardCriteria || DEFAULT_BDR_CRITERIA
      });
    } else {
      setFormData({
        name: '',
        description: '',
        targetScoreThreshold: 70,
        minimumCallsRequired: 5,
        tags: [],
        scorecardCriteria: DEFAULT_BDR_CRITERIA
      });
    }
  }, [program, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleCriteriaChange = (index: number, field: keyof BDRCriteria, value: any) => {
    setFormData(prev => ({
      ...prev,
      scorecardCriteria: prev.scorecardCriteria.map((criteria, i) =>
        i === index ? { ...criteria, [field]: value } : criteria
      )
    }));
  };

  const handleAddCriteria = () => {
    const newCriteria: BDRCriteria = {
      id: `custom_${Date.now()}`,
      name: 'New Criteria',
      description: 'Description for new criteria',
      weight: 10,
      maxScore: 10,
      passingScore: 6,
      scoringGuidelines: {
        excellent: { min: 9, description: 'Excellent performance' },
        good: { min: 7, description: 'Good performance' },
        needs_improvement: { min: 5, description: 'Needs improvement' },
        poor: { min: 0, description: 'Poor performance' }
      },
      evaluationPrompts: {
        analysisPrompt: 'Analyze this criteria...',
        scoringPrompt: 'Rate this criteria...',
        feedbackPrompt: 'Provide feedback on this criteria...'
      }
    };

    setFormData(prev => ({
      ...prev,
      scorecardCriteria: [...prev.scorecardCriteria, newCriteria]
    }));
  };

  const handleRemoveCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scorecardCriteria: prev.scorecardCriteria.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Program name is required');
      return;
    }

    onSave(formData);
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default criteria? This will overwrite any custom criteria.')) {
      setFormData(prev => ({
        ...prev,
        scorecardCriteria: DEFAULT_BDR_CRITERIA
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {program ? 'Edit Training Program' : 'Create New Training Program'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="criteria">Scorecard Criteria</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter program name..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the training program objectives and goals..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetScore">Target Score Threshold (%)</Label>
                  <Input
                    id="targetScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetScoreThreshold}
                    onChange={(e) => handleInputChange('targetScoreThreshold', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="minCalls">Minimum Calls Required</Label>
                  <Input
                    id="minCalls"
                    type="number"
                    min="1"
                    value={formData.minimumCallsRequired}
                    onChange={(e) => handleInputChange('minimumCallsRequired', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag} size="sm">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Scorecard Criteria Tab */}
          <TabsContent value="criteria" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Evaluation Criteria</h3>
              <div className="flex gap-2">
                <Button onClick={handleResetToDefaults} variant="outline" size="sm">
                  Reset to Defaults
                </Button>
                <Button onClick={handleAddCriteria} size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Criteria
                </Button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {formData.scorecardCriteria.map((criteria, index) => (
                <Card key={criteria.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={criteria.name}
                          onChange={(e) => handleCriteriaChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Weight (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={criteria.weight}
                          onChange={(e) => handleCriteriaChange(index, 'weight', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveCriteria(index)}
                      variant="outline"
                      size="sm"
                      className="ml-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={criteria.description}
                        onChange={(e) => handleCriteriaChange(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Max Score</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={criteria.maxScore}
                          onChange={(e) => handleCriteriaChange(index, 'maxScore', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Excellent (min score)</Label>
                        <Input
                          type="number"
                          value={criteria.scoringGuidelines.excellent.min}
                          onChange={(e) => {
                            const newGuidelines = {
                              ...criteria.scoringGuidelines,
                              excellent: {
                                ...criteria.scoringGuidelines.excellent,
                                min: parseInt(e.target.value)
                              }
                            };
                            handleCriteriaChange(index, 'scoringGuidelines', newGuidelines);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Good (min score)</Label>
                        <Input
                          type="number"
                          value={criteria.scoringGuidelines.good.min}
                          onChange={(e) => {
                            const newGuidelines = {
                              ...criteria.scoringGuidelines,
                              good: {
                                ...criteria.scoringGuidelines.good,
                                min: parseInt(e.target.value)
                              }
                            };
                            handleCriteriaChange(index, 'scoringGuidelines', newGuidelines);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p><strong>Total Weight:</strong> {formData.scorecardCriteria.reduce((sum, c) => sum + c.weight, 0)}% 
                {formData.scorecardCriteria.reduce((sum, c) => sum + c.weight, 0) !== 100 && 
                  <span className="text-orange-600 ml-2">⚠️ Should equal 100%</span>
                }
              </p>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Score Threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.targetScoreThreshold}
                      onChange={(e) => handleInputChange('targetScoreThreshold', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Minimum score required to pass the training program
                    </p>
                  </div>

                  <div>
                    <Label>Minimum Calls Required</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.minimumCallsRequired}
                      onChange={(e) => handleInputChange('minimumCallsRequired', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Number of calls needed to complete the program
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Program Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Criteria Count:</span>
                      <span className="ml-2 font-medium">{formData.scorecardCriteria.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Weight:</span>
                      <span className="ml-2 font-medium">
                        {formData.scorecardCriteria.reduce((sum, c) => sum + c.weight, 0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Possible Score:</span>
                      <span className="ml-2 font-medium">
                        {Math.max(...formData.scorecardCriteria.map(c => c.maxScore), 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tags:</span>
                      <span className="ml-2 font-medium">{formData.tags.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {program ? 'Update Program' : 'Create Program'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BDRProgramDialog;