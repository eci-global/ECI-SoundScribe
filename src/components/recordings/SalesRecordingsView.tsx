import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Play,
  Pause,
  MessageSquare,
  Calendar,
  Clock,
  Search,
  Upload,
  RefreshCw,
  Star,
  TrendingUp,
  Target,
  Award,
  Sparkles,
  FileAudio,
  FileVideo,
  MoreVertical,
  Eye,
  FileDown,
  Trash2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Zap,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, format, isToday, isYesterday } from 'date-fns';
import LiveDuration from '@/components/ui/LiveDuration';
import FloatingPlayer from '@/components/dashboard/FloatingPlayer';
import FloatingChat from '@/components/chat/FloatingChat';
import { useToast } from '@/hooks/use-toast';
import { exportRecordingToPDF } from '@/utils/pdfExport';
import { useComprehensiveDelete } from '@/hooks/useComprehensiveDelete';
import type { Recording } from '@/types/recording';

interface SalesRecordingsViewProps {
  recordings: Recording[];
  loading: boolean;
}

type StatusFilter = 'all' | 'completed' | 'processing' | 'uploading' | 'failed' | 'in_progress';

type DateRangeFilter = 'all' | '7d' | '30d' | '90d';

type QuickFilterTone = 'default' | 'success' | 'info' | 'danger';

interface SalesFilters {
  search: string;
  framework: string;
  status: StatusFilter;
  dateRange: DateRangeFilter;
}

interface RecordingGroup {
  dateKey: string;
  label: string;
  items: Recording[];
}

export function SalesRecordingsView({ recordings, loading }: SalesRecordingsViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [sortOption, setSortOption] = useState<'recent' | 'score' | 'duration'>('recent');
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    framework: 'all',
    status: 'all',
    dateRange: 'all',
  });
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [chatRecording, setChatRecording] = useState<Recording | null>(null);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { handleComprehensiveDelete, isDeleting } = useComprehensiveDelete({
    onDeleteCompleted: () => {
      toast({
        title: 'Recording deleted',
        description: 'The recording has been successfully removed.',
      });
    },
  });

  const salesRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      if (recording.coaching_evaluation) {
        return true;
      }

      if (recording.content_type === 'sales_call') {
        return true;
      }

      if (
        (recording.status === 'processing' || recording.status === 'uploading') &&
        recording.content_type === 'sales_call'
      ) {
        return true;
      }

      if (!recording.support_analysis && recording.content_type !== 'customer_support') {
        return true;
      }

      return false;
    });
  }, [recordings]);

  const frameworkOptions = useMemo(() => {
    const base = ['BANT', 'MEDDIC', 'SPICED'];
    const dynamic = Array.from(
      new Set(
        salesRecordings
          .map((recording) => (recording as any).primary_framework as string | undefined)
          .filter((value): value is string => Boolean(value) && !base.includes(value))
      )
    );
    return ['all', ...base, ...dynamic];
  }, [salesRecordings]);

  const statusCounts = useMemo(() => {
    const completed = salesRecordings.filter((recording) => recording.status === 'completed').length;
    const processing = salesRecordings.filter((recording) => recording.status === 'processing').length;
    const uploading = salesRecordings.filter((recording) => recording.status === 'uploading').length;
    const failed = salesRecordings.filter((recording) => recording.status === 'failed').length;
    const coached = salesRecordings.filter((recording) => recording.coaching_evaluation).length;
    const durations = salesRecordings
      .map((recording) => recording.duration ?? 0)
      .filter((value) => typeof value === 'number' && value > 0);
    const avgDurationSeconds = durations.length
      ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
      : 0;
    const frameworks = new Set(
      salesRecordings
        .map((recording) => (recording as any).primary_framework as string | undefined)
        .filter(Boolean)
    ).size;

    return {
      total: salesRecordings.length,
      completed,
      processing,
      uploading,
      failed,
      coached,
      inProgress: processing + uploading,
      avgDurationSeconds,
      frameworks,
    };
  }, [salesRecordings]);

  const statusFilterConfig = useMemo(
    () => [
      {
        value: 'all' as StatusFilter,
        label: 'All calls',
        description: '${statusCounts.total} total',
        tone: 'default' as QuickFilterTone,
        disabled: statusCounts.total === 0,
      },
      {
        value: 'completed' as StatusFilter,
        label: 'Ready to coach',
        description: '${statusCounts.completed} analyzed',
        tone: 'success' as QuickFilterTone,
        disabled: statusCounts.completed === 0,
      },
      {
        value: 'in_progress' as StatusFilter,
        label: 'In progress',
        description: '${statusCounts.inProgress} moving',
        tone: 'info' as QuickFilterTone,
        disabled: statusCounts.inProgress === 0,
      },
      {
        value: 'failed' as StatusFilter,
        label: 'Needs attention',
        description: '${statusCounts.failed} issues',
        tone: 'danger' as QuickFilterTone,
        disabled: statusCounts.failed === 0,
      },
    ],
    [statusCounts]
  );
  const filteredRecordings = useMemo(() => {
    return salesRecordings.filter((recording) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const summary = recording.ai_summary || '';
        const matches =
          recording.title?.toLowerCase().includes(searchLower) ||
          recording.description?.toLowerCase().includes(searchLower) ||
          summary.toLowerCase().includes(searchLower);
        if (!matches) {
          return false;
        }
      }

      if (filters.status !== 'all') {
        if (filters.status === 'in_progress') {
          if (recording.status !== 'processing' && recording.status !== 'uploading') {
            return false;
          }
        } else if (recording.status !== filters.status) {
          return false;
        }
      }

      if (filters.framework !== 'all') {
        const framework = (recording as any).primary_framework;
        if (framework !== filters.framework) {
          return false;
        }
      }

      if (filters.dateRange !== 'all') {
        const createdAt = new Date(recording.created_at);
        const diff = differenceInDays(new Date(), createdAt);
        if (Number.isNaN(diff)) {
          return false;
        }

        if (filters.dateRange === '7d' && diff > 7) {
          return false;
        }

        if (filters.dateRange === '30d' && diff > 30) {
          return false;
        }

        if (filters.dateRange === '90d' && diff > 90) {
          return false;
        }
      }

      return true;
    });
  }, [salesRecordings, filters]);

  const sortedRecordings = useMemo(() => {
    const result = [...filteredRecordings];
    switch (sortOption) {
      case 'score':
        return result.sort((a, b) => {
          const scoreA = a.coaching_evaluation?.overallScore ?? -1;
          const scoreB = b.coaching_evaluation?.overallScore ?? -1;
          return scoreB - scoreA;
        });
      case 'duration':
        return result.sort((a, b) => {
          const durationA = a.duration ?? 0;
          const durationB = b.duration ?? 0;
          return durationB - durationA;
        });
      default:
        return result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [filteredRecordings, sortOption]);

  const groupedRecordings = useMemo<RecordingGroup[]>(
    () => groupRecordingsByDay(sortedRecordings),
    [sortedRecordings]
  );

  const inProgressRecordings = useMemo(
    () =>
      sortedRecordings.filter(
        (recording) => recording.status === 'processing' || recording.status === 'uploading'
      ),
    [sortedRecordings]
  );

  const failedRecordings = useMemo(
    () => sortedRecordings.filter((recording) => recording.status === 'failed'),
    [sortedRecordings]
  );

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.framework !== 'all' ||
    filters.status !== 'all' ||
    filters.dateRange !== 'all';

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
        title: 'Export successful',
        description: `Recording exported as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export recording to PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRecording = async (recording: Recording) => {
    try {
      await handleComprehensiveDelete(recording.id);
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
    if (selectedRecordings.size === sortedRecordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(sortedRecordings.map(r => r.id)));
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

  const handleClearFilters = () => {
    setFilters({
      search: '',
      framework: 'all',
      status: 'all',
      dateRange: 'all',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-slate-600">Loading sales recordings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-3 py-1 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" />
              Guided sales workspace
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-slate-900 tracking-tight lg:text-5xl">
                Coach every call with clarity
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Review, search, and triage recent conversations faster. Apply frameworks, surface AI coaching, and jump straight into the calls that matter most.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-blue-700 shadow-sm">
                <TrendingUp className="h-4 w-4" />
                {statusCounts.completed} analyzed calls
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white px-4 py-2 text-amber-700 shadow-sm">
                <Target className="h-4 w-4" />
                {statusCounts.inProgress} in progress
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-purple-700 shadow-sm">
                <Award className="h-4 w-4" />
                {statusCounts.coached} coached with AI
              </span>
            </div>
          </div>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
            <div className="absolute inset-0 bg-grid-white/[0.05]" aria-hidden="true" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-xl font-semibold">Drop in a new conversation</CardTitle>
              <p className="mt-2 text-sm text-blue-100/90">
                Upload a fresh call to get summaries, coaching tips, and framework alignment within minutes.
              </p>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <Button
                className="w-full bg-white/90 text-blue-700 hover:bg-white"
                onClick={handleUploadClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload recording
              </Button>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-amber-300 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white/90">What you get</p>
                    <ul className="space-y-1 text-xs text-blue-100/90">
                      <li>• Framework compliance snapshot</li>
                      <li>• Coach-ready talking points</li>
                      <li>• Shareable transcript and highlights</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            label="Completed reviews"
            value={statusCounts.completed}
            caption="Ready for coaching"
          />
          <MetricCard
            icon={<Target className="h-5 w-5 text-amber-500" />}
            label="In progress"
            value={statusCounts.inProgress}
            caption="Processing or uploading"
          />
          <MetricCard
            icon={<Clock className="h-5 w-5 text-slate-500" />}
            label="Average duration"
            value={formatSecondsToClock(statusCounts.avgDurationSeconds)}
            caption="Across processed calls"
          />
          <MetricCard
            icon={<Layers className="h-5 w-5 text-purple-500" />}
            label="Framework coverage"
            value={statusCounts.frameworks}
            caption="Distinct playbooks tracked"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex flex-wrap gap-3">
              {statusFilterConfig.map((option) => (
                <QuickFilterButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  tone={option.tone}
                  active={filters.status === option.value}
                  disabled={option.disabled}
                  onClick={() => setFilters((prev) => ({ ...prev, status: option.value }))}
                />
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by title, summary, or keywords"
                  className="pl-9"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <Select
                value={filters.framework}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, framework: value }))
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Framework" />
                </SelectTrigger>
                <SelectContent>
                  {frameworkOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? 'All frameworks' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, dateRange: value as DateRangeFilter }))
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Filters applied — showing {filteredRecordings.length}{' '}
                {filteredRecordings.length === 1 ? 'result' : 'results'}
              </span>
              <button
                type="button"
                className="font-medium text-blue-600 hover:underline"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Bulk Actions Bar */}
        {selectedRecordings.size > 0 && (
          <section className="sticky top-4 z-50">
            <Card className="border-blue-200 bg-blue-50/90 backdrop-blur-sm shadow-lg">
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
                  <span className="text-sm font-medium text-blue-900">
                    {selectedRecordings.size} recording{selectedRecordings.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    {selectedRecordings.size === sortedRecordings.length ? 'Deselect all' : 'Select all'}
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
          </section>
        )}

        {(inProgressRecordings.length > 0 || failedRecordings.length > 0) && (
          <section className="grid gap-4 lg:grid-cols-2">
            {inProgressRecordings.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/70">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                        Active queue
                      </CardTitle>
                      <p className="mt-1 text-xs text-blue-800/80">
                        We will notify you as soon as processing completes.
                      </p>
                    </div>
                    <Badge className="bg-blue-600 text-white text-xs border-blue-600">
                      {inProgressRecordings.length} moving
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inProgressRecordings.slice(0, 4).map((recording) => (
                    <button
                      key={recording.id}
                      type="button"
                      onClick={() => handleRecordingClick(recording)}
                      className="w-full rounded-xl border border-blue-200 bg-white/60 px-4 py-3 text-left transition hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-blue-900 truncate">
                          {recording.title || 'Untitled recording'}
                        </p>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] capitalize">
                          {recording.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-blue-800/70">
                        Added {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                  {inProgressRecordings.length > 4 && (
                    <p className="text-xs text-blue-800/80">
                      +{inProgressRecordings.length - 4} more waiting in queue
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            {failedRecordings.length > 0 && (
              <Card className="border-rose-200 bg-rose-50/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <CardTitle className="text-sm font-semibold text-rose-900 uppercase tracking-wide">
                        Needs attention
                      </CardTitle>
                    </div>
                    <Badge className="bg-rose-500 text-white text-xs border-rose-500">
                      {failedRecordings.length}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-rose-700/80">
                    Resolve upload or processing issues to unlock AI insights.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {failedRecordings.slice(0, 3).map((recording) => (
                    <button
                      key={recording.id}
                      type="button"
                      onClick={() => handleRecordingClick(recording)}
                      className="w-full rounded-xl border border-rose-200 bg-white/70 px-4 py-3 text-left transition hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-rose-900 truncate">
                          {recording.title || 'Untitled recording'}
                        </p>
                        <ChevronRight className="h-4 w-4 text-rose-400" />
                      </div>
                      <p className="mt-1 text-xs text-rose-700/70">
                        Attempted {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Call library</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRecordings.length}{' '}
                  {filteredRecordings.length === 1 ? 'recording matches' : 'recordings match'} your filters
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={sortOption}
                  onValueChange={(value) =>
                    setSortOption(value as 'recent' | 'score' | 'duration')
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Newest first</SelectItem>
                    <SelectItem value="score">Highest score</SelectItem>
                    <SelectItem value="duration">Longest duration</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" />
                  Upload call
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'list' | 'table')}
              className="space-y-6"
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="list" className="flex-1 sm:flex-none">
                  Curated view
                </TabsTrigger>
                <TabsTrigger value="table" className="flex-1 sm:flex-none">
                  Table
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="space-y-6">
                {sortedRecordings.length === 0 ? (
                  <EmptyState
                    onUploadClick={handleUploadClick}
                    hasRecordings={salesRecordings.length > 0}
                  />
                ) : (
                  groupedRecordings.map((group) => (
                    <RecordingListSection
                      key={group.dateKey}
                      label={group.label}
                      recordings={group.items}
                      onRecordingClick={handleRecordingClick}
                      onPlayRecording={handlePlayRecording}
                      onChatWithRecording={handleChatWithRecording}
                      onExportToPDF={handleExportToPDF}
                      onDeleteRecording={handleDeleteRecording}
                      playingRecording={playingRecording}
                      isDeleting={isDeleting}
                      selectedRecordings={selectedRecordings}
                      onSelectRecording={handleSelectRecording}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="table">
                {sortedRecordings.length === 0 ? (
                  <EmptyState
                    onUploadClick={handleUploadClick}
                    hasRecordings={salesRecordings.length > 0}
                  />
                ) : (
                  <RecordingsTable
                    recordings={sortedRecordings}
                    onRecordingClick={handleRecordingClick}
                    onPlayRecording={handlePlayRecording}
                    onChatWithRecording={handleChatWithRecording}
                    onExportToPDF={handleExportToPDF}
                    onDeleteRecording={handleDeleteRecording}
                    playingRecording={playingRecording}
                    isDeleting={isDeleting}
                    selectedRecordings={selectedRecordings}
                    onSelectRecording={handleSelectRecording}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </section>
      </div>

      {playingRecording && (
        <FloatingPlayer recording={playingRecording} onClose={() => setPlayingRecording(null)} />
      )}

      {chatRecording && (
        <FloatingChat recording={chatRecording} onClose={() => setChatRecording(null)} />
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  caption: string;
}

function MetricCard({ icon, label, value, caption }: MetricCardProps) {
  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickFilterButtonProps {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone?: QuickFilterTone;
}

function QuickFilterButton({
  label,
  description,
  active,
  onClick,
  disabled,
  tone = 'default',
}: QuickFilterButtonProps) {
  const toneClasses: Record<QuickFilterTone, { active: string; inactive: string }> = {
    default: {
      active: 'bg-slate-900 text-white border-slate-900 shadow-sm',
      inactive: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
    },
    success: {
      active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
      inactive: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
    },
    info: {
      active: 'bg-blue-600 text-white border-blue-600 shadow-sm',
      inactive: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100',
    },
    danger: {
      active: 'bg-rose-600 text-white border-rose-600 shadow-sm',
      inactive: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-w-[140px] flex-col gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        active ? toneClasses[tone].active : toneClasses[tone].inactive
      )}
    >
      <span className="font-semibold">{label}</span>
      {description && (
        <span className={cn('text-xs', active ? 'text-white/80' : 'text-slate-500')}>
          {description}
        </span>
      )}
    </button>
  );
}

interface RecordingListSectionProps {
  label: string;
  recordings: Recording[];
  onRecordingClick: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  playingRecording: Recording | null;
  isDeleting: boolean;
  selectedRecordings: Set<string>;
  onSelectRecording: (recordingId: string) => void;
}

function RecordingListSection({
  label,
  recordings,
  onRecordingClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  playingRecording,
  isDeleting,
  selectedRecordings,
  onSelectRecording,
}: RecordingListSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</h3>
        <span className="text-xs text-slate-400">
          {recordings.length} {recordings.length === 1 ? 'call' : 'calls'}
        </span>
      </div>
      <div className="space-y-4">
        {recordings.map((recording) => (
          <RecordingListItem
            key={recording.id}
            recording={recording}
            onRecordingClick={onRecordingClick}
            onPlayRecording={onPlayRecording}
            onChatWithRecording={onChatWithRecording}
            onExportToPDF={onExportToPDF}
            onDeleteRecording={onDeleteRecording}
            isPlaying={playingRecording?.id === recording.id}
            isDeleting={isDeleting}
            isSelected={selectedRecordings.has(recording.id)}
            onSelectRecording={onSelectRecording}
          />
        ))}
      </div>
    </div>
  );
}
interface RecordingListItemProps {
  recording: Recording;
  onRecordingClick: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  isPlaying: boolean;
  isDeleting: boolean;
  isSelected: boolean;
  onSelectRecording: (recordingId: string) => void;
}

function RecordingListItem({
  recording,
  onRecordingClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  isPlaying,
  isDeleting,
  isSelected,
  onSelectRecording,
}: RecordingListItemProps) {
  const summary = recording.ai_summary || recording.summary;
  const framework = (recording as any).primary_framework as string | undefined;
  const coachingScore = getCoachingScore(recording);

  return (
    <Card
      className={cn(
        "group border-slate-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md",
        isSelected && "border-blue-500 bg-blue-50/50"
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectRecording(recording.id)}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="space-y-2 flex-1" onClick={() => onRecordingClick(recording)}>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                {recording.file_type === 'video' ? (
                  <FileVideo className="h-4 w-4 text-slate-500" />
                ) : (
                  <FileAudio className="h-4 w-4 text-slate-500" />
                )}
                <span className="line-clamp-1">{recording.title || 'Untitled recording'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('text-xs capitalize border', getStatusBadgeClasses(recording.status))}>
                  {recording.status}
                </Badge>
                {framework && (
                  <Badge className={cn('text-xs border', getFrameworkBadgeClasses(framework))}>
                    {framework}
                  </Badge>
                )}
                {coachingScore && (
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium', coachingScore.color)}>
                    <Star className="h-3 w-3" />
                    {coachingScore.value.toFixed(1)}
                  </span>
                )}
              </div>
              {recording.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{recording.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recording.status === 'completed' && (
              <>
                <Button
                  size="sm"
                  variant={isPlaying ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPlayRecording(recording);
                  }}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChatWithRecording(recording);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Analyze
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onRecordingClick(recording);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onExportToPDF(recording);
                  }}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteRecording(recording);
                  }}
                  disabled={isDeleting}
                  className="text-rose-600 focus:text-rose-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {summary && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3 w-3 text-blue-500" />
              AI summary
            </div>
            <p className="text-sm text-slate-600 line-clamp-3">{summary}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <LiveDuration
              recordingId={recording.id}
              className="font-medium text-slate-600"
              showIcon={false}
              fallbackDuration={recording.duration}
            />
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
          </span>
          {recording.coaching_evaluation?.primaryFocus && (
            <span className="inline-flex items-center gap-1">
              <Target className="h-3 w-3 text-slate-400" />
              {recording.coaching_evaluation.primaryFocus}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecordingsTableProps {
  recordings: Recording[];
  onRecordingClick: (recording: Recording) => void;
  onPlayRecording: (recording: Recording) => void;
  onChatWithRecording: (recording: Recording) => void;
  onExportToPDF: (recording: Recording) => void;
  onDeleteRecording: (recording: Recording) => void;
  playingRecording: Recording | null;
  isDeleting: boolean;
  selectedRecordings: Set<string>;
  onSelectRecording: (recordingId: string) => void;
}

function RecordingsTable({
  recordings,
  onRecordingClick,
  onPlayRecording,
  onChatWithRecording,
  onExportToPDF,
  onDeleteRecording,
  playingRecording,
  isDeleting,
  selectedRecordings,
  onSelectRecording,
}: RecordingsTableProps) {
  const isPlaying = (recording: Recording) => playingRecording?.id === recording.id;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/60">
            <TableRow className="hover:bg-transparent">
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
              <TableHead>Framework</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map((recording) => {
              const framework = (recording as any).primary_framework as string | undefined;
              const coachingScore = getCoachingScore(recording);

              return (
                <TableRow
                  key={recording.id}
                  className={cn(
                    "cursor-pointer transition hover:bg-slate-50",
                    selectedRecordings.has(recording.id) && "bg-blue-50/50"
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
                        <FileVideo className="h-4 w-4 text-slate-500" />
                      ) : (
                        <FileAudio className="h-4 w-4 text-slate-500" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {recording.title || 'Untitled recording'}
                        </p>
                        {recording.description && (
                          <p className="text-xs text-slate-500 truncate">{recording.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onRecordingClick(recording)}>
                    <Badge className={cn('text-xs capitalize border', getStatusBadgeClasses(recording.status))}>
                      {recording.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => onRecordingClick(recording)}>
                    {framework ? (
                      <Badge className={cn('text-xs border', getFrameworkBadgeClasses(framework))}>
                        {framework}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => onRecordingClick(recording)}>
                    {coachingScore ? (
                      <span className={cn('inline-flex items-center gap-1 text-sm font-medium', coachingScore.color)}>
                        <Star className="h-3 w-3" />
                        {coachingScore.value.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => onRecordingClick(recording)}>
                    <LiveDuration
                      recordingId={recording.id}
                      className="text-sm text-slate-600"
                      showIcon={false}
                      fallbackDuration={recording.duration}
                    />
                  </TableCell>
                  <TableCell onClick={() => onRecordingClick(recording)}>
                    <span className="text-sm text-slate-600">
                      {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {recording.status === 'completed' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={isPlaying(recording) ? 'Pause' : 'Play'}
                            onClick={(event) => {
                              event.stopPropagation();
                              onPlayRecording(recording);
                            }}
                          >
                            {isPlaying(recording) ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Analyze"
                            onClick={(event) => {
                              event.stopPropagation();
                              onChatWithRecording(recording);
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              onRecordingClick(recording);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              onExportToPDF(recording);
                            }}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteRecording(recording);
                            }}
                            disabled={isDeleting}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  onUploadClick: () => void;
  hasRecordings: boolean;
}

function EmptyState({ onUploadClick, hasRecordings }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-10 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <FileAudio className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-2xl font-semibold text-slate-900 mb-2">
        {hasRecordings ? 'No recordings match your filters' : 'Upload your first sales call'}
      </h3>
      <p className="mx-auto max-w-xl text-sm text-slate-500 mb-8">
        {hasRecordings
          ? 'Try adjusting your search or filters to explore more of your library.'
          : 'Bring a conversation into SoundScribe to generate summaries, moments, and coaching activations automatically.'}
      </p>
      <Button onClick={onUploadClick} className="gap-2 bg-blue-600 hover:bg-blue-700">
        <Upload className="h-4 w-4" />
        Upload recording
      </Button>
    </div>
  );
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'processing':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'uploading':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'failed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getFrameworkBadgeClasses(framework: string) {
  const frameworkBadgeMap: Record<string, string> = {
    BANT: 'bg-blue-50 text-blue-700 border-blue-200',
    MEDDIC: 'bg-purple-50 text-purple-700 border-purple-200',
    SPICED: 'bg-green-50 text-green-700 border-green-200',
  };

  return frameworkBadgeMap[framework] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function getCoachingScore(recording: Recording) {
  if (!recording.coaching_evaluation || typeof recording.coaching_evaluation.overallScore !== 'number') {
    return null;
  }

  const value = recording.coaching_evaluation.overallScore;
  const color = value >= 8 ? 'text-emerald-600' : value >= 6 ? 'text-amber-600' : 'text-rose-600';
  return { value, color };
}

function formatSecondsToClock(totalSeconds: number) {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return '0:00';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function groupRecordingsByDay(recordings: Recording[]): RecordingGroup[] {
  const groups = new Map<string, Recording[]>();

  recordings.forEach((recording) => {
    const dateKey = format(new Date(recording.created_at), 'yyyy-MM-dd');
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(recording);
    } else {
      groups.set(dateKey, [recording]);
    }
  });

  return Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([dateKey, items]) => ({
      dateKey,
      label: getFriendlyDateLabel(dateKey),
      items: items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
}

function getFriendlyDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const diff = differenceInDays(new Date(), date);
  if (diff < 7) {
    return format(date, 'EEEE');
  }
  if (diff < 365) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}
