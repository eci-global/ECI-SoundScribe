import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Play, Eye, FileText, Clock, Calendar, User, MoreVertical, Upload, Trash2, Check, X, Settings } from 'lucide-react';
import { useRecordings } from '@/hooks/useRecordings';
import { useComprehensiveDelete } from '@/hooks/useComprehensiveDelete';
import StandardLayout from '@/components/layout/StandardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/mediaDuration';
import type { Recording } from '@/types/recording';

export default function OutreachRecordingsList() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  
  // Get user's recordings
  const { data: recordingsData = [], isLoading, error, refetch } = useRecordings({});
  
  // Comprehensive delete operations hook
  const { handleComprehensiveDelete, isDeleting } = useComprehensiveDelete({
    onDeleteCompleted: () => {
      refetch(); // Refresh the recordings list after deletion
    }
  });

  const handleRecordingClick = (recordingId: string) => {
    navigate(`/outreach/recordings/${recordingId}`);
  };

  const handleUploadClick = () => {
    navigate('/uploads');
  };

  const handleDeleteClick = (recording: Recording, event: React.MouseEvent) => {
    event.stopPropagation();
    setRecordingToDelete(recording);
    setDeleteDialogOpen(true);
    setShowMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;
    
    try {
      const success = await handleComprehensiveDelete(recordingToDelete.id);
      if (success) {
        setDeleteDialogOpen(false);
        setRecordingToDelete(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      // Error handling is done in the hook
    }
  };

  // Selection handlers
  const handleSelectRecording = (recordingId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecordings);
    if (checked) {
      newSelected.add(recordingId);
    } else {
      newSelected.delete(recordingId);
    }
    setSelectedRecordings(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordings(new Set(recordingsData.map(r => r.id)));
    } else {
      setSelectedRecordings(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedRecordings.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedRecordings.size === 0) return;
    
    try {
      const recordingIds = Array.from(selectedRecordings);
      let successCount = 0;
      
      for (const recordingId of recordingIds) {
        const success = await handleComprehensiveDelete(recordingId);
        if (success) {
          successCount++;
        }
      }
      
      setBulkDeleteDialogOpen(false);
      setSelectedRecordings(new Set());
      
      if (successCount === recordingIds.length) {
        // All deletions successful
      } else {
        // Some deletions failed - the hook will handle error notifications
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const clearSelection = () => {
    setSelectedRecordings(new Set());
  };


  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'uploading':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <StandardLayout activeSection="summaries">
      <div className="min-h-screen bg-brand-light-gray flex items-center justify-center">
        <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-eci-gray-600 mb-4" />
            <p className="text-body text-eci-gray-600">Loading recordings...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }
  
  // If there's an error, show error state
  if (error) {
    return (
      <StandardLayout activeSection="summaries">
      <div className="min-h-screen bg-brand-light-gray flex items-center justify-center">
        <div className="text-center">
          <p className="text-body text-eci-gray-600 mb-4">
              Failed to load recordings. Please try again.
          </p>
            <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
      </StandardLayout>
    );
  }
  
  // If no recordings exist, show empty state
  if (recordingsData.length === 0) {
    return (
      <StandardLayout activeSection="summaries">
        <div className="min-h-screen bg-brand-light-gray">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-eci-gray-900 mb-2">
                Outreach Recordings
              </h1>
              <p className="text-eci-gray-600">
                AI-powered insights from your call recordings
              </p>
            </div>

            {/* Empty State */}
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-eci-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-eci-gray-900 mb-2">
                  No Recordings Found
                </h3>
                <p className="text-eci-gray-600 mb-6">
                  You don't have any recordings yet. Upload a recording to get started with AI-powered insights.
                </p>
                <Button onClick={handleUploadClick} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Recording
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout activeSection="summaries">
      <div className="min-h-screen bg-brand-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-eci-gray-900 mb-2">
                Outreach Recordings
              </h1>
              <p className="text-eci-gray-600">
                AI-powered insights from your call recordings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {recordingsData.length} recordings
              </Badge>
              <Button 
                onClick={() => navigate('/integrations/outreach/connect')} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Outreach Setup
              </Button>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleUploadClick}>
                <Upload className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedRecordings.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedRecordings.size} recording{selectedRecordings.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedRecordings.size})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recordings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Your Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedRecordings.size === recordingsData.length && recordingsData.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all recordings"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>AI Summary</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordingsData.map((recording) => (
                    <TableRow 
                      key={recording.id}
                      className="cursor-pointer hover:bg-eci-gray-50 group"
                      onClick={() => handleRecordingClick(recording.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRecordings.has(recording.id)}
                          onCheckedChange={(checked) => 
                            handleSelectRecording(recording.id, checked as boolean)
                          }
                          aria-label={`Select ${recording.title || 'recording'}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-eci-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-eci-blue-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-eci-gray-900 truncate">
                              {recording.title || 'Untitled Recording'}
                            </p>
                            {recording.description && (
                              <p className="text-xs text-eci-gray-500 truncate">
                                {recording.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getStatusColor(recording.status))}
                        >
                          {recording.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-eci-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatDuration(recording.duration)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-eci-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {recording.ai_summary ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <Eye className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecordingClick(recording.id);
                                  setShowMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Add play functionality if needed
                                  setShowMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Play Recording
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={(e) => handleDeleteClick(recording, e)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                disabled={isDeleting}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Recording
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Click outside to close menu */}
          {showMenu && (
            <div 
              className="fixed inset-0 z-5" 
              onClick={() => setShowMenu(null)}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Recording</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{recordingToDelete?.title || 'this recording'}"? 
                  This action will permanently remove:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The recording file and transcript</li>
                    <li>All AI analysis and insights</li>
                    <li>Chat conversations and messages</li>
                    <li>Speaker segments and topic analysis</li>
                    <li>Embeddings and search data</li>
                  </ul>
                  <strong className="block mt-2 text-red-600">This cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Recording
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Multiple Recordings</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedRecordings.size} recording{selectedRecordings.size > 1 ? 's' : ''}? 
                  This action will permanently remove for each recording:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The recording file and transcript</li>
                    <li>All AI analysis and insights</li>
                    <li>Chat conversations and messages</li>
                    <li>Speaker segments and topic analysis</li>
                    <li>Embeddings and search data</li>
                  </ul>
                  <strong className="block mt-2 text-red-600">This cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting {selectedRecordings.size} recordings...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {selectedRecordings.size} Recording{selectedRecordings.size > 1 ? 's' : ''}
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </StandardLayout>
  );
}
