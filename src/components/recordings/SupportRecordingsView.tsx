import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Play,
  Pause,
  MessageSquare,
  Calendar,
  Clock,
  Search,
  Filter,
  Grid3X3,
  List,
  Upload,
  RefreshCw,
  Heart,
  Shield,
  Users,
  Award,
  TrendingUp,
  MoreVertical,
  FileAudio,
  FileVideo,
  Sparkles,
  Headphones,
  CheckCircle,
  AlertTriangle,
  Eye,
  FileDown,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import LiveDuration from '@/components/ui/LiveDuration';
import FloatingPlayer from '@/components/dashboard/FloatingPlayer';
import FloatingChat from '@/components/chat/FloatingChat';
import { useToast } from '@/hooks/use-toast';
import { exportRecordingToPDF } from '@/utils/pdfExport';
import { useComprehensiveDelete } from '@/hooks/useComprehensiveDelete';
import { analyzeAllSupportSignals } from '@/utils/supportSignals';
import type { Recording } from '@/types/recording';

interface SupportRecordingsViewProps {
  recordings: Recording[];
  loading: boolean;
}

interface SupportFilters {
  search: string;
  satisfactionLevel: string;
  status: string;
  escalationRisk: string;
}

export function SupportRecordingsView({ recordings, loading }: SupportRecordingsViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filters, setFilters] = useState<SupportFilters>({
    search: '',
    satisfactionLevel: 'all',
    status: 'all', 
    escalationRisk: 'all'
  });

  // Interactive states
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [chatRecording, setChatRecording] = useState<Recording | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Delete functionality
  const { handleComprehensiveDelete, isDeleting } = useComprehensiveDelete({
    onDeleteCompleted: () => {
      toast({
        title: "Recording Deleted",
        description: "The support recording has been successfully deleted.",
      });
    }
  });

  // Filter recordings for support mode (enhanced logic)
  const supportRecordings = useMemo(() => {
    return recordings.filter(recording => {
      // Explicit support analysis exists
      if (recording.support_analysis) {
        return true;
      }
      
      // Check content type for customer support
      if (recording.content_type === 'customer_support') {
        return true;
      }
      
      // Has transcript but no coaching evaluation (likely support)
      if (recording.transcript && !recording.coaching_evaluation) {
        return true;
      }
      
      // Processing recordings with customer_support content type
      if ((recording.status === 'processing' || recording.status === 'uploading') && 
          recording.content_type === 'customer_support') {
        return true;
      }
      
      return false;
    });
  }, [recordings]);

  // Apply filters
  const filteredRecordings = useMemo(() => {
    return supportRecordings.filter(recording => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = recording.title?.toLowerCase().includes(searchLower);
        const matchesDescription = recording.description?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (filters.status !== 'all' && recording.status !== filters.status) {
        return false;
      }

      // Get support analysis for filtering
      let analysis = null;
      try {
        if (recording.support_analysis) {
          analysis = typeof recording.support_analysis === 'string' 
            ? JSON.parse(recording.support_analysis) 
            : recording.support_analysis;
        } else if (recording.transcript) {
          analysis = analyzeAllSupportSignals(recording);
        }
      } catch (error) {
        console.error('Error parsing support analysis:', error);
      }

      // Satisfaction level filter
      if (filters.satisfactionLevel !== 'all' && analysis) {
        const satisfaction = analysis.customerSatisfaction || 0;
        const level = satisfaction >= 80 ? 'high' : satisfaction >= 60 ? 'medium' : 'low';
        if (level !== filters.satisfactionLevel) return false;
      }

      // Escalation risk filter
      if (filters.escalationRisk !== 'all' && analysis) {
        if (analysis.escalationRisk !== filters.escalationRisk) return false;
      }

      return true;
    });
  }, [supportRecordings, filters]);

  // Handler functions
  const handleRecordingClick = (recording: Recording) => {
    navigate(`/summaries/${recording.id}`);
  };

  const handleUploadClick = () => {
    navigate('/uploads');
  };

  const handlePlayRecording = (recording: Recording) => {
    if (playingRecording?.id === recording.id) {
      setPlayingRecording(null);
    } else {
      setPlayingRecording(recording);
    }
  };

  const handleChatWithRecording = (recording: Recording) => {
    setChatRecording(recording);
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
        description: `Support recording exported as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export support recording to PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecording = async (recording: Recording) => {
    try {
      await handleComprehensiveDelete(recording.id);
      setShowMenu(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSelectRecording = (recordingId: string) => {
    setSelectedRecordings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordingId)) {
        newSet.delete(recordingId);
      } else {
        newSet.add(recordingId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRecordings.size === filteredRecordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(filteredRecordings.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleting || selectedRecordings.size === 0) return;

    setBulkDeleting(true);
    try {
      const recordingsToDelete = Array.from(selectedRecordings);
      let deletedCount = 0;
      let failedCount = 0;

      for (const recordingId of recordingsToDelete) {
        try {
          await handleComprehensiveDelete(recordingId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete recording ${recordingId}:`, error);
          failedCount++;
        }
      }

      toast({
        title: "Bulk deletion completed",
        description: `Successfully deleted ${deletedCount} recordings${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        variant: failedCount > 0 ? 'destructive' : 'default'
      });

      setSelectedRecordings(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast({
        title: "Bulk delete failed",
        description: "An error occurred during bulk deletion",
        variant: "destructive"
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading support recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 className="text-4xl font-bold text-gray-800">Support Recordings</h1>
              <div className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md font-medium">
                Support Mode
              </div>
            </div>
            <p className="text-gray-600 mb-6">Customer service excellence with SERVQUAL insights and satisfaction tracking</p>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                <span>{supportRecordings.length} Total Recordings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>{supportRecordings.filter(r => r.status === 'completed').length} Analyzed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                <span>{supportRecordings.filter(r => r.support_analysis).length} With SERVQUAL</span>
              </div>
            </div>
          </header>

          {/* Filters and Controls */}
          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search support calls..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Satisfaction Filter */}
                <select
                  value={filters.satisfactionLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, satisfactionLevel: e.target.value }))}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Satisfaction</option>
                  <option value="high">High (80%+)</option>
                  <option value="medium">Medium (60-79%)</option>
                  <option value="low">Low (&lt;60%)</option>
                </select>

                {/* Escalation Risk Filter */}
                <select
                  value={filters.escalationRisk}
                  onChange={(e) => setFilters(prev => ({ ...prev, escalationRisk: e.target.value }))}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-md p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="px-3"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Button onClick={handleUploadClick} className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Recording
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedRecordings.size > 0 && (
            <div className="sticky top-4 z-50">
              <Card className="border-indigo-200 bg-indigo-50/90 backdrop-blur-sm shadow-lg">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRecordings(new Set())}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-indigo-900">
                      {selectedRecordings.size} recording{selectedRecordings.size === 1 ? '' : 's'} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    >
                      {selectedRecordings.size === filteredRecordings.length ? 'Deselect all' : 'Select all'}
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {bulkDeleting ? `Deleting ${selectedRecordings.size}...` : `Delete ${selectedRecordings.size}`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recordings Content */}
          {filteredRecordings.length === 0 ? (
            <EmptyState onUploadClick={handleUploadClick} hasRecordings={supportRecordings.length > 0} />
          ) : viewMode === 'grid' ? (
            <RecordingsGrid
              recordings={filteredRecordings}
              onRecordingClick={handleRecordingClick}
              onPlayRecording={handlePlayRecording}
              onChatWithRecording={handleChatWithRecording}
              onExportToPDF={handleExportToPDF}
              onDeleteRecording={handleDeleteRecording}
              playingRecording={playingRecording}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              isDeleting={isDeleting}
              selectedRecordings={selectedRecordings}
              onSelectRecording={handleSelectRecording}
            />
          ) : (
            <SupportRecordingsTable
              recordings={filteredRecordings}
              onRecordingClick={handleRecordingClick}
              onPlayRecording={handlePlayRecording}
              onChatWithRecording={handleChatWithRecording}
              onExportToPDF={handleExportToPDF}
              onDeleteRecording={handleDeleteRecording}
              playingRecording={playingRecording}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              isDeleting={isDeleting}
              selectedRecordings={selectedRecordings}
              onSelectRecording={handleSelectRecording}
            />
          )}
      </div>

      {/* Floating Player */}
      {playingRecording && (
        <FloatingPlayer
          recording={playingRecording}
          onClose={() => setPlayingRecording(null)}
        />
      )}

      {/* Floating Chat */}
      {chatRecording && (
        <FloatingChat
          recording={chatRecording}
          onClose={() => setChatRecording(null)}
        />
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}

// Support Recordings Table Component  
interface SupportRecordingsTableProps {
  recordings: Recording[];
  onRecordingClick: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  playingRecording: Recording | null;
  showMenu: string | null;
  setShowMenu: (id: string | null) => void;
  isDeleting: boolean;
  selectedRecordings: Set<string>;
  onSelectRecording: (recordingId: string) => void;
}

function SupportRecordingsTable({
  recordings,
  onRecordingClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  playingRecording,
  showMenu,
  setShowMenu,
  isDeleting,
  selectedRecordings,
  onSelectRecording
}: SupportRecordingsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'processing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'uploading': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSupportAnalysis = (recording: Recording) => {
    try {
      if (recording.support_analysis) {
        return typeof recording.support_analysis === 'string' 
          ? JSON.parse(recording.support_analysis)
          : recording.support_analysis;
      } else if (recording.transcript) {
        return analyzeAllSupportSignals(recording);
      }
    } catch (error) {
      console.error('Error getting support analysis:', error);
    }
    return null;
  };

  const getSatisfactionCell = (recording: Recording) => {
    const analysis = getSupportAnalysis(recording);
    if (!analysis || !analysis.customerSatisfaction) {
      return <span className="text-gray-400">-</span>;
    }
    
    const satisfaction = analysis.customerSatisfaction;
    let color = 'text-gray-600';
    
    if (satisfaction >= 80) {
      color = 'text-green-600';
    } else if (satisfaction >= 60) {
      color = 'text-yellow-600';
    } else {
      color = 'text-red-600';
    }

    return (
      <div className="flex items-center gap-1">
        <Heart className={cn('w-3 h-3', color)} />
        <span className={cn('text-sm font-medium', color)}>{satisfaction}%</span>
      </div>
    );
  };

  const getEscalationCell = (recording: Recording) => {
    const analysis = getSupportAnalysis(recording);
    if (!analysis || !analysis.escalationRisk) {
      return <span className="text-gray-400">-</span>;
    }
    
    const risk = analysis.escalationRisk;
    let color = 'text-gray-600';
    let icon = CheckCircle;
    
    if (risk === 'high') {
      color = 'text-red-600';
      icon = AlertTriangle;
    } else if (risk === 'medium') {
      color = 'text-yellow-600';
      icon = AlertTriangle;
    } else {
      color = 'text-green-600';
      icon = CheckCircle;
    }

    const IconComponent = icon;
    return (
      <div className="flex items-center gap-1">
        <IconComponent className={cn('w-3 h-3', color)} />
        <span className={cn('text-xs font-medium capitalize', color)}>{risk}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRecordings.size === recordings.length && recordings.length > 0}
                  onCheckedChange={() => {
                    if (selectedRecordings.size === recordings.length) {
                      recordings.forEach(r => onSelectRecording(r.id));
                    } else {
                      recordings.forEach(r => {
                        if (!selectedRecordings.has(r.id)) {
                          onSelectRecording(r.id);
                        }
                      });
                    }
                  }}
                />
              </TableHead>
              <TableHead>Recording</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Satisfaction</TableHead>
              <TableHead>Escalation</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map((recording) => (
              <TableRow
                key={recording.id}
                className={cn(
                  "cursor-pointer hover:bg-gray-50",
                  selectedRecordings.has(recording.id) && "bg-indigo-50/50"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRecordings.has(recording.id)}
                    onCheckedChange={() => onSelectRecording(recording.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>
                  <div className="flex items-center gap-3">
                    {recording.file_type === 'video' ? (
                      <FileVideo className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <FileAudio className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {recording.title || 'Untitled Recording'}
                      </p>
                      {recording.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {recording.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>
                  <Badge className={cn('text-xs border', getStatusColor(recording.status))}>
                    {recording.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>{getSatisfactionCell(recording)}</TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>{getEscalationCell(recording)}</TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>
                  <LiveDuration
                    recordingId={recording.id}
                    className="text-sm text-gray-600"
                    showIcon={false}
                    fallbackDuration={recording.duration}
                  />
                </TableCell>
                <TableCell onClick={() => onRecordingClick(recording)}>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {recording.status === 'completed' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayRecording(recording);
                          }}
                          title={playingRecording?.id === recording.id ? "Pause" : "Play"}
                        >
                          {playingRecording?.id === recording.id ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChatWithRecording(recording);
                          }}
                          title="Analyze"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(showMenu === recording.id ? null : recording.id);
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                      
                      {showMenu === recording.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordingClick(recording);
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
                              onExportToPDF(recording);
                              setShowMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileDown className="w-4 h-4" />
                            Export as PDF
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRecording(recording);
                              setShowMenu(null);
                            }}
                            disabled={isDeleting}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            {isDeleting ? 'Deleting...' : 'Delete Recording'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Empty State Component
interface EmptyStateProps {
  onUploadClick: () => void;
  hasRecordings: boolean;
}

function EmptyState({ onUploadClick, hasRecordings }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-indigo-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
        <Headphones className="h-16 w-16 text-indigo-600" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
        {hasRecordings ? 'No recordings match your filters' : 'No support recordings yet'}
      </h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {hasRecordings 
          ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
          : 'Upload your first customer service call to get started with SERVQUAL analysis and satisfaction insights'
        }
      </p>
      {!hasRecordings && (
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Heart className="w-4 h-4 text-pink-500" />
            <span>SERVQUAL Analysis</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Quality Metrics</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span>Satisfaction Tracking</span>
          </div>
        </div>
      )}
      <Button onClick={onUploadClick} className="bg-indigo-600 hover:bg-indigo-700">
        <Upload className="w-4 h-4 mr-2" />
        Upload Support Call
      </Button>
    </div>
  );
}

// Recordings Grid Component
interface RecordingsGridProps {
  recordings: Recording[];
  onRecordingClick: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  playingRecording: Recording | null;
  showMenu: string | null;
  setShowMenu: (id: string | null) => void;
  isDeleting: boolean;
  selectedRecordings: Set<string>;
  onSelectRecording: (recordingId: string) => void;
}

function RecordingsGrid({
  recordings,
  onRecordingClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  playingRecording,
  showMenu,
  setShowMenu,
  isDeleting,
  selectedRecordings,
  onSelectRecording
}: RecordingsGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {recordings.map((recording) => (
        <SupportRecordingCard
          key={recording.id}
          recording={recording}
          onClick={() => onRecordingClick(recording)}
          onPlayRecording={onPlayRecording}
          onChatWithRecording={onChatWithRecording}
          onExportToPDF={onExportToPDF}
          onDeleteRecording={onDeleteRecording}
          isPlaying={playingRecording?.id === recording.id}
          showMenu={showMenu === recording.id}
          setShowMenu={setShowMenu}
          isDeleting={isDeleting}
          isSelected={selectedRecordings.has(recording.id)}
          onSelectRecording={onSelectRecording}
        />
      ))}
    </div>
  );
}

// Support Recording Card Component
interface SupportRecordingCardProps {
  recording: Recording;
  onClick: () => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  isPlaying: boolean;
  showMenu: boolean;
  setShowMenu: (id: string | null) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onSelectRecording: (recordingId: string) => void;
}

function SupportRecordingCard({
  recording,
  onClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  isPlaying,
  showMenu,
  setShowMenu,
  isDeleting,
  isSelected,
  onSelectRecording
}: SupportRecordingCardProps) {
  // Get support analysis
  const getSupportAnalysis = () => {
    try {
      if (recording.support_analysis) {
        return typeof recording.support_analysis === 'string' 
          ? JSON.parse(recording.support_analysis)
          : recording.support_analysis;
      } else if (recording.transcript) {
        return analyzeAllSupportSignals(recording);
      }
    } catch (error) {
      console.error('Error getting support analysis:', error);
    }
    return null;
  };

  const analysis = getSupportAnalysis();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'processing': return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'uploading': return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSatisfactionBadge = () => {
    if (!analysis || !analysis.customerSatisfaction) return null;
    
    const satisfaction = analysis.customerSatisfaction;
    let color = 'bg-gray-100 text-gray-800 border-gray-200';
    let label = `${satisfaction}%`;
    
    if (satisfaction >= 80) {
      color = 'bg-green-100 text-green-800 border-green-200';
      label = `${satisfaction}% High`;
    } else if (satisfaction >= 60) {
      color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      label = `${satisfaction}% Medium`;
    } else {
      color = 'bg-red-100 text-red-800 border-red-200';
      label = `${satisfaction}% Low`;
    }

    return (
      <Badge className={cn('text-xs border', color)}>
        <Heart className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getEscalationRisk = () => {
    if (!analysis || !analysis.escalationRisk) return null;
    
    const risk = analysis.escalationRisk;
    let color = 'text-gray-600';
    let icon = CheckCircle;
    
    if (risk === 'high') {
      color = 'text-red-600';
      icon = AlertTriangle;
    } else if (risk === 'medium') {
      color = 'text-yellow-600';
      icon = AlertTriangle;
    } else {
      color = 'text-green-600';
      icon = CheckCircle;
    }

    const IconComponent = icon;
    return (
      <div className="flex items-center gap-1">
        <IconComponent className={cn('w-3 h-3', color)} />
        <span className={cn('text-xs font-medium capitalize', color)}>{risk} Risk</span>
      </div>
    );
  };

  const getSERVQUALScore = () => {
    if (!analysis || !analysis.servqualMetrics) return null;
    
    const metrics = analysis.servqualMetrics;
    const avgScore = (
      metrics.reliability + 
      metrics.assurance + 
      metrics.tangibles + 
      metrics.empathy + 
      metrics.responsiveness
    ) / 5;

    const scoreColor = avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <div className="flex items-center gap-1">
        <Award className={cn('w-3 h-3', scoreColor)} />
        <span className={cn('text-xs font-medium', scoreColor)}>SERVQUAL {avgScore.toFixed(0)}</span>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 cursor-pointer',
        'bg-white hover:bg-gray-50/50',
        'border border-gray-200 hover:border-indigo-300',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected && "border-indigo-500 bg-indigo-50/50"
      )}
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
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectRecording(recording.id)}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0" onClick={onClick}>
              <div className="flex items-center gap-2 mb-2">
                {recording.file_type === 'video' ? (
                  <FileVideo className="w-4 h-4 text-gray-500" />
                ) : (
                  <FileAudio className="w-4 h-4 text-gray-500" />
                )}
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {recording.title || 'Untitled Recording'}
                </CardTitle>
              </div>
            
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={cn('text-xs border', getStatusColor(recording.status))}>
                {recording.status}
              </Badge>
              {getSatisfactionBadge()}
            </div>

              {/* Support Metrics */}
              <div className="flex items-center gap-3 text-xs">
                {getEscalationRisk()}
                {getSERVQUALScore()}
              </div>
            </div>
          </div>

          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(showMenu ? null : recording.id);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
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
                    onExportToPDF(recording);
                    setShowMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export as PDF
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRecording(recording);
                    setShowMenu(null);
                  }}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Recording'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
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
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Summary preview */}
        {(recording.summary || recording.ai_summary) && (
          <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-medium text-gray-700">Support Summary</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-3">
              {recording.ai_summary || recording.summary}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {recording.status === 'completed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayRecording(recording);
                }}
              >
                {isPlaying ? (
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
                variant="outline"
                size="sm"
                className="flex-1 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onChatWithRecording(recording);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Analyze
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
        </div>
      </CardContent>
    </Card>
  );
}