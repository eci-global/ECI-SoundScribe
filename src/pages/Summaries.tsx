
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import SpotlightPage from '@/components/spotlight/SpotlightPage';
import GongLayout from '@/components/layout/GongLayout';
import { GongNavSection } from '@/components/navigation/GongTopNav';
import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/recording';

export default function Summaries() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the timestamp parameter from URL
  const timestampParam = searchParams.get('t');
  const startTime = timestampParam ? parseInt(timestampParam, 10) : undefined;

  useEffect(() => {
    const fetchRecording = async () => {
      console.log('Fetching recording with ID:', id);
      
      if (!id) {
        console.log('No ID provided, showing page without recording');
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { data, error } = await supabase
          .from('recordings')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        if (data) {
          const recordingData: Recording = {
            ...data,
            file_type: (data.file_type as 'audio' | 'video') || 'audio',
            status: (data.status as 'uploading' | 'processing' | 'completed' | 'failed') || 'completed',
            coaching_evaluation: data.coaching_evaluation 
              ? (typeof data.coaching_evaluation === 'string' 
                  ? JSON.parse(data.coaching_evaluation) 
                  : data.coaching_evaluation) as any
              : undefined
          };
          
          console.log('Recording loaded:', recordingData);
          
          // Enable coaching by default if not set
          if (recordingData.enable_coaching === undefined || recordingData.enable_coaching === null) {
            const { error: updateError } = await supabase
              .from('recordings')
              .update({ enable_coaching: true })
              .eq('id', id);
              
            if (!updateError) {
              recordingData.enable_coaching = true;
            }
          }
          
          setRecording(recordingData);
        } else {
          console.log('No recording found with ID:', id);
          setError('Recording not found');
        }
      } catch (error) {
        console.error('Error fetching recording:', error);
        setError('Failed to load recording');
      } finally {
        setLoading(false);
      }
    };

    fetchRecording();
  }, [id]);

  // Function to refresh recording data (e.g., after coaching generation)
  const refreshRecording = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        const recordingData: Recording = {
          ...data,
          file_type: (data.file_type as 'audio' | 'video') || 'audio',
          status: (data.status as 'uploading' | 'processing' | 'completed' | 'failed') || 'completed',
          coaching_evaluation: data.coaching_evaluation 
            ? (typeof data.coaching_evaluation === 'string' 
                ? JSON.parse(data.coaching_evaluation) 
                : data.coaching_evaluation) as any
            : undefined
        };
        
        setRecording(recordingData);
        console.log('Recording refreshed with updated data');
      }
    } catch (error) {
      console.error('Error refreshing recording:', error);
    }
  };

  const handleNavigate = (section: GongNavSection) => {
    console.log('Navigating to section:', section);
    // Navigate to different sections while maintaining the layout
    switch (section) {
      case 'dashboard':
        navigate('/');
        break;
      case 'uploads':
        navigate('/uploads');
        break;
      case 'processing':
        navigate('/uploads?tab=queue');
        break;
      case 'assistant':
        navigate('/AssistantCoach');
        break;
      case 'summaries':
        navigate('/outreach/recordings');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'help':
        navigate('/help');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <GongLayout
        activeSection="summaries"
        onNavigate={handleNavigate}
      >
        <div className="min-h-screen bg-brand-light-gray flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto"></div>
            <p className="mt-2 text-body text-eci-gray-600">Loading recording...</p>
          </div>
        </div>
      </GongLayout>
    );
  }

  if (error) {
    return (
      <GongLayout
        activeSection="summaries"
        onNavigate={handleNavigate}
      >
        <div className="min-h-screen bg-brand-light-gray flex items-center justify-center">
          <div className="text-center">
            <p className="text-body text-eci-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/summaries')}
              className="text-brand-red hover:text-eci-red-dark"
            >
              View all summaries
            </button>
          </div>
        </div>
      </GongLayout>
    );
  }

  return (
    <GongLayout
      activeSection="summaries"
      onNavigate={handleNavigate}
    >
      <SpotlightPage recording={recording} startTime={startTime} onRecordingUpdate={refreshRecording} />
    </GongLayout>
  );
}
