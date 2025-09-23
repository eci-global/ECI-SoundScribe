
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useImportOperations = ({ onImportCompleted }: { onImportCompleted: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImport = async (type: 'outreach' | 'vonage', credentials: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to import recordings",
        variant: "destructive"
      });
      return;
    }

    console.log(`Starting ${type} import for user:`, user.id);

    try {
      const { data, error } = await supabase.functions.invoke('import-recordings', {
        body: { 
          type,
          credentials,
          userId: user.id
        }
      });

      if (error) {
        console.error('Import error:', error);
        throw error;
      }

      if (data?.success) {
        console.log(`${type} import completed successfully`);
        onImportCompleted();
        
        toast({
          title: "Import successful",
          description: `Your ${type} recordings have been imported and are being processed`
        });
      }
    } catch (error) {
      console.error(`Import from ${type} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  return { handleImport };
};
