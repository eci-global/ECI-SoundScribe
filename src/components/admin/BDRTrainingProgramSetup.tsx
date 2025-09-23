/**
 * BDR Training Program Setup Component
 * 
 * Admin interface for creating and managing BDR training programs,
 * including scorecard criteria configuration and program settings.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Save, Settings, Users, Target, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram, BDRCriteria, DEFAULT_BDR_CRITERIA as GLOBAL_BDR_CRITERIA } from '@/types/bdr-training';
import { toast } from 'sonner';

interface BDRTrainingProgramSetupProps {
  programId?: string;
  onProgramCreated?: (program: BDRTrainingProgram) => void;
  onProgramUpdated?: (program: BDRTrainingProgram) => void;
}

interface ProgramFormData {
  name: string;
  description: string;
  targetScore: number;
  isActive: boolean;
  scorecardCriteria: BDRCriteria[];
  settings: {
    requireManagerValidation: boolean;
    autoApproveThreshold: number;
    weeklyBatchProcessing: boolean;
    enableCoachingIntegration: boolean;
  };
}

const DEFAULT_BDR_CRITERIA: Omit<BDRCriteria, 'id'>[] = GLOBAL_BDR_CRITERIA.map(({ id, ...rest }) => rest);

export function BDRTrainingProgramSetup({ 
  programId, 
  onProgramCreated, 
  onProgramUpdated 
}: BDRTrainingProgramSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!programId);
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    description: '',
    targetScore: 80,
    isActive: true,
    scorecardCriteria: DEFAULT_BDR_CRITERIA.map((criteria, index) => ({
      ...criteria,
      id: `default_${index}`
    })),
    settings: {
      requireManagerValidation: true,
      autoApproveThreshold: 0.9,
      weeklyBatchProcessing: true,
      enableCoachingIntegration: true
    }
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load existing program if programId is provided
  useEffect(() => {
    if (programId) {
      loadProgram(programId);
    }
  }, [programId]);

  const loadProgram = async (id: string) => {
    try {
      setIsLoading(true);
      
      const { data: program, error } = await supabase
        .from('bdr_training_programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (program) {
        setFormData({
          name: program.name || '',
          description: program.description || '',
          targetScore: program.target_score_threshold || 80,
          isActive: program.is_active || false,
          scorecardCriteria: (program.scorecard_criteria as any) || DEFAULT_BDR_CRITERIA.map((criteria, index) => ({
            ...criteria,
            id: `default_${index}`
          })),
          settings: {
            requireManagerValidation: true,
            autoApproveThreshold: 0.9,
            weeklyBatchProcessing: true,
            enableCoachingIntegration: true
          }
        });
      }
    } catch (error) {
      console.error('Error loading program:', error);
      toast.error('Failed to load training program');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Program name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Program description is required';
    }

    if (formData.targetScore < 50 || formData.targetScore > 100) {
      errors.targetScore = 'Target score must be between 50 and 100';
    }

    if (formData.scorecardCriteria.length === 0) {
      errors.criteria = 'At least one scorecard criterion is required';
    }

    // Validate criteria weights sum to 100
    const totalWeight = formData.scorecardCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.criteriaWeights = `Criteria weights must sum to 100% (currently ${totalWeight}%)`;
    }

    // Validate individual criteria
    formData.scorecardCriteria.forEach((criteria, index) => {
      if (!criteria.name.trim()) {
        errors[`criteria_${index}_name`] = 'Criteria name is required';
      }
      if (criteria.weight <= 0 || criteria.weight > 100) {
        errors[`criteria_${index}_weight`] = 'Weight must be between 1 and 100';
      }
      if (criteria.passingScore <= 0 || criteria.passingScore > criteria.maxScore) {
        errors[`criteria_${index}_passing`] = `Passing score must be between 1 and ${criteria.maxScore}`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    try {
      setIsLoading(true);

      const programData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        target_score_threshold: formData.targetScore,
        is_active: formData.isActive,
        scorecard_criteria: formData.scorecardCriteria as any,
        updated_at: new Date().toISOString()
      };

      if (programId) {
        // Update existing program
        const { data: updatedProgram, error } = await supabase
          .from('bdr_training_programs')
          .update(programData)
          .eq('id', programId)
          .select()
          .single();

        if (error) throw error;

        toast.success('Training program updated successfully');
        setIsEditing(false);
        onProgramUpdated?.(updatedProgram);
      } else {
        // Create new program
        const { data: newProgram, error } = await supabase
          .from('bdr_training_programs')
          .insert({
            ...programData
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('Training program created successfully');
        onProgramCreated?.(newProgram);
      }
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error(`Failed to ${programId ? 'update' : 'create'} training program`);
    } finally {
      setIsLoading(false);
    }
  };

  const addCriterion = () => {
    const newCriterion: BDRCriteria = {
      id: `custom_${Date.now()}`,
      name: '',
      description: '',
      weight: 10,
      maxScore: 10,
      passingScore: 6,
      scoringGuidelines: {
        excellent: { min: 9, description: 'Excellent performance' },
        good: { min: 7, description: 'Good performance' },
        needs_improvement: { min: 5, description: 'Needs improvement' },
        poor: { min: 0, description: 'Poor performance' },
      },
      evaluationPrompts: {
        analysisPrompt: 'Analyze this criterion based on the call context.',
        scoringPrompt: 'Rate this criterion from 0 to 10 with justification.',
        feedbackPrompt: 'Provide actionable feedback to improve this criterion.',
      },
    };

    setFormData(prev => ({
      ...prev,
      scorecardCriteria: [...prev.scorecardCriteria, newCriterion]
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scorecardCriteria: prev.scorecardCriteria.filter((_, i) => i !== index)
    }));
  };

  const updateCriterion = (index: number, field: keyof BDRCriteria, value: any) => {
    setFormData(prev => ({
      ...prev,
      scorecardCriteria: prev.scorecardCriteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const resetToDefaults = () => {
    setFormData(prev => ({
      ...prev,
      scorecardCriteria: DEFAULT_BDR_CRITERIA.map((criteria, index) => ({
        ...criteria,
        id: `default_${index}`
      }))
    }));
    toast.success('Reset to default BDR criteria');
  };

  if (isLoading && programId) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading training program...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {programId ? 'Edit Training Program' : 'Create BDR Training Program'}
            </h1>
            <p className="text-gray-600">
              Configure scorecard criteria and training settings for your BDR team
            </p>
          </div>
        </div>
        {programId && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Edit Program
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Program Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Q4 BDR Training Program"
                  disabled={!isEditing}
                  className={validationErrors.name ? 'border-red-500' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetScore">Target Score (%) *</Label>
                <Input
                  id="targetScore"
                  type="number"
                  min="50"
                  max="100"
                  value={formData.targetScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetScore: parseInt(e.target.value) || 80 }))}
                  disabled={!isEditing}
                  className={validationErrors.targetScore ? 'border-red-500' : ''}
                />
                {validationErrors.targetScore && (
                  <p className="text-sm text-red-600">{validationErrors.targetScore}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Program Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the training program objectives and methodology..."
                rows={3}
                disabled={!isEditing}
                className={validationErrors.description ? 'border-red-500' : ''}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                disabled={!isEditing}
              />
              <Label htmlFor="isActive">Program is active</Label>
              <Badge variant={formData.isActive ? 'default' : 'secondary'}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Scorecard Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Scorecard Criteria</span>
              </div>
              {isEditing && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaults}
                  >
                    Reset to Defaults
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCriterion}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criterion
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationErrors.criteria && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationErrors.criteria}</AlertDescription>
              </Alert>
            )}

            {validationErrors.criteriaWeights && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationErrors.criteriaWeights}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {formData.scorecardCriteria.map((criterion, index) => (
                <div key={criterion.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Criterion {index + 1}</h4>
                    {isEditing && formData.scorecardCriteria.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriterion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Criterion Name *</Label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                        placeholder="e.g., Opening & Introduction"
                        disabled={!isEditing}
                        className={validationErrors[`criteria_${index}_name`] ? 'border-red-500' : ''}
                      />
                      {validationErrors[`criteria_${index}_name`] && (
                        <p className="text-sm text-red-600">{validationErrors[`criteria_${index}_name`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Weight (%) *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(index, 'weight', parseInt(e.target.value) || 0)}
                        disabled={!isEditing}
                        className={validationErrors[`criteria_${index}_weight`] ? 'border-red-500' : ''}
                      />
                      {validationErrors[`criteria_${index}_weight`] && (
                        <p className="text-sm text-red-600">{validationErrors[`criteria_${index}_weight`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                      placeholder="Describe what this criterion measures..."
                      rows={2}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Max Score</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={criterion.maxScore}
                        onChange={(e) => updateCriterion(index, 'maxScore', parseInt(e.target.value) || 10)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Passing Score *</Label>
                      <Input
                        type="number"
                        min="1"
                        max={criterion.maxScore}
                        value={criterion.passingScore}
                        onChange={(e) => updateCriterion(index, 'passingScore', parseInt(e.target.value) || 6)}
                        disabled={!isEditing}
                        className={validationErrors[`criteria_${index}_passing`] ? 'border-red-500' : ''}
                      />
                      {validationErrors[`criteria_${index}_passing`] && (
                        <p className="text-sm text-red-600">{validationErrors[`criteria_${index}_passing`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Criteria Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Weight:</span>
                <span className={`font-bold ${
                  Math.abs(formData.scorecardCriteria.reduce((sum, c) => sum + c.weight, 0) - 100) < 0.1
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {formData.scorecardCriteria.reduce((sum, c) => sum + c.weight, 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>Program Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require Manager Validation</Label>
                  <p className="text-sm text-gray-600">Training data requires manager approval before use</p>
                </div>
                <Switch
                  checked={formData.settings.requireManagerValidation}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, requireManagerValidation: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekly Batch Processing</Label>
                  <p className="text-sm text-gray-600">Automatically process training batches weekly</p>
                </div>
                <Switch
                  checked={formData.settings.weeklyBatchProcessing}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, weeklyBatchProcessing: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Coaching Integration</Label>
                  <p className="text-sm text-gray-600">Integrate with existing coaching evaluation system</p>
                </div>
                <Switch
                  checked={formData.settings.enableCoachingIntegration}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, enableCoachingIntegration: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Auto-Approve Threshold</Label>
                <p className="text-sm text-gray-600">
                  Confidence threshold for automatic approval (0.1 - 1.0)
                </p>
                <Input
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={formData.settings.autoApproveThreshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, autoApproveThreshold: parseFloat(e.target.value) || 0.9 }
                  }))}
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-4">
            {programId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  if (programId) loadProgram(programId);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {programId ? 'Update Program' : 'Create Program'}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}