import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  Zap,
  Tag,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Target,
  Star,
  Shield,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseECIAnalysis, getECIOverallScore, getECIEscalationRisk, hasECIAnalysis } from '@/utils/eciAnalysis';
import { useSupportMode } from '@/contexts/SupportContext';

interface Recording {
  id: string;
  title: string;
  employee_name: string;
  customer_name: string;
  content_type: string;
  status: string;
  duration: number;
  created_at: string;
  team_name: string;
  bdr_overall_score: number | null;
}

interface BulkOperation {
  id: string;
  type: 'bdr_analysis' | 'eci_analysis' | 'export' | 'tag_assignment' | 'employee_extraction';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial_success';
  progress: number;
  total: number;
  completed: number;
  errors: string[];
  result?: any;
}

interface RecordingBulkActionsProps {
  selectedRecordings: string[];
  recordings: Recording[];
  onSelectionChange: (recordingIds: string[]) => void;
  onRefresh?: () => void;
  className?: string;
}

const RecordingBulkActions: React.FC<RecordingBulkActionsProps> = ({
  selectedRecordings,
  recordings,
  onSelectionChange,
  onRefresh,
  className
}) => {
  const { toast } = useToast();
  const supportMode = useSupportMode();

  // State
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showBDRDialog, setShowBDRDialog] = useState(false);
  const [showECIDialog, setShowECIDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);

  // Export settings
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [exportFields, setExportFields] = useState<string[]>([
    'title', 'employee_name', 'customer_name', 'content_type', 'duration', 'bdr_overall_score', 'eci_overall_score', 'eci_escalation_risk', 'eci_manager_review', 'created_at'
  ]);

  // Tag settings
  const [tagOperation, setTagOperation] = useState<'add' | 'remove'>('add');
  const [tagValue, setTagValue] = useState('');

  const selectedRecordingData = recordings.filter(r => selectedRecordings.includes(r.id));

  // Bulk BDR Analysis
  const handleBulkBDRAnalysis = async () => {
    if (selectedRecordings.length === 0) return;

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: 'bdr_analysis',
      status: 'running',
      progress: 0,
      total: selectedRecordings.length,
      completed: 0,
      errors: []
    };

    setCurrentOperation(operation);
    setShowBDRDialog(false);

    try {
      // Filter to only sales calls that don't already have BDR analysis
      const eligibleRecordings = selectedRecordingData.filter(r =>
        r.content_type === 'sales_call' &&
        r.status === 'completed' &&
        !r.bdr_overall_score
      );

      if (eligibleRecordings.length === 0) {
        toast({
          title: "No eligible recordings",
          description: "All selected recordings either already have BDR analysis or are not completed sales calls",
          variant: "destructive"
        });
        setCurrentOperation(null);
        return;
      }

      operation.total = eligibleRecordings.length;

      // Process recordings in batches
      const batchSize = 3; // Process 3 at a time to avoid rate limits
      const batches = [];
      for (let i = 0; i < eligibleRecordings.length; i += batchSize) {
        batches.push(eligibleRecordings.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (recording) => {
          try {
            // Call Edge Function to trigger BDR analysis
            const { error } = await supabase.functions.invoke('evaluate-bdr-scorecard', {
              body: {
                recording_id: recording.id,
                force_reanalysis: true
              }
            });

            if (error) throw error;

            operation.completed++;
            operation.progress = Math.round((operation.completed / operation.total) * 100);
            setCurrentOperation({ ...operation });

            return { success: true, recording_id: recording.id };
          } catch (error) {
            operation.errors.push(`${recording.title}: ${error.message}`);
            operation.completed++;
            operation.progress = Math.round((operation.completed / operation.total) * 100);
            setCurrentOperation({ ...operation });

            return { success: false, recording_id: recording.id, error: error.message };
          }
        });

        await Promise.all(promises);

        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      operation.status = operation.errors.length > 0 ? 'completed' : 'completed';
      setCurrentOperation({ ...operation });

      toast({
        title: "BDR Analysis Complete",
        description: `Processed ${operation.completed} recordings with ${operation.errors.length} errors`,
        variant: operation.errors.length > 0 ? "destructive" : "default"
      });

      // Clear selection after successful operation
      if (operation.errors.length === 0) {
        onSelectionChange([]);
      }

    } catch (error) {
      operation.status = 'failed';
      operation.errors.push(`Bulk operation failed: ${error.message}`);
      setCurrentOperation({ ...operation });

      toast({
        title: "BDR Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Bulk ECI Analysis
  const handleBulkECIAnalysis = async () => {
    if (selectedRecordings.length === 0) return;

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: 'eci_analysis',
      status: 'running',
      progress: 0,
      total: selectedRecordings.length,
      completed: 0,
      errors: []
    };

    setCurrentOperation(operation);
    setShowECIDialog(false);

    try {
      // Filter to only support calls that don't already have ECI analysis
      const eligibleRecordings = selectedRecordingData.filter(r => {
        const isSupport = r.content_type === 'customer_support' || r.content_type === 'support_call';
        const hasExistingAnalysis = hasECIAnalysis(r as any);
        return isSupport && r.status === 'completed' && !hasExistingAnalysis;
      });

      if (eligibleRecordings.length === 0) {
        toast({
          title: "No eligible recordings",
          description: "All selected recordings either already have ECI analysis or are not completed support calls",
          variant: "destructive"
        });
        setCurrentOperation(null);
        return;
      }

      operation.total = eligibleRecordings.length;

      // Process recordings in batches
      const batchSize = 3; // Process 3 at a time to avoid rate limits
      const batches = [];
      for (let i = 0; i < eligibleRecordings.length; i += batchSize) {
        batches.push(eligibleRecordings.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (recording) => {
          try {
            // Call Edge Function to trigger ECI analysis
            const { error } = await supabase.functions.invoke('eci-quality-assessment', {
              body: {
                recording_id: recording.id,
                force_reanalysis: true
              }
            });

            if (error) throw error;

            operation.completed++;
            operation.progress = Math.round((operation.completed / operation.total) * 100);
            setCurrentOperation({ ...operation });

            return { success: true, recording_id: recording.id };
          } catch (error) {
            operation.errors.push(`${recording.title}: ${error.message}`);
            operation.completed++;
            operation.progress = Math.round((operation.completed / operation.total) * 100);
            setCurrentOperation({ ...operation });

            return { success: false, recording_id: recording.id, error: error.message };
          }
        });

        await Promise.all(promises);

        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      operation.status = operation.errors.length > 0 ? 'completed' : 'completed';
      setCurrentOperation({ ...operation });

      toast({
        title: "ECI Analysis Complete",
        description: `Processed ${operation.completed} recordings with ${operation.errors.length} errors`,
        variant: operation.errors.length > 0 ? "destructive" : "default"
      });

      // Clear selection after successful operation
      if (operation.errors.length === 0) {
        onSelectionChange([]);
      }

    } catch (error) {
      operation.status = 'failed';
      operation.errors.push(`Bulk operation failed: ${error.message}`);
      setCurrentOperation({ ...operation });

      toast({
        title: "ECI Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Bulk Export
  const handleBulkExport = async () => {
    if (selectedRecordings.length === 0) return;

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: 'export',
      status: 'running',
      progress: 0,
      total: selectedRecordings.length,
      completed: 0,
      errors: []
    };

    setCurrentOperation(operation);
    setShowExportDialog(false);

    try {
      // Prepare export data
      const exportData = selectedRecordingData.map(recording => {
        const row: any = {};

        // Parse ECI analysis if available
        const eciAnalysis = parseECIAnalysis(recording as any);

        exportFields.forEach(field => {
          switch (field) {
            case 'title':
              row['Title'] = recording.title;
              break;
            case 'employee_name':
              row['Employee'] = recording.employee_name;
              break;
            case 'customer_name':
              row['Customer'] = recording.customer_name;
              break;
            case 'content_type':
              row['Call Type'] = recording.content_type.replace('_', ' ');
              break;
            case 'duration':
              row['Duration (min)'] = Math.round(recording.duration / 60);
              break;
            case 'bdr_overall_score':
              row['BDR Score'] = recording.bdr_overall_score || 'N/A';
              break;
            case 'eci_overall_score':
              row['ECI Score'] = eciAnalysis ? getECIOverallScore(eciAnalysis) + '%' : 'N/A';
              break;
            case 'eci_escalation_risk':
              row['ECI Escalation Risk'] = eciAnalysis ? getECIEscalationRisk(eciAnalysis) : 'N/A';
              break;
            case 'eci_manager_review':
              row['ECI Manager Review'] = eciAnalysis ? (eciAnalysis.summary.managerReviewRequired ? 'Required' : 'Not Needed') : 'N/A';
              break;
            case 'created_at':
              row['Created Date'] = new Date(recording.created_at).toLocaleDateString();
              break;
            case 'team_name':
              row['Team'] = recording.team_name;
              break;
            default:
              row[field] = (recording as any)[field];
          }
        });

        operation.completed++;
        operation.progress = Math.round((operation.completed / operation.total) * 100);
        setCurrentOperation({ ...operation });

        return row;
      });

      // Generate file
      const csvContent = generateCSV(exportData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `recordings_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      operation.status = 'completed';
      setCurrentOperation({ ...operation });

      toast({
        title: "Export Complete",
        description: `Successfully exported ${selectedRecordings.length} recordings`
      });

      // Clear selection
      onSelectionChange([]);

    } catch (error) {
      operation.status = 'failed';
      operation.errors.push(`Export failed: ${error.message}`);
      setCurrentOperation({ ...operation });

      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    return csvContent;
  };

  // Bulk Employee Name Extraction
  const handleBulkEmployeeExtraction = async () => {
    if (selectedRecordings.length === 0) return;

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: 'employee_extraction',
      status: 'running',
      progress: 0,
      total: selectedRecordings.length,
      completed: 0,
      errors: []
    };

    setCurrentOperation(operation);
    setShowEmployeeDialog(false);

    try {
      // Filter to only recordings with transcripts
      const eligibleRecordings = selectedRecordingData.filter(r => {
        return r.transcript && r.transcript.length > 100; // Only process recordings with substantial transcripts
      });

      if (eligibleRecordings.length === 0) {
        toast({
          title: "No eligible recordings",
          description: "Selected recordings don't have transcripts available for employee name extraction",
          variant: "destructive"
        });
        setCurrentOperation(null);
        return;
      }

      operation.total = eligibleRecordings.length;

      // Process recordings one at a time to avoid rate limits
      for (const recording of eligibleRecordings) {
        try {
          // Call Edge Function to extract employee name
          const { data, error } = await supabase.functions.invoke('extract-employee-name', {
            body: {
              recording_id: recording.id
            }
          });

          if (error) throw error;

          operation.completed++;
          operation.progress = Math.round((operation.completed / operation.total) * 100);
          setCurrentOperation({ ...operation });

          console.log(`✅ Processed employee extraction for: ${recording.title}`, data);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Error processing ${recording.id}:`, error);

          // Provide more helpful error messages based on the error type
          let errorMessage = error.message;
          if (error.message.includes('No transcript available')) {
            errorMessage = 'Missing transcript data (recording needs to be processed first)';
          } else if (error.message.includes('Edge Function returned a non-2xx status code')) {
            errorMessage = 'Function error (likely missing transcript or configuration issue)';
          } else if (error.message.includes('Failed to send a request')) {
            errorMessage = 'Connection error (check if Supabase is running)';
          }

          operation.errors.push(`${recording.title}: ${errorMessage}`);
          operation.completed++;
          operation.progress = Math.round((operation.completed / operation.total) * 100);
          setCurrentOperation({ ...operation });
        }
      }

      // Complete operation
      operation.status = operation.errors.length > 0 ? 'partial_success' : 'completed';
      setCurrentOperation({ ...operation });

      const hasTranscriptErrors = operation.errors.some(error => error.includes('Missing transcript'));
      const toastMessage = operation.errors.length === 0
        ? `Successfully processed ${operation.completed} recordings`
        : hasTranscriptErrors
          ? `Processed ${operation.completed} recordings. ${operation.errors.length} recordings need transcript processing first.`
          : `Processed ${operation.completed} recordings with ${operation.errors.length} errors.`;

      toast({
        title: "Employee Name Extraction Complete",
        description: toastMessage,
        variant: operation.errors.length > 0 ? "destructive" : "default"
      });

      // Refresh data
      if (onRefresh) {
        setTimeout(() => onRefresh(), 1000);
      }

    } catch (error) {
      console.error('💥 Bulk employee extraction error:', error);
      toast({
        title: "Employee Extraction Failed",
        description: error.message,
        variant: "destructive"
      });

      if (operation) {
        operation.status = 'failed';
        setCurrentOperation({ ...operation });
      }
    }
  };

  // Clear current operation
  const clearOperation = () => {
    setCurrentOperation(null);
  };

  return (
    <>
      <Card className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200", className)}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="text-title font-semibold text-eci-gray-900">
                  {selectedRecordings.length} Recording{selectedRecordings.length !== 1 ? 's' : ''} Selected
                </h3>
                <p className="text-caption text-eci-gray-600">
                  Choose a bulk action to apply to selected recordings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={showBDRDialog} onOpenChange={setShowBDRDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Target className="h-4 w-4" />
                    BDR Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk BDR Analysis</DialogTitle>
                    <DialogDescription>
                      Trigger BDR scorecard analysis for {selectedRecordings.length} selected recordings.
                      Only completed sales calls will be processed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-caption text-blue-800">
                        <strong>Note:</strong> This will process recordings that are completed sales calls
                        and don't already have BDR analysis. Processing may take a few minutes.
                      </p>
                    </div>
                    {selectedRecordingData.filter(r => r.content_type !== 'sales_call').length > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-caption text-yellow-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {selectedRecordingData.filter(r => r.content_type !== 'sales_call').length} recordings
                          will be skipped (not sales calls)
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBDRDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkBDRAnalysis}>
                      Start Analysis
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showECIDialog} onOpenChange={setShowECIDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    ECI Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk ECI Analysis</DialogTitle>
                    <DialogDescription>
                      Trigger ECI quality framework analysis for {selectedRecordings.length} selected recordings.
                      Only completed support calls will be processed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-caption text-blue-800">
                        <strong>Note:</strong> This will process recordings that are completed support calls
                        and don't already have ECI analysis. Processing may take a few minutes.
                      </p>
                    </div>
                    {selectedRecordingData.filter(r => r.content_type !== 'customer_support' && r.content_type !== 'support_call').length > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-caption text-yellow-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {selectedRecordingData.filter(r => r.content_type !== 'customer_support' && r.content_type !== 'support_call').length} recordings
                          will be skipped (not support calls)
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowECIDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkECIAnalysis}>
                      Start Analysis
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    Extract Names
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Extract Employee Names</DialogTitle>
                    <DialogDescription>
                      Analyze transcripts to identify ECI employees for {selectedRecordings.length} selected recordings.
                      This will help properly identify which employees were on each call.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-caption text-blue-800">
                        <strong>How it works:</strong> AI analyzes call transcripts to identify ECI employee names,
                        distinguishing between company representatives and customers/prospects.
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-caption text-yellow-800">
                        <strong>Requirements:</strong> Recordings must have completed AI transcript processing first.
                        If recordings show "Missing transcript" errors, they need to be processed through the main AI pipeline.
                      </p>
                    </div>
                    {selectedRecordingData.filter(r => !r.transcript || r.transcript.length < 100).length > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-caption text-yellow-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {selectedRecordingData.filter(r => !r.transcript || r.transcript.length < 100).length} recordings
                          will be skipped (no transcript or too short)
                        </p>
                      </div>
                    )}
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-caption text-green-800">
                        <strong>Note:</strong> This will update employee names based on transcript analysis
                        and automatically assign recordings to appropriate teams.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkEmployeeExtraction}>
                      Extract Names
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Recordings</DialogTitle>
                    <DialogDescription>
                      Export {selectedRecordings.length} selected recordings to CSV format.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-caption font-medium text-eci-gray-700 mb-2 block">
                        Export Format
                      </label>
                      <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel') => setExportFormat(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV Format</SelectItem>
                          <SelectItem value="excel" disabled>Excel Format (Coming Soon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-caption font-medium text-eci-gray-700 mb-2 block">
                        Include Fields
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {[
                          { key: 'title', label: 'Title' },
                          { key: 'employee_name', label: 'Employee Name' },
                          { key: 'customer_name', label: 'Customer Name' },
                          { key: 'content_type', label: 'Call Type' },
                          { key: 'duration', label: 'Duration' },
                          { key: 'bdr_overall_score', label: 'BDR Score' },
                          { key: 'eci_overall_score', label: 'ECI Score' },
                          { key: 'eci_escalation_risk', label: 'ECI Escalation Risk' },
                          { key: 'eci_manager_review', label: 'ECI Manager Review' },
                          { key: 'created_at', label: 'Created Date' },
                          { key: 'team_name', label: 'Team' },
                        ].map((field) => (
                          <label key={field.key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={exportFields.includes(field.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExportFields([...exportFields, field.key]);
                                } else {
                                  setExportFields(exportFields.filter(f => f !== field.key));
                                }
                              }}
                            />
                            <span className="text-caption">{field.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkExport} disabled={exportFields.length === 0}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Operation Progress */}
      {currentOperation && (
        <Card className="bg-white border-2 border-blue-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {currentOperation.status === 'running' && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
                {currentOperation.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {currentOperation.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-600" />}

                <span className="font-medium">
                  {currentOperation.type === 'bdr_analysis' && 'BDR Analysis'}
                  {currentOperation.type === 'eci_analysis' && 'ECI Analysis'}
                  {currentOperation.type === 'export' && 'Export'}
                  {currentOperation.type === 'tag_assignment' && 'Tag Assignment'}
                  {currentOperation.type === 'employee_extraction' && 'Employee Name Extraction'}
                </span>

                <Badge variant={currentOperation.status === 'completed' ? 'default' : 'secondary'}>
                  {currentOperation.status}
                </Badge>
              </div>

              {currentOperation.status !== 'running' && (
                <Button variant="ghost" size="sm" onClick={clearOperation}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-caption">
                <span>{currentOperation.completed} of {currentOperation.total} completed</span>
                <span>{currentOperation.progress}%</span>
              </div>
              <Progress value={currentOperation.progress} className="w-full" />
            </div>

            {currentOperation.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-caption font-medium text-red-800 mb-1">
                  {currentOperation.errors.length} Error{currentOperation.errors.length !== 1 ? 's' : ''}:
                </p>
                <div className="max-h-20 overflow-y-auto space-y-1">
                  {currentOperation.errors.map((error, index) => (
                    <p key={index} className="text-caption text-red-700">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
};

export default RecordingBulkActions;