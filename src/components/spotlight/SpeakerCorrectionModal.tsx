
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/recording';

interface SpeakerData {
  originalName: string;
  correctedName: string;
  segmentCount: number;
  confidence: number;
}

interface SpeakerCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording: Recording;
  speakers: SpeakerData[];
  onSpeakersUpdated?: () => void;
}

export default function SpeakerCorrectionModal({
  isOpen,
  onClose,
  recording,
  speakers,
  onSpeakersUpdated
}: SpeakerCorrectionModalProps) {
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Initialize corrections with current speaker names
    const initialCorrections: Record<string, string> = {};
    speakers.forEach(speaker => {
      initialCorrections[speaker.originalName] = speaker.correctedName || speaker.originalName;
    });
    setCorrections(initialCorrections);
  }, [speakers]);

  const handleCorrectionChange = (originalName: string, newName: string) => {
    setCorrections(prev => ({
      ...prev,
      [originalName]: newName
    }));
  };

  const applySpeakerCorrections = async () => {
    setLoading(true);
    setError(null);

    try {
      // Update speaker segments with corrected names
      const updates = Object.entries(corrections).map(async ([originalName, correctedName]) => {
        if (originalName !== correctedName) {
          const { error } = await supabase
            .from('speaker_segments')
            .update({ speaker_name: correctedName })
            .eq('recording_id', recording.id)
            .eq('speaker_name', originalName);

          if (error) throw error;
        }
      });

      await Promise.all(updates);

      // Update the recording metadata to track speaker corrections
      const speakerMapping = Object.fromEntries(
        Object.entries(corrections).filter(([original, corrected]) => original !== corrected)
      );

      if (Object.keys(speakerMapping).length > 0) {
        // Store speaker corrections in the recording's metadata
        const { error: recordingError } = await supabase
          .from('recordings')
          .update({
            updated_at: new Date().toISOString(),
            // Note: We can't update ai_speaker_analysis as it doesn't exist in the current schema
            // Instead, we'll store this information in the description or create a new field
            description: recording.description + 
              (recording.description ? '\n\n' : '') +
              `Speaker corrections applied: ${JSON.stringify(speakerMapping)}`
          })
          .eq('id', recording.id);

        if (recordingError) throw recordingError;
      }

      onSpeakersUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error applying speaker corrections:', err);
      setError('Failed to apply speaker corrections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = Object.entries(corrections).some(
    ([original, corrected]) => original !== corrected
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Correct Speaker Names</span>
          </DialogTitle>
          <DialogDescription>
            Review and correct the automatically detected speaker names. Changes will be applied to all segments for each speaker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {speakers.map((speaker) => (
              <div key={speaker.originalName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {speaker.originalName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {speaker.originalName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {speaker.segmentCount} segments
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {Math.round(speaker.confidence * 100)}% confidence
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`correction-${speaker.originalName}`}>
                    Corrected Name
                  </Label>
                  <Input
                    id={`correction-${speaker.originalName}`}
                    value={corrections[speaker.originalName] || ''}
                    onChange={(e) => handleCorrectionChange(speaker.originalName, e.target.value)}
                    placeholder="Enter correct speaker name"
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {hasChanges ? 'You have unsaved changes' : 'No changes to apply'}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={applySpeakerCorrections} 
                disabled={!hasChanges || loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Applying...' : 'Apply Corrections'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
