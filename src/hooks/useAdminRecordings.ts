import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminRecording {
  id: string;
  title: string;
  user_id: string;
  status: string;
  created_at: string;
  file_size: number;
  file_type: string;
  user_email: string;
  user_name: string;
}

export function useAdminRecordings() {
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<AdminRecording[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllRecordings = async () => {
      setLoading(true);
      try {
        // Simplified query – fetch only the recordings table; profiles join removed to avoid RLS errors
        const { data, error } = await supabase
          .from('recordings')
          .select(`
            id,
            title,
            user_id,
            status,
            created_at,
            file_size,
            file_type
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Cast to AdminRecording shape with empty user fields for now
        const safeData: AdminRecording[] = (data || []).map(r => ({
          ...r,
          user_email: '',
          user_name: ''
        })) as AdminRecording[];

        setRecordings(safeData);
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
    };

    fetchAllRecordings();
  }, [toast]);

  return { recordings, loading };
}
