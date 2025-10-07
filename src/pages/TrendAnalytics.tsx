import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, Calendar, RefreshCw, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { CoachingScorecards } from '@/components/dashboard/CoachingScorecards';
import FrameworkAnalyticsDashboard from '@/components/dashboard/FrameworkAnalyticsDashboard';
import StandardLayout from '@/components/layout/StandardLayout';
import { useRecordings } from '@/hooks/useRecordings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import { useSupportMode } from '@/contexts/SupportContext';
import type { Recording } from '@/types/recording';

export default function TrendAnalytics() {
  const [activeView, setActiveView] = useState<'overview' | 'scorecards' | 'frameworks'>('overview');
  const [recordings, setRecordings] = useState<Recording[]>([]); // Initialize with empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const supportMode = useSupportMode();
  const { data: recordingsList, isLoading: recordingsLoading, error: recordingsError, refetch } = useRecordings();

  // Enhanced error handling
  useEffect(() => {
    if (recordingsError) {
      console.error('TrendAnalytics: useRecordings error:', recordingsError);
      setError(`Failed to fetch recordings: ${recordingsError.message}`);
      setLoading(false);
    }
  }, [recordingsError]);

  // Simplified data processing - use recordingsList directly and fetch additional details only when needed
  useEffect(() => {
    async function processRecordings() {
      console.log('TrendAnalytics: Processing recordings', {
        user: !!user,
        recordingsLoading,
        recordingsError: !!recordingsError,
        recordingsListLength: recordingsList?.length || 0
      });

      // Don't process if still loading or if there's an error from useRecordings
      if (recordingsLoading || recordingsError) {
        setLoading(recordingsLoading);
        return;
      }

      if (!user?.id) {
        console.log('TrendAnalytics: No authenticated user');
        setError('Please sign in to view analytics');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // If no recordings from the hook, set empty array (never undefined)
        if (!recordingsList || recordingsList.length === 0) {
          console.log('TrendAnalytics: No recordings found for user');
          setRecordings([]); // Explicitly set empty array
          setLoading(false);
          return;
        }

        // Debug: Log detailed information about recordings
        const recordingsWithCoaching = recordingsList.filter(r => 
          r.coaching_evaluation && 
          typeof r.coaching_evaluation === 'object' && 
          'overallScore' in r.coaching_evaluation
        );
        
        const recordingsWithTranscripts = recordingsList.filter(r => r.transcript);
        const recordingsWithEnableCoaching = recordingsList.filter(r => (r as any).enable_coaching);
        
        console.log('TrendAnalytics: Detailed recording analysis', {
          totalRecordings: recordingsList.length,
          withCoaching: recordingsWithCoaching.length,
          withTranscripts: recordingsWithTranscripts.length,
          withEnableCoaching: recordingsWithEnableCoaching.length,
          sampleRecord: recordingsList[0] ? {
            id: recordingsList[0].id,
            hasCoaching: !!recordingsList[0].coaching_evaluation,
            hasTranscript: !!recordingsList[0].transcript,
            enableCoaching: (recordingsList[0] as any).enable_coaching,
            status: recordingsList[0].status
          } : null
        });

        // Use recordings directly from useRecordings hook - it already has all needed fields
        console.log('TrendAnalytics: Using recordings directly from hook, no additional fetch needed');
        console.log('TrendAnalytics: Successfully processed', recordingsList.length, 'recordings');
        
        // Additional debug logging for coaching data
        const recordingsWithCoachingDebug = recordingsList.filter(r => r.coaching_evaluation);
        console.log('TrendAnalytics: Recordings with coaching evaluation:', recordingsWithCoachingDebug.length);
        if (recordingsWithCoachingDebug.length > 0) {
          console.log('TrendAnalytics: Sample coaching data:', recordingsWithCoachingDebug[0].coaching_evaluation);
        }
        
        // Transform the data to match expected interface and add any missing fields
        const transformedRecordings = recordingsList.map(recording => ({
          ...recording,
          // Ensure all required fields are present with safe defaults
          description: recording.description || '',
          file_type: recording.file_type || 'audio',
          updated_at: recording.created_at, // Use created_at as fallback for updated_at
          duration: recording.duration || 0,
          title: recording.title || 'Untitled Recording'
        }));
        
        // Ensure we always set a valid array, never undefined
        setRecordings(transformedRecordings as Recording[]);
      } catch (err) {
        console.error('TrendAnalytics: Error in processRecordings:', err);
        setError(err instanceof Error ? err.message : 'Failed to process recordings');
        // Even on error, ensure recordings is an empty array, never undefined
        setRecordings([]);
      } finally {
        setLoading(false);
      }
    }

    processRecordings();
  }, [user?.id, recordingsList, recordingsLoading, recordingsError]);

  // Set up real-time subscription for recording updates
  useEffect(() => {
    if (!user) return;

    // Check if realtime should be disabled
    const realtimeDisabled = import.meta.env.VITE_DISABLE_REALTIME === 'false';
    if (realtimeDisabled) {
      console.log('TrendAnalytics: Realtime disabled via environment variable');
      return;
    }

    
    const channelName = 'recordings_analytics';
    const channel = createSafeChannel(channelName);
    
    if (!channel) {
      console.warn('TrendAnalytics: Could not create safe channel for analytics');
      return;
    }

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time recording update:', payload);
          // Refetch data when recordings are updated
          refetch();
        }
      )
      .subscribe();

    return () => {
      removeChannel(channelName);
    };
  }, [user, refetch]);

  // Dynamic analytics views based on support mode
  const analyticsViews = React.useMemo(() => {
    if (supportMode.supportMode) {
      return [
        { id: 'overview', label: 'Support Performance Overview', icon: TrendingUp },
        { id: 'scorecards', label: 'Support Quality Scorecards', icon: BarChart3 },
        { id: 'frameworks', label: 'Support Frameworks', icon: Target }
      ];
    } else {
      return [
        { id: 'overview', label: 'Sales Performance Overview', icon: TrendingUp },
        { id: 'scorecards', label: 'Sales Coaching Scorecards', icon: BarChart3 },
        { id: 'frameworks', label: 'Sales Frameworks', icon: Target }
      ];
    }
  }, [supportMode.supportMode]);

  return (
    <StandardLayout activeSection="analytics">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-display text-eci-gray-800 flex items-center space-x-3">
                <TrendingUp className={`w-8 h-8 ${
                  supportMode.currentMode === 'support' ? 'text-blue-600' : 
                  supportMode.currentMode === 'ux' ? 'text-purple-600' : 
                  'text-eci-red'
                }`} />
                <span>{
                  supportMode.currentMode === 'support' ? 'Support Performance Analytics' : 
                  supportMode.currentMode === 'ux' ? 'UX Interview Analytics' :
                  'Sales Performance Analytics'
                }</span>
              </h1>
              <div className={`px-3 py-1 text-sm rounded-md font-medium ${
                supportMode.currentMode === 'support' ? 'bg-blue-100 text-blue-700' :
                supportMode.currentMode === 'ux' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {supportMode.currentMode === 'support' ? 'Support Mode' :
                 supportMode.currentMode === 'ux' ? 'UX Mode' :
                 'Sales Mode'}
              </div>
            </div>
            <p className="text-body-large text-eci-gray-600">
              {supportMode.currentMode === 'support' 
                ? 'Analyze support quality trends and customer service insights across your recordings'
                : supportMode.currentMode === 'ux'
                ? 'Analyze user experience interview trends and insights across your recordings'
                : 'Analyze performance trends and coaching insights across your recordings'
              }
            </p>
          </div>

          {/* View Selector */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-eci-gray-100 p-1 rounded-lg w-fit">
              {analyticsViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as 'overview' | 'scorecards' | 'frameworks')}
                  className={cn(
                    "flex items-center space-x-2 px-6 py-2 rounded-lg text-body-small font-medium transition-all duration-150",
                    activeView === view.id
                      ? "bg-white text-eci-gray-800 shadow-sm"
                      : "text-eci-gray-600 hover:text-eci-gray-800"
                  )}
                >
                  <view.icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{view.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {(loading || recordingsLoading) && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-eci-blue mr-3" />
              <span className="text-eci-gray-600">Loading analytics data...</span>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error loading analytics</span>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => {
                      console.log('TrendAnalytics: Manual retry triggered');
                      setError(null);
                      refetch();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-2"
                  >
                    Retry Loading
                  </button>
                  <div className="text-xs text-red-600 mt-2">
                    <details>
                      <summary className="cursor-pointer">Debug Info</summary>
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                        <p><strong>User:</strong> {user?.id ? 'Authenticated' : 'Not authenticated'}</p>
                        <p><strong>Recordings Hook:</strong> {recordingsLoading ? 'Loading' : recordingsError ? 'Error' : 'Success'}</p>
                        <p><strong>Recordings Count:</strong> {recordingsList?.length || 0}</p>
                        <p><strong>Error Type:</strong> {recordingsError ? 'Database Query' : 'Processing'}</p>
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !recordingsLoading && !error && (
            <>
              {activeView === 'overview' && (
                <AnalyticsDashboard recordings={recordings || []} />
              )}

              {activeView === 'scorecards' && (
                <CoachingScorecards recordings={recordings || []} />
              )}

              {activeView === 'frameworks' && (
                <FrameworkAnalyticsDashboard userId={user?.id} recordings={recordings || []} />
              )}
            </>
          )}
        </div>
      </div>
    </StandardLayout>
  );
}
