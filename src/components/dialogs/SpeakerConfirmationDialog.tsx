import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Mic, 
  Volume2,
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SpeakerIdentificationService, type IdentifiedSpeaker, type ConfirmedSpeaker } from '@/services/speakerIdentificationService';
import { EmployeeService } from '@/services/employeeService';
import type { Recording } from '@/types/recording';
import type { Employee } from '@/types/employee';

interface SpeakerConfirmationDialogProps {
  recording: Recording;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedSpeakers: ConfirmedSpeaker[]) => void;
}

export default function SpeakerConfirmationDialog({
  recording,
  isOpen,
  onClose,
  onConfirm
}: SpeakerConfirmationDialogProps) {
  const [identifiedSpeakers, setIdentifiedSpeakers] = useState<IdentifiedSpeaker[]>([]);
  const [confirmedSpeakers, setConfirmedSpeakers] = useState<ConfirmedSpeaker[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && recording) {
      loadSpeakerData();
    }
  }, [isOpen, recording]);

  const loadSpeakerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create speaker confirmation data
      const confirmationData = await SpeakerIdentificationService.createSpeakerConfirmationData(recording);
      setIdentifiedSpeakers(confirmationData.identifiedSpeakers);

      // Load available employees for matching
      const employees = await EmployeeService.getEmployees();
      setAvailableEmployees(employees.employees.map(e => e.employee));

      // Initialize confirmed speakers
      const initialConfirmed: ConfirmedSpeaker[] = confirmationData.identifiedSpeakers.map(speaker => ({
        id: speaker.id,
        name: speaker.name,
        isEmployee: speaker.isEmployee || false,
        employeeId: speaker.employeeId,
        voiceCharacteristics: speaker.voiceCharacteristics
      }));
      setConfirmedSpeakers(initialConfirmed);

    } catch (error) {
      console.error('Error loading speaker data:', error);
      setError('Failed to load speaker data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakerNameChange = (speakerId: string, newName: string) => {
    setConfirmedSpeakers(prev => prev.map(speaker => 
      speaker.id === speakerId 
        ? { ...speaker, name: newName, isEmployee: false, employeeId: undefined }
        : speaker
    ));
  };

  const handleEmployeeToggle = (speakerId: string, isEmployee: boolean) => {
    setConfirmedSpeakers(prev => prev.map(speaker => 
      speaker.id === speakerId 
        ? { ...speaker, isEmployee, employeeId: isEmployee ? speaker.employeeId : undefined }
        : speaker
    ));
  };

  const handleEmployeeSelect = (speakerId: string, employeeId: string) => {
    const selectedEmployee = availableEmployees.find(emp => emp.id === employeeId);
    setConfirmedSpeakers(prev => prev.map(speaker => 
      speaker.id === speakerId 
        ? { 
            ...speaker, 
            isEmployee: true, 
            employeeId,
            name: selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : speaker.name
          }
        : speaker
    ));
  };

  const handleAddSpeaker = () => {
    const newSpeaker: ConfirmedSpeaker = {
      id: `manual-${Date.now()}`,
      name: '',
      isEmployee: false
    };
    setConfirmedSpeakers(prev => [...prev, newSpeaker]);
  };

  const handleRemoveSpeaker = (speakerId: string) => {
    setConfirmedSpeakers(prev => prev.filter(speaker => speaker.id !== speakerId));
  };

  const handleConfirm = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate that all speakers have names
      const invalidSpeakers = confirmedSpeakers.filter(speaker => !speaker.name.trim());
      if (invalidSpeakers.length > 0) {
        setError('Please provide names for all speakers.');
        return;
      }

      // Save confirmed speakers
      await SpeakerIdentificationService.saveConfirmedSpeakers(recording.id, confirmedSpeakers);
      
      // Call the onConfirm callback
      onConfirm(confirmedSpeakers);
      
      // Close dialog
      onClose();

    } catch (error) {
      console.error('Error saving confirmed speakers:', error);
      setError('Failed to save speaker confirmations. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSpeakerSourceIcon = (source: string) => {
    switch (source) {
      case 'title':
        return <MessageSquare className="w-4 h-4" />;
      case 'transcript':
        return <Volume2 className="w-4 h-4" />;
      case 'ai_analysis':
        return <Mic className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getSpeakerSourceColor = (source: string) => {
    switch (source) {
      case 'title':
        return 'bg-blue-100 text-blue-800';
      case 'transcript':
        return 'bg-green-100 text-green-800';
      case 'ai_analysis':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Confirm Speakers
          </DialogTitle>
          <DialogDescription>
            Review and confirm the speakers identified in "{recording.title}". 
            You can add them as employees to improve future speaker identification.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading speaker data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identified Speakers Section */}
            {identifiedSpeakers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identified Speakers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {identifiedSpeakers.map((speaker) => (
                      <div key={speaker.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getSpeakerSourceIcon(speaker.source)}
                          <Badge className={getSpeakerSourceColor(speaker.source)}>
                            {speaker.source}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{speaker.name}</span>
                          {speaker.isEmployee && (
                            <Badge variant="outline" className="ml-2">
                              Employee
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Confidence: {Math.round(speaker.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Speaker Confirmation Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Confirm Speaker Details</CardTitle>
                  <Button onClick={handleAddSpeaker} variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Speaker
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {confirmedSpeakers.map((speaker, index) => (
                    <div key={speaker.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Speaker {index + 1}</Label>
                        {confirmedSpeakers.length > 1 && (
                          <Button
                            onClick={() => handleRemoveSpeaker(speaker.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${speaker.id}`}>Name</Label>
                          <Input
                            id={`name-${speaker.id}`}
                            value={speaker.name}
                            onChange={(e) => handleSpeakerNameChange(speaker.id, e.target.value)}
                            placeholder="Enter speaker name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`employee-${speaker.id}`}
                              checked={speaker.isEmployee}
                              onCheckedChange={(checked) => handleEmployeeToggle(speaker.id, !!checked)}
                            />
                            <Label htmlFor={`employee-${speaker.id}`}>Is Employee</Label>
                          </div>
                          
                          {speaker.isEmployee && (
                            <Select
                              value={speaker.employeeId || ''}
                              onValueChange={(value) => handleEmployeeSelect(speaker.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableEmployees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.first_name} {employee.last_name}
                                    {employee.department && ` (${employee.department})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button onClick={onClose} variant="outline" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={saving || confirmedSpeakers.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Speakers
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
