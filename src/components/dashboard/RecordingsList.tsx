
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Play, MessageSquare, Download, Clock, Calendar, Trash2, FileDown, RefreshCw, Pause, FileAudio, FileVideo, Sparkles, MoreVertical, Zap, CheckCircle, XCircle, AlertCircle, Send, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportRecordingToPDF } from '@/utils/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { useOutreachIntegration } from '@/hooks/useOutreachIntegration';
import LiveDuration from '@/components/ui/LiveDuration';
import type { Recording } from '@/types/recording';

interface RecordingsListProps {
  recordings: Recording[];
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onDeleteRecording: (recordingId: string, fileUrl?: string) => void;
  onRegenerateSummary?: (recordingId: string, newSummary: string) => void;
  onViewDetails?: (recording: Recording) => void;
}

export default function RecordingsList({ 
  recordings, 
  onPlayRecording, 
  onChatWithRecording, 
  onDeleteRecording,
  onRegenerateSummary,
  onViewDetails
}: RecordingsListProps) {
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [syncingRecordings, setSyncingRecordings] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();
  const { isConnected, syncRecording, getSyncStatus } = useOutreachIntegration();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'processing': return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'uploading': return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleExportToPDF = async (recording: Recording) => {
    try {
      const filename = exportRecordingToPDF(recording, {
        includeTranscript: true,
        includeSummary: true,
        includeMetadata: true,
      });
      
      toast({
        title: "Export Successful",
        description: `Recording exported as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export recording to PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePlayClick = async (recording: Recording) => {
    if (playingRecording === recording.id) {
      setPlayingRecording(null);
    } else {
      setPlayingRecording(recording.id);
    }
    onPlayRecording(recording);
  };

  const handleSyncToOutreach = async (e: React.MouseEvent, recording: Recording) => {
    e.stopPropagation();
    
    if (!isConnected) {
      toast({
        title: "Outreach Not Connected",
        description: "Please connect your Outreach account first",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/integrations/outreach/connect'}
          >
            Connect Now
          </Button>
        )
      });
      return;
    }

    // Add to syncing set
    setSyncingRecordings(prev => new Set(prev).add(recording.id));

    try {
      await syncRecording(recording.id);
      
      // Update sync status
      const status = await getSyncStatus(recording.id);
      setSyncStatus(prev => new Map(prev).set(recording.id, status));
      
      toast({
        title: "Sync Successful",
        description: `"${recording.title}" has been synced to Outreach`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync recording to Outreach",
        variant: "destructive"
      });
    } finally {
      // Remove from syncing set
      setSyncingRecordings(prev => {
        const newSet = new Set(prev);
        newSet.delete(recording.id);
        return newSet;
      });
    }
  };

  // Load sync status for recordings
  useEffect(() => {
    const loadSyncStatus = async () => {
      if (!isConnected) return;
      
      for (const recording of recordings) {
        const status = await getSyncStatus(recording.id);
        if (status) {
          setSyncStatus(prev => new Map(prev).set(recording.id, status));
        }
      }
    };
    
    loadSyncStatus();
  }, [recordings, isConnected, getSyncStatus]);

  if (recordings.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-eci-blue/10 to-purple-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <FileAudio className="h-16 w-16 text-eci-blue/60" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No recordings yet</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Upload your first audio or video file to get started with transcription and intelligent Q&A
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Automatic transcription</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Smart summaries</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Q&A chat</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {recordings.map((recording) => (
        <Card 
          key={recording.id}
          className={cn(
            'group relative overflow-hidden transition-all duration-300',
            'bg-white hover:bg-gray-50/50',
            'border border-gray-200 hover:border-gray-300',
            'hover:shadow-lg hover:-translate-y-0.5',
            'cursor-pointer'
          )}
          onClick={() => onViewDetails?.(recording)}
        >
          {/* Status indicator */}
          <div className={cn(
            'absolute top-0 left-0 right-0 h-1',
            recording.status === 'completed' && 'bg-gradient-to-r from-green-400 to-emerald-500',
            recording.status === 'processing' && 'bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse',
            recording.status === 'uploading' && 'bg-gradient-to-r from-blue-400 to-indigo-500 animate-pulse',
            recording.status === 'failed' && 'bg-gradient-to-r from-red-400 to-rose-500'
          )} />

          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {recording.file_type === 'video' ? (
                    <FileVideo className="w-4 h-4 text-gray-500" />
                  ) : (
                    <FileAudio className="w-4 h-4 text-gray-500" />
                  )}
                  <CardTitle className="text-base font-semibold line-clamp-1">
                    {recording.title}
                  </CardTitle>
                </div>
                {recording.description && (
                  <CardDescription className="mt-1 line-clamp-2 text-sm">
                    {recording.description}
                  </CardDescription>
                )}
              </div>
              
              {/* More options menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(showMenu === recording.id ? null : recording.id);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                
                {showMenu === recording.id && (
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    {isConnected && recording.status === 'completed' && (
                      <>
                        <button
                          onClick={(e) => handleSyncToOutreach(e, recording)}
                          disabled={syncingRecordings.has(recording.id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 text-blue-600 disabled:opacity-50"
                        >
                          {syncingRecordings.has(recording.id) ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Sync to Outreach
                            </>
                          )}
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportToPDF(recording);
                        setShowMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Export as PDF
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-600">⚠️ Permanently Delete Recording</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3">
                            <p className="font-semibold text-gray-900">
                              You are about to permanently delete "{recording.title}"
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                              <p className="text-sm text-red-800 font-medium">This will permanently remove:</p>
                              <ul className="text-sm text-red-700 space-y-1 ml-4">
                                <li>• The audio/video file from storage</li>
                                <li>• All transcripts and summaries</li>
                                <li>• AI-generated insights and coaching feedback</li>
                                <li>• Chat conversations about this recording</li>
                                <li>• Analytics data and speaker segments</li>
                              </ul>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">
                              This action cannot be undone. The recording cannot be recovered.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-medium">Keep Recording</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              onDeleteRecording(recording.id, recording.file_url);
                              setShowMenu(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 font-medium"
                          >
                            Yes, Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <LiveDuration 
                recordingId={recording.id}
                className="flex items-center gap-1"
                showIcon={true}
                fallbackDuration={recording.duration}
              />
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
              </span>
              <Badge 
                className={cn(
                  getStatusColor(recording.status),
                  'border text-xs px-2 py-0.5'
                )} 
                variant="secondary"
              >
                {recording.status}
              </Badge>
              
              {/* Outreach sync status */}
              {isConnected && recording.status === 'completed' && (
                <div className="flex items-center gap-1">
                  {syncingRecordings.has(recording.id) ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-blue-600">Syncing</span>
                    </>
                  ) : syncStatus.get(recording.id) ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Synced</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3 h-3 text-gray-400" />
                      <span>Not synced</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Summary preview - Show even if processing */}
            {(recording.summary || recording.ai_summary) && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-eci-blue" />
                  <span className="text-xs font-medium text-gray-700">
                    {recording.status === 'processing' ? 'Processing Summary...' : 'Summary'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-3">
                  {recording.ai_summary || recording.summary || 'Processing your recording...'}
                </p>
              </div>
            )}

            {/* Processing status for uploads without summary yet */}
            {!recording.summary && !recording.ai_summary && recording.status === 'processing' && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                  <span className="text-xs font-medium text-amber-700">Processing</span>
                </div>
                <p className="text-xs text-amber-600">
                  Your recording is being transcribed and analyzed. This may take a few minutes.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {recording.status === 'completed' && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(recording);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-eci-blue hover:text-white hover:border-eci-blue transition-all"
                  >
                    {playingRecording === recording.id ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChatWithRecording(recording);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </>
              )}
              {recording.status === 'processing' && (
                <div className="flex-1 text-center py-2">
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="text-sm">Processing</span>
                  </div>
                </div>
              )}
              {recording.status === 'uploading' && (
                <div className="flex-1 text-center py-2">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Uploading</span>
                  </div>
                </div>
              )}
              {recording.status === 'failed' && (
                <div className="flex-1 text-center py-2">
                  <span className="text-sm text-red-600">Failed to process</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
