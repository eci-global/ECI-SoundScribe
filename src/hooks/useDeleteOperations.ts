import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DeleteResult {
  success: boolean;
  databaseDeleted: boolean;
  storageDeleted: boolean;
  errors: string[];
}

export const useDeleteOperations = ({ onDeleteCompleted }: { onDeleteCompleted: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDelete = async (recordingId: string, fileUrl?: string): Promise<DeleteResult> => {
    const result: DeleteResult = {
      success: false,
      databaseDeleted: false,
      storageDeleted: false,
      errors: []
    };

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete recordings",
        variant: "destructive"
      });
      return result;
    }

    console.log('Starting recording deletion:', recordingId);

    try {
      // Delete related data first
      await Promise.all([
        supabase.from('speaker_segments').delete().eq('recording_id', recordingId),
        supabase.from('topic_segments').delete().eq('recording_id', recordingId),
        // AI moments are now stored in the recordings table ai_moments JSONB column, so no separate deletion needed
      ]);

      // Delete the recording itself
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        result.errors.push(`Database: ${dbError.message}`);
        throw new Error(`Failed to delete recording: ${dbError.message}`);
      }

      result.databaseDeleted = true;
      console.log('Database deletion successful');

      // Delete from storage if file exists
      if (fileUrl) {
        try {
          const url = new URL(fileUrl);
          const pathParts = url.pathname.split('/');
          const recordingsIndex = pathParts.indexOf('recordings');
          
          if (recordingsIndex !== -1 && recordingsIndex + 1 < pathParts.length) {
            const filePath = pathParts.slice(recordingsIndex + 1).join('/');
            
            console.log('Attempting to delete file from storage:', filePath);
            
            const { error: storageError } = await supabase.storage
              .from('recordings')
              .remove([filePath]);
            
            if (storageError) {
              console.warn('Storage deletion warning:', storageError);
              result.errors.push(`Storage: ${storageError.message}`);
            } else {
              result.storageDeleted = true;
              console.log('Storage deletion successful');
            }
          }
        } catch (storageError) {
          console.error('Storage delete error:', storageError);
          result.errors.push(`Storage: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
        }
      }

      result.success = result.databaseDeleted;
      console.log('Recording deletion completed:', result);
      
      onDeleteCompleted();
      
      // Show appropriate toast
      if (result.storageDeleted || !fileUrl) {
        toast({
          title: "Recording deleted",
          description: "The recording and all associated data have been permanently deleted"
        });
      } else {
        toast({
          title: "Recording partially deleted",
          description: "The recording data was deleted, but there may be storage cleanup needed.",
          variant: "default"
        });
      }

      return result;
    } catch (error) {
      console.error('Delete operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      result.errors.push(errorMessage);
      return result;
    }
  };

  return { handleDelete };
};
