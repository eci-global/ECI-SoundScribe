
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: {
    start: string;
    end: string;
  };
  includeTranscripts: boolean;
  includeCoaching: boolean;
  includeInsights: boolean;
}

export function useDataExport() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportData = async (options: ExportOptions) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Fetch data based on options
      const tables = ['recordings'];
      
      if (options.includeCoaching) {
        tables.push('chat_sessions');
      }

      const exportData: any = {};

      for (const table of tables) {
        setExportProgress((tables.indexOf(table) / tables.length) * 100);
        
        const { data, error } = await supabase
          .from(table as 'recordings' | 'chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end);

        if (error) {
          throw error;
        }

        // Filter out sensitive data and format based on options
        const filteredData = data?.map(row => {
          const filtered = { ...row };
          
          if (!options.includeTranscripts && 'transcript' in filtered) {
            delete filtered.transcript;
          }
          
          if (!options.includeCoaching && 'coaching_evaluation' in filtered) {
            delete filtered.coaching_evaluation;
          }
          
          if (!options.includeInsights) {
            if ('ai_insights' in filtered) delete filtered.ai_insights;
            if ('ai_summary' in filtered) delete filtered.ai_summary;
          }
          
          return filtered;
        });

        exportData[table] = filteredData;
      }

      setExportProgress(100);

      // Format data based on requested format
      let exportContent: string;
      let mimeType: string;
      let filename: string;

      switch (options.format) {
        case 'json':
          exportContent = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          filename = `soundscribe-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'csv':
          // Convert to CSV (simplified - only recordings for now)
          const recordings = exportData.recordings || [];
          if (recordings.length === 0) {
            throw new Error('No data to export');
          }
          
          const headers = Object.keys(recordings[0]).join(',');
          const rows = recordings.map((row: any) => 
            Object.values(row).map(value => 
              typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
            ).join(',')
          );
          
          exportContent = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          filename = `soundscribe-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Create and trigger download
      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename,
        recordCount: exportData.recordings?.length || 0
      };

    } catch (error) {
      console.error('Export error:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return {
    exportData,
    isExporting,
    exportProgress
  };
}
