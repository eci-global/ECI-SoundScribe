
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Calendar, FileText, Database, Users } from 'lucide-react';
import { useDataExport, ExportOptions } from '@/hooks/useDataExport';
import { toast } from 'sonner';
import type { CheckedState } from '@radix-ui/react-checkbox';

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataExportDialog({ open, onOpenChange }: DataExportDialogProps) {
  const { exportData, isExporting, exportProgress } = useDataExport();
  
  const [selectedTable, setSelectedTable] = useState<string>('recordings');
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');
  const [includeTranscripts, setIncludeTranscripts] = useState(true);
  const [includeCoaching, setIncludeCoaching] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const tableOptions = [
    { value: 'recordings', label: 'Recordings', icon: FileText },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'chat_sessions', label: 'Chat Sessions', icon: Database }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'xlsx', label: 'Excel' }
  ];

  const handleExport = async () => {
    try {
      const options: ExportOptions = {
        format: selectedFormat,
        dateRange: dateRange,
        includeTranscripts,
        includeCoaching,
        includeInsights
      };

      const result = await exportData(options);
      toast.success(`Export completed: ${result.filename}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const handleCheckboxChange = (setter: (value: boolean) => void) => {
    return (checked: CheckedState) => {
      setter(checked === true);
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={selectedFormat} onValueChange={(value: 'csv' | 'json' | 'xlsx') => setSelectedFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          {/* Data Options */}
          <div className="space-y-3">
            <Label>Include Data</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="transcripts"
                checked={includeTranscripts}
                onCheckedChange={handleCheckboxChange(setIncludeTranscripts)}
              />
              <Label htmlFor="transcripts" className="text-sm">
                Transcripts
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="coaching"
                checked={includeCoaching}
                onCheckedChange={handleCheckboxChange(setIncludeCoaching)}
              />
              <Label htmlFor="coaching" className="text-sm">
                Coaching Evaluations
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="insights"
                checked={includeInsights}
                onCheckedChange={handleCheckboxChange(setIncludeInsights)}
              />
              <Label htmlFor="insights" className="text-sm">
                AI Insights
              </Label>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <Label>Export Progress</Label>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{exportProgress}% complete</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
