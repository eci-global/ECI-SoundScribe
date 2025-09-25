import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditScorecardModalProps {
  criterion: {
    id: string;
    name: string;
    score: number;
    feedback: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (criterionId: string, newScore: number, newFeedback: string) => void;
  isSaving: boolean;
}

export default function EditScorecardModal({
  criterion,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: EditScorecardModalProps) {
  const [score, setScore] = useState(criterion.score);
  const [feedback, setFeedback] = useState(criterion.feedback);

  const handleSave = () => {
    onSave(criterion.id, score, feedback);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Score: {criterion.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="score">Score: {score}</Label>
            <Slider
              id="score"
              min={0}
              max={4}
              step={1}
              value={[score]}
              onValueChange={(value) => setScore(value[0])}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback for this criterion..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
