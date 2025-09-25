import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram, ScorecardCriterion } from '@/types/bdr-training';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ScorecardMatrixEditorProps {
  program: BDRTrainingProgram;
  onMatrixUpdate: (updatedCriteria: ScorecardCriterion[]) => void;
}

export default function ScorecardMatrixEditor({ program, onMatrixUpdate }: ScorecardMatrixEditorProps) {
  const [criteria, setCriteria] = useState<ScorecardCriterion[]>(program.scorecard_criteria || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCriteria(program.scorecard_criteria || []);
  }, [program]);

  const handleCriterionChange = (index: number, field: keyof ScorecardCriterion, value: string | number) => {
    const updatedCriteria = [...criteria];
    updatedCriteria[index] = { ...updatedCriteria[index], [field]: value };
    setCriteria(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      { id: `new-${Date.now()}`, name: '', weight: 10, description: '' },
    ]);
  };

  const removeCriterion = (index: number) => {
    const updatedCriteria = criteria.filter((_, i) => i !== index);
    setCriteria(updatedCriteria);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('bdr_training_programs')
        .update({ scorecard_criteria: criteria })
        .eq('id', program.id)
        .select()
        .single();

      if (error) throw error;

      onMatrixUpdate(data.scorecard_criteria);
      toast.success('Scorecard matrix updated successfully!');
    } catch (error) {
      console.error('Error updating scorecard matrix:', error);
      toast.error('Failed to update scorecard matrix.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Global Scorecard Matrix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="flex items-center space-x-2 p-2 border rounded">
            <Input
              placeholder="Criterion Name"
              value={criterion.name}
              onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
              className="flex-grow"
            />
            <Input
              type="number"
              placeholder="Weight"
              value={criterion.weight}
              onChange={(e) => handleCriterionChange(index, 'weight', parseInt(e.target.value, 10))}
              className="w-24"
            />
            <Button variant="ghost" size="sm" onClick={() => removeCriterion(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={addCriterion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Criterion
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Matrix'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
