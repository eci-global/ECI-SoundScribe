import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeleteStats {
  recording: boolean;
  storage: boolean;
  embeddings: number;
  chatSessions: number;
  chatMessages: number;
  aiMoments: number;
  speakerSegments: number;
  topicSegments: number;
  errors: string[];
}

interface ComprehensiveDeleteResult {
  success: boolean;
  message: string;
  stats: DeleteStats;
}

export const useComprehensiveDelete = ({ onDeleteCompleted }: { onDeleteCompleted: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleComprehensiveDelete = async (recordingId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete recordings",
        variant: "destructive"
      });
      return false;
    }

    setIsDeleting(true);
    console.log('Starting comprehensive deletion for recording:', recordingId);

    try {
      // Call the comprehensive-delete Edge Function
      const { data, error } = await supabase.functions.invoke('comprehensive-delete', {
        body: {
          recording_id: recordingId,
          force: true // Allow partial deletion if some parts fail
        }
      });

      if (error) {
        console.error('Comprehensive delete function error:', error);
        throw new Error(error.message || 'Failed to call delete function');
      }

      const result = data as ComprehensiveDeleteResult;
      console.log('Comprehensive deletion result:', result);

      if (result.success) {
        // Show detailed success message
        const deletedItems = [];
        if (result.stats.embeddings > 0) deletedItems.push(`${result.stats.embeddings} embeddings`);
        if (result.stats.chatSessions > 0) deletedItems.push(`${result.stats.chatSessions} chat sessions`);
        if (result.stats.aiMoments > 0) deletedItems.push(`${result.stats.aiMoments} AI moments`);
        if (result.stats.speakerSegments > 0) deletedItems.push(`${result.stats.speakerSegments} speaker segments`);
        if (result.stats.topicSegments > 0) deletedItems.push(`${result.stats.topicSegments} topic segments`);

        const detailMessage = deletedItems.length > 0 
          ? `Recording and associated data deleted: ${deletedItems.join(', ')}`
          : 'Recording deleted successfully';

        toast({
          title: "Recording deleted",
          description: detailMessage
        });

        onDeleteCompleted();
        return true;
      } else {
        // Partial success or failure
        const errorCount = result.stats.errors.length;
        toast({
          title: "Deletion partially completed",
          description: `${result.message}. ${errorCount} errors occurred.`,
          variant: errorCount > 0 ? "destructive" : "default"
        });

        // Still call onDeleteCompleted if the main recording was deleted
        if (result.stats.recording) {
          onDeleteCompleted();
        }
        
        return result.stats.recording;
      }
    } catch (error) {
      console.error('Comprehensive delete operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { 
    handleComprehensiveDelete, 
    isDeleting 
  };
}; 