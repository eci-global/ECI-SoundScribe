import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStorageOperations } from '@/hooks/useStorageOperations';
import { convertToRecordingArray } from '@/utils/databaseTypeUtils';
import type { Recording } from '@/types/recording';
import type { Json } from '@/integrations/supabase/types';

export interface RecordingWithUser extends Recording {
  user_email?: string;
  user_name?: string;
}

export interface RecordingManagementOptions {
  includeUserData?: boolean;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  filters?: {
    status?: string[];
    contentType?: string[];
    dateRange?: { from: string; to: string };
  };
}

export const useRecordingManagement = (options: RecordingManagementOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { deleteFile, downloadFile, getPublicUrl } = useStorageOperations();
  
  const [recordings, setRecordings] = useState<RecordingWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [processingRecordings, setProcessingRecordings] = useState<Set<string>>(new Set());

  // Fetch recordings with optional user data
  const fetchRecordings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let query = supabase
        .from('recordings')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters?.status) {
        query = query.in('status', options.filters.status);
      }
      
      if (options.filters?.contentType) {
        query = query.in('content_type', options.filters.contentType);
      }
      
      if (options.filters?.dateRange) {
        query = query
          .gte('created_at', options.filters.dateRange.from)
          .lte('created_at', options.filters.dateRange.to);
      }

      // Apply ordering
      const orderBy = options.orderBy || { column: 'created_at', ascending: false };
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      // Apply pagination
      const limit = options.limit || 50;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      
      if (error) throw error;

      // Convert database records to Recording types and add user fields
      const validRecordings = convertToRecordingArray(data || []);
      const recordingsWithUser: RecordingWithUser[] = validRecordings.map(recording => ({
        ...recording,
        user_email: '', // Would need profiles join for real user data
        user_name: ''
      }));

      setRecordings(recordingsWithUser);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recordings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [options, toast]);

  // Load recordings on mount and when options change
  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Play recording
  const playRecording = useCallback(async (recording: RecordingWithUser) => {
    if (!recording.file_url) {
      toast({
        title: "File not available",
        description: "Recording file is not accessible",
        variant: "destructive"
      });
      return;
    }

    try {
      // For now, open in new tab - could be enhanced with embedded player
      window.open(recording.file_url, '_blank');
      
      toast({
        title: "Playing recording",
        description: `Playing: ${recording.title}`
      });
    } catch (error) {
      console.error('Error playing recording:', error);
      toast({
        title: "Playback error",
        description: "Failed to play recording",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Download recording
  const downloadRecording = useCallback(async (recording: RecordingWithUser) => {
    if (!recording.file_url) {
      toast({
        title: "File not available",
        description: "Recording file is not accessible",
        variant: "destructive"
      });
      return;
    }

    try {
      // Extract path from file URL for storage operations
      const url = new URL(recording.file_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = pathParts.slice(2).join('/'); // Remove '/storage/v1/object/public/bucket-name/'
      
      await downloadFile('recordings', filePath, `${recording.title}.${fileName.split('.').pop()}`);
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Download failed",
        description: "Failed to download recording",
        variant: "destructive"
      });
    }
  }, [downloadFile, toast]);

  // Delete recording
  const deleteRecording = useCallback(async (recording: RecordingWithUser): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete recordings",
        variant: "destructive"
      });
      return false;
    }

    setProcessingRecordings(prev => new Set([...prev, recording.id]));
    
    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recording.id);

      if (dbError) throw dbError;

      // Delete file from storage if exists
      if (recording.file_url) {
        try {
          const url = new URL(recording.file_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(2).join('/');
          await deleteFile('recordings', filePath);
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
          // Don't fail the entire operation if storage deletion fails
        }
      }

      toast({
        title: "Recording deleted",
        description: `${recording.title} has been deleted successfully`
      });

      // Refresh recordings list
      fetchRecordings(currentPage);
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Delete failed',
        variant: "destructive"
      });
      return false;
    } finally {
      setProcessingRecordings(prev => {
        const next = new Set(prev);
        next.delete(recording.id);
        return next;
      });
    }
  }, [user, deleteFile, toast, fetchRecordings, currentPage]);

  // Update recording
  const updateRecording = useCallback(async (
    recordingId: string, 
    updates: Partial<Recording>
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to update recordings",
        variant: "destructive"
      });
      return false;
    }

    setProcessingRecordings(prev => new Set([...prev, recordingId]));
    
    try {
      // Convert updates to database format
      const dbUpdates: any = { ...updates };
      
      // Handle special field conversions - cast through unknown for Json compatibility
      if (updates.coaching_evaluation) {
        dbUpdates.coaching_evaluation = updates.coaching_evaluation as unknown as Json;
      }
      
      const { error } = await supabase
        .from('recordings')
        .update(dbUpdates)
        .eq('id', recordingId);

      if (error) throw error;

      toast({
        title: "Recording updated",
        description: "Recording has been updated successfully"
      });

      // Refresh recordings list
      fetchRecordings(currentPage);
      return true;
    } catch (error) {
      console.error('Error updating recording:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : 'Update failed',
        variant: "destructive"
      });
      return false;
    } finally {
      setProcessingRecordings(prev => {
        const next = new Set(prev);
        next.delete(recordingId);
        return next;
      });
    }
  }, [user, toast, fetchRecordings, currentPage]);

  // Bulk operations
  const bulkDeleteRecordings = useCallback(async (recordingIds: string[]): Promise<number> => {
    if (!user || recordingIds.length === 0) return 0;

    let successCount = 0;
    
    for (const recordingId of recordingIds) {
      const recording = recordings.find(r => r.id === recordingId);
      if (recording) {
        const success = await deleteRecording(recording);
        if (success) successCount++;
      }
    }

    if (successCount > 0) {
      setSelectedRecordings(new Set());
    }

    return successCount;
  }, [user, recordings, deleteRecording]);

  const bulkUpdateStatus = useCallback(async (
    recordingIds: string[], 
    status: Recording['status']
  ): Promise<number> => {
    if (!user || recordingIds.length === 0) return 0;

    try {
      const { error } = await supabase
        .from('recordings')
        .update({ status })
        .in('id', recordingIds);

      if (error) throw error;

      toast({
        title: "Bulk update successful",
        description: `Updated ${recordingIds.length} recordings`
      });

      fetchRecordings(currentPage);
      return recordingIds.length;
    } catch (error) {
      console.error('Error bulk updating recordings:', error);
      toast({
        title: "Bulk update failed",
        description: error instanceof Error ? error.message : 'Bulk update failed',
        variant: "destructive"
      });
      return 0;
    }
  }, [user, toast, fetchRecordings, currentPage]);

  // Selection management
  const toggleRecordingSelection = useCallback((recordingId: string) => {
    setSelectedRecordings(prev => {
      const next = new Set(prev);
      if (next.has(recordingId)) {
        next.delete(recordingId);
      } else {
        next.add(recordingId);
      }
      return next;
    });
  }, []);

  const selectAllRecordings = useCallback(() => {
    setSelectedRecordings(new Set(recordings.map(r => r.id)));
  }, [recordings]);

  const clearSelection = useCallback(() => {
    setSelectedRecordings(new Set());
  }, []);

  // Pagination
  const goToPage = useCallback((page: number) => {
    fetchRecordings(page);
  }, [fetchRecordings]);

  const nextPage = useCallback(() => {
    const limit = options.limit || 50;
    const maxPage = Math.ceil(totalCount / limit);
    if (currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalCount, options.limit, goToPage]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  return {
    // Data
    recordings,
    loading,
    totalCount,
    currentPage,
    selectedRecordings,
    processingRecordings,
    
    // Operations
    fetchRecordings,
    playRecording,
    downloadRecording,
    deleteRecording,
    updateRecording,
    
    // Bulk operations
    bulkDeleteRecordings,
    bulkUpdateStatus,
    
    // Selection
    toggleRecordingSelection,
    selectAllRecordings,
    clearSelection,
    
    // Pagination
    goToPage,
    nextPage,
    previousPage
  };
};
