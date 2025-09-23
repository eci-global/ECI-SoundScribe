
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle, FileQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface OrphanedFile {
  id: string;
  recording_id: string;
  file_url: string;
  deletion_attempts: number;
  last_error: string;
  timestamp: string;
}

export function OrphanedFilesMonitor() {
  const [orphanedFiles, setOrphanedFiles] = useState<OrphanedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOrphanedFiles = async () => {
    try {
      setLoading(true);
      
      // Since admin_metrics table doesn't exist, we'll simulate the functionality
      // by checking for recordings that might have file issues
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Convert failed recordings to orphaned file format for display
      const files = recordings?.map(recording => ({
        id: recording.id,
        recording_id: recording.id,
        file_url: recording.file_url || '',
        deletion_attempts: 0,
        last_error: 'Processing failed - file may be orphaned',
        timestamp: recording.created_at
      })) || [];

      setOrphanedFiles(files);

    } catch (error) {
      console.error('Failed to load orphaned files:', error);
      toast({
        title: 'Failed to load data',
        description: 'Could not load orphaned files information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedFile = async (file: OrphanedFile) => {
    setCleaning(file.id);
    
    try {
      // Try to delete the file from storage if it exists
      if (file.file_url) {
        const url = new URL(file.file_url);
        const pathParts = url.pathname.split('/');
        const recordingsIndex = pathParts.indexOf('recordings');
        
        if (recordingsIndex !== -1 && recordingsIndex + 1 < pathParts.length) {
          const filePath = pathParts.slice(recordingsIndex + 1).join('/');
          
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove([filePath]);
          
          if (storageError) {
            console.warn('Storage deletion error:', storageError);
          }
        }
      }
      
      // Delete the failed recording record
      const { error: deleteError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', file.recording_id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      toast({
        title: 'File cleaned up',
        description: 'Failed recording and associated file have been removed'
      });
      
      // Reload the list
      await loadOrphanedFiles();
      
    } catch (error) {
      console.error('Failed to cleanup orphaned file:', error);
      toast({
        title: 'Cleanup failed',
        description: error instanceof Error ? error.message : 'Failed to remove orphaned file',
        variant: 'destructive'
      });
    } finally {
      setCleaning(null);
    }
  };

  const cleanupAllOrphaned = async () => {
    if (orphanedFiles.length === 0) {
      toast({
        title: 'No files to clean',
        description: 'No orphaned files available for cleanup',
      });
      return;
    }

    let cleaned = 0;
    let failed = 0;

    for (const file of orphanedFiles) {
      try {
        await cleanupOrphanedFile(file);
        cleaned++;
      } catch (error) {
        failed++;
      }
    }

    toast({
      title: 'Bulk cleanup completed',
      description: `Cleaned ${cleaned} files, ${failed} failed`,
    });
  };

  useEffect(() => {
    loadOrphanedFiles();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Failed Recordings Monitor</CardTitle>
              <CardDescription>
                Monitor and clean up recordings that failed to process
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadOrphanedFiles}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {orphanedFiles.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cleanupAllOrphaned}
                  disabled={cleaning !== null}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orphanedFiles.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>No failed recordings</AlertTitle>
              <AlertDescription>
                All recordings have processed successfully. No cleanup needed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed recordings detected</AlertTitle>
                <AlertDescription>
                  {orphanedFiles.length} recordings failed to process and may need cleanup.
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recording ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Error</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orphanedFiles.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-mono text-sm">
                        {file.recording_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          Failed
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {file.last_error}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(file.timestamp), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cleanupOrphanedFile(file)}
                          disabled={cleaning === file.id}
                        >
                          {cleaning === file.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
