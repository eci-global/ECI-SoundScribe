import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  AlertCircle,
  CheckCircle,
  User,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmployeeReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participationId: string;
  recordingId: string;
  currentEmployee: {
    id: string;
    name: string;
  };
  detectionInfo: {
    method?: string;
    confidence?: number;
    reasoning?: string;
    detected_name?: string;
  };
  onSuccess?: () => void;
}

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  department?: string;
  role?: string;
  email: string;
  similarity_score?: number;
}

export const EmployeeReassignmentDialog: React.FC<EmployeeReassignmentDialogProps> = ({
  open,
  onOpenChange,
  participationId,
  recordingId,
  currentEmployee,
  detectionInfo,
  onSuccess
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search employees
  useEffect(() => {
    if (searchQuery.length < 2) {
      setEmployees([]);
      return;
    }

    const searchEmployees = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, department, role, email')
          .eq('status', 'active')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;

        // Calculate similarity scores for suggested employees
        const withScores = (data || []).map(emp => {
          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
          const query = searchQuery.toLowerCase();

          // Simple similarity: how much of the query matches the name
          const similarity = query.split(' ').reduce((score, word) => {
            if (fullName.includes(word)) return score + 0.5;
            if (emp.first_name.toLowerCase().startsWith(word)) return score + 0.3;
            if (emp.last_name.toLowerCase().startsWith(word)) return score + 0.3;
            return score;
          }, 0);

          return { ...emp, similarity_score: Math.min(1, similarity) };
        });

        // Sort by similarity
        withScores.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

        setEmployees(withScores);
      } catch (error) {
        console.error('Error searching employees:', error);
        toast({
          title: 'Search failed',
          description: 'Failed to search employees',
          variant: 'destructive'
        });
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, toast]);

  // Auto-suggest based on detected name
  useEffect(() => {
    if (open && detectionInfo.detected_name && !searchQuery) {
      setSearchQuery(detectionInfo.detected_name);
    }
  }, [open, detectionInfo.detected_name, searchQuery]);

  const handleReassign = async () => {
    if (!selectedEmployee) {
      toast({
        title: 'No employee selected',
        description: 'Please select an employee to reassign',
        variant: 'destructive'
      });
      return;
    }

    if (!correctionReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for the correction',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call Edge Function to reassign employee
      const { data, error } = await supabase.functions.invoke('reassign-employee-participation', {
        body: {
          participation_id: participationId,
          recording_id: recordingId,
          old_employee_id: currentEmployee.id,
          new_employee_id: selectedEmployee.id,
          reason: correctionReason.trim(),
          corrected_by: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Employee reassigned',
        description: `Successfully reassigned to ${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setSearchQuery('');
      setSelectedEmployee(null);
      setCorrectionReason('');
    } catch (error) {
      console.error('Error reassigning employee:', error);
      toast({
        title: 'Reassignment failed',
        description: error instanceof Error ? error.message : 'Failed to reassign employee',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const confidencePercent = detectionInfo.confidence
    ? Math.round(detectionInfo.confidence * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Correct Employee Assignment</DialogTitle>
          <DialogDescription>
            Reassign this recording to the correct employee. This will update the participation record and mark it as manually corrected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Detection Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Current Assignment:</div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {currentEmployee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{currentEmployee.name}</span>
                  {confidencePercent && (
                    <Badge variant="outline" className="ml-2">
                      {confidencePercent}% confidence
                    </Badge>
                  )}
                </div>
                {detectionInfo.method && (
                  <div className="text-sm text-muted-foreground">
                    Detection method: <span className="font-mono">{detectionInfo.method.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {detectionInfo.reasoning && (
                  <div className="text-sm text-muted-foreground">
                    AI reasoning: {detectionInfo.reasoning}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Employee Search */}
          <div className="space-y-2">
            <Label htmlFor="employee-search">Search for correct employee</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="employee-search"
                placeholder="Type employee name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Employee List */}
          {employees.length > 0 && (
            <div className="space-y-2">
              <Label>Select employee ({employees.length} results)</Label>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors ${
                      selectedEmployee?.id === employee.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </span>
                          {selectedEmployee?.id === employee.id && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {employee.similarity_score && employee.similarity_score > 0.5 && (
                            <Badge variant="secondary" className="text-xs">
                              Match
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {employee.email}
                        </div>
                        {employee.department && (
                          <div className="text-xs text-muted-foreground">
                            {employee.department} {employee.role && `• ${employee.role}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery.length >= 2 && employees.length === 0 && !isSearching && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No employees found matching "{searchQuery}". Try a different search term.
              </AlertDescription>
            </Alert>
          )}

          {/* Selected Employee Preview */}
          {selectedEmployee && (
            <div className="border rounded-lg p-4 bg-accent/50">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">New Assignment:</span>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployee.email}
                  </div>
                  {selectedEmployee.department && (
                    <div className="text-xs text-muted-foreground">
                      {selectedEmployee.department} {selectedEmployee.role && `• ${selectedEmployee.role}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Correction Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for correction <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this reassignment is needed (e.g., 'AI detected wrong person, correct employee is Sarah based on voice')"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedEmployee || !correctionReason.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Reassign Employee
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
