import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Filter,
  Download,
  Play,
  Pause,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Zap,
  Target,
  Users,
  Eye
} from 'lucide-react';

import RecordingFilters from '@/components/admin/RecordingFilters';
import RecordingBulkActions from '@/components/admin/RecordingBulkActions';
import { useManagerRecordings } from '@/hooks/useManagerRecordings';

// Types
interface Recording {
  id: string;
  title: string;
  employee_name: string;
  customer_name: string;
  content_type: 'sales_call' | 'customer_support' | 'team_meeting';
  status: 'completed' | 'processing' | 'failed' | 'uploading';
  duration: number;
  file_size: number;
  created_at: string;
  team_name: string;
  team_department: string;
  bdr_overall_score: number | null;
  bdr_opening_score: number | null;
  bdr_tone_energy_score: number | null;
  uploader_name: string;
  uploader_email: string;
}

interface FilterState {
  search: string;
  employeeName: string;
  teamId: string;
  contentType: string;
  status: string;
  bdrScoreRange: [number, number];
  dateRange: {
    from: string;
    to: string;
  };
}

const AllRecordings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [selectedRecordings, setSelectedRecordings] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    employeeName: searchParams.get('employee') || '',
    teamId: searchParams.get('team') || 'all_teams',
    contentType: searchParams.get('content_type') || 'all_types',
    status: searchParams.get('status') || 'all_statuses',
    bdrScoreRange: [0, 4],
    dateRange: {
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || ''
    }
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  // Custom hook for recordings data
  const {
    recordings,
    loading,
    error,
    totalCount,
    teams,
    refetch
  } = useManagerRecordings({
    filters,
    page: currentPage,
    limit: recordsPerPage
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'bdrScoreRange' && key !== 'dateRange') {
        params.set(key, String(value));
      }
    });

    if (filters.dateRange.from) params.set('from', filters.dateRange.from);
    if (filters.dateRange.to) params.set('to', filters.dateRange.to);

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Handlers
  const handleSelectAll = () => {
    if (selectedRecordings.length === recordings.length) {
      setSelectedRecordings([]);
    } else {
      setSelectedRecordings(recordings.map(r => r.id));
    }
  };

  const handleSelectRecording = (recordingId: string) => {
    setSelectedRecordings(prev =>
      prev.includes(recordingId)
        ? prev.filter(id => id !== recordingId)
        : [...prev, recordingId]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Recordings refreshed",
        description: `Updated ${recordings.length} recordings`
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh recordings data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      uploading: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const icons = {
      completed: <CheckCircle2 className="h-3 w-3" />,
      processing: <Clock className="h-3 w-3 animate-spin" />,
      failed: <XCircle className="h-3 w-3" />,
      uploading: <RefreshCw className="h-3 w-3 animate-spin" />
    };

    return (
      <Badge className={`${variants[status as keyof typeof variants]} flex items-center gap-1`}>
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const getContentTypeBadge = (contentType: string) => {
    const variants = {
      sales_call: 'bg-blue-100 text-blue-800 border-blue-200',
      customer_support: 'bg-green-100 text-green-800 border-green-200',
      team_meeting: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    const labels = {
      sales_call: 'Sales',
      customer_support: 'Support',
      team_meeting: 'Meeting'
    };

    return (
      <Badge className={variants[contentType as keyof typeof variants]}>
        {labels[contentType as keyof typeof labels] || contentType}
      </Badge>
    );
  };

  const getBDRScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-gray-400">—</span>;

    let variant = '';
    if (score >= 3.5) variant = 'bg-green-100 text-green-800 border-green-200';
    else if (score >= 2.5) variant = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    else variant = 'bg-red-100 text-red-800 border-red-200';

    return (
      <Badge className={`${variant} flex items-center gap-1`}>
        <Target className="h-3 w-3" />
        {score.toFixed(1)}
      </Badge>
    );
  };

  // Show bulk actions when recordings are selected
  useEffect(() => {
    setShowBulkActions(selectedRecordings.length > 0);
  }, [selectedRecordings]);

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-display text-eci-gray-900 mb-2">All Recordings</h1>
                <p className="text-body text-eci-gray-600">
                  Comprehensive view of team recordings with advanced filtering and management
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600">Total Recordings</p>
                    <p className="text-title font-semibold text-eci-gray-900">{totalCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600">Processed</p>
                    <p className="text-title font-semibold text-eci-gray-900">
                      {recordings.filter(r => r.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600">Processing</p>
                    <p className="text-title font-semibold text-eci-gray-900">
                      {recordings.filter(r => r.status === 'processing').length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-caption text-eci-gray-600">Active Teams</p>
                    <p className="text-title font-semibold text-eci-gray-900">{teams.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <RecordingFilters
              filters={filters}
              onFiltersChange={setFilters}
              teams={teams}
              className="mb-6"
            />
          )}

          {/* Bulk Actions */}
          {showBulkActions && (
            <RecordingBulkActions
              selectedRecordings={selectedRecordings}
              recordings={recordings}
              onSelectionChange={setSelectedRecordings}
              onRefresh={refetch}
              className="mb-6"
            />
          )}

          {/* Recordings Table */}
          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title font-semibold text-eci-gray-900">
                  Recordings ({totalCount})
                </h2>

                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-caption text-eci-gray-600">Live Updates</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">Error loading recordings: {error}</p>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eci-red mx-auto"></div>
                  <p className="mt-2 text-body-small text-eci-gray-600">Loading recordings...</p>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-eci-gray-300 mx-auto mb-3" />
                  <p className="text-body text-eci-gray-600">No recordings found</p>
                  <p className="text-body-small text-eci-gray-500 mt-1">
                    Try adjusting your filters or refresh the page
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-eci-gray-200">
                        <th className="text-left py-3 px-4">
                          <Checkbox
                            checked={selectedRecordings.length === recordings.length && recordings.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Recording
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Employee
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Customer
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          BDR Score
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Duration
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Created
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">
                          Team
                        </th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.map((recording) => (
                        <tr
                          key={recording.id}
                          className={`border-b border-eci-gray-100 hover:bg-eci-gray-50 transition-colors ${
                            selectedRecordings.includes(recording.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedRecordings.includes(recording.id)}
                              onCheckedChange={() => handleSelectRecording(recording.id)}
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Play className="h-4 w-4 text-eci-gray-400" />
                              <div>
                                <button
                                  onClick={() => navigate(`/summaries/${recording.id}`)}
                                  className="text-body text-eci-gray-900 font-medium hover:text-blue-600 hover:underline transition-colors text-left flex items-center gap-1 group"
                                  title="Click to view recording details"
                                >
                                  {recording.title}
                                  <Eye className="h-3 w-3 text-eci-gray-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                                <div className="text-caption text-eci-gray-500">
                                  {formatBytes(recording.file_size)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-eci-gray-400" />
                              <span className="text-body text-eci-gray-900">
                                {recording.employee_name || 'Unknown'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-body text-eci-gray-600">
                              {recording.customer_name || '—'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {getContentTypeBadge(recording.content_type)}
                          </td>

                          <td className="py-3 px-4">
                            {getBDRScoreBadge(recording.bdr_overall_score)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-600">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration || 0)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {getStatusBadge(recording.status)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-600">
                              <Calendar className="h-3 w-3" />
                              {new Date(recording.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-body text-eci-gray-600">
                              {recording.team_name || '—'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalCount > recordsPerPage && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-eci-gray-200">
                  <p className="text-body-small text-eci-gray-600">
                    Showing {(currentPage - 1) * recordsPerPage + 1}-{Math.min(currentPage * recordsPerPage, totalCount)} of {totalCount} recordings
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <span className="text-body-small text-eci-gray-600 px-3">
                      Page {currentPage} of {Math.ceil(totalCount / recordsPerPage)}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalCount / recordsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AllRecordings;