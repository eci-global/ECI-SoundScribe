import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Calendar, User, Target, CheckCircle, AlertCircle, Clock, Eye, Filter, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';

interface BDRUploadRecord {
  id: string;
  filename: string;
  upload_status: string;
  processed_count: number;
  total_count: number;
  upload_metadata: {
    user_id?: string;
    training_program_id?: string;
    upload_id?: string;
    average_score?: number;
    latest_score?: number;
    best_score?: number;
    individual_scores?: number[];
    upload_date?: string;
    data_format?: string;
    evaluations_created?: number;
    recordings_matched?: number;
    skipped_records?: number;
  };
  created_at: string;
}

interface BDRScorecardEvaluation {
  id: string;
  call_identifier: string;
  overall_score: number;
  coaching_notes: string;
  created_at: string;
  training_program?: {
    name: string;
  };
  recording?: {
    title: string;
  };
}

interface FilterOptions {
  status: string;
  dateRange: string;
  searchQuery: string;
}

const BDRScorecardUploadHistory = () => {
  const [uploads, setUploads] = useState<BDRUploadRecord[]>([]);
  const [evaluations, setEvaluations] = useState<BDRScorecardEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'uploads' | 'evaluations'>('uploads');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    searchQuery: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'uploads') {
        // Load upload tracking records
        const { data: uploadsData, error: uploadsError } = await supabase
          .from('bdr_upload_tracking')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (uploadsError) throw uploadsError;
        setUploads(uploadsData || []);
      } else {
        // Load BDR scorecard evaluations
        const { data: evaluationsData, error: evaluationsError } = await supabase
          .from('bdr_scorecard_evaluations')
          .select(`
            id,
            call_identifier,
            overall_score,
            coaching_notes,
            created_at,
            bdr_training_programs!training_program_id (
              name
            ),
            recordings!recording_id (
              title
            )
          `)
          .order('created_at', { ascending: false })
          .limit(200);

        if (evaluationsError) throw evaluationsError;
        setEvaluations(evaluationsData?.map(e => ({
          ...e,
          training_program: e.bdr_training_programs,
          recording: e.recordings
        })) || []);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load BDR scorecard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEvaluationSource = (coachingNotes: string) => {
    if (coachingNotes?.startsWith('Manager Assessment:')) {
      return { type: 'manager', label: 'Manager Review', color: 'bg-blue-100 text-blue-800' };
    }
    return { type: 'ai', label: 'AI Analysis', color: 'bg-purple-100 text-purple-800' };
  };

  const filteredUploads = uploads.filter(upload => {
    const matchesStatus = filters.status === 'all' || upload.upload_status === filters.status;
    const matchesSearch = filters.searchQuery === '' || 
      upload.filename.toLowerCase().includes(filters.searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (filters.dateRange !== 'all') {
      const uploadDate = new Date(upload.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = filters.searchQuery === '' || 
      evaluation.call_identifier?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      evaluation.recording?.title?.toLowerCase().includes(filters.searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (filters.dateRange !== 'all') {
      const evalDate = new Date(evaluation.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - evalDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  const exportData = () => {
    const dataToExport = activeTab === 'uploads' ? filteredUploads : filteredEvaluations;
    const csvContent = activeTab === 'uploads' 
      ? generateUploadsCsv(dataToExport as BDRUploadRecord[])
      : generateEvaluationsCsv(dataToExport as BDRScorecardEvaluation[]);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bdr-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateUploadsCsv = (uploads: BDRUploadRecord[]) => {
    const headers = ['Filename', 'Status', 'Upload Date', 'Processed Count', 'Total Count', 'Success Rate', 'Average Score'];
    const rows = uploads.map(upload => [
      upload.filename,
      upload.upload_status,
      new Date(upload.created_at).toLocaleString(),
      upload.processed_count,
      upload.total_count,
      upload.total_count > 0 ? `${((upload.processed_count / upload.total_count) * 100).toFixed(1)}%` : 'N/A',
      upload.upload_metadata?.average_score?.toFixed(2) || 'N/A'
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const generateEvaluationsCsv = (evaluations: BDRScorecardEvaluation[]) => {
    const headers = ['Call Identifier', 'Overall Score', 'Source Type', 'Created Date', 'Training Program', 'Recording Title'];
    const rows = evaluations.map(evaluation => [
      evaluation.call_identifier || 'Unknown',
      evaluation.overall_score?.toFixed(2) || 'N/A',
      getEvaluationSource(evaluation.coaching_notes).type,
      new Date(evaluation.created_at).toLocaleString(),
      evaluation.training_program?.name || 'Unknown',
      evaluation.recording?.title || 'No Recording Match'
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BDR Scorecard Upload History</h1>
            <p className="text-gray-600 mt-1">View and manage historical BDR scorecard uploads and evaluations</p>
          </div>
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'uploads', label: 'Upload History', icon: FileSpreadsheet },
              { id: 'evaluations', label: 'Scorecard Evaluations', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search files or calls..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>

              {activeTab === 'uploads' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ status: 'all', dateRange: 'all', searchQuery: '' })}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload History Tab */}
        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredUploads.length} of {uploads.length} upload records
            </div>

            {filteredUploads.map((upload) => (
              <Card key={upload.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{upload.filename}</h3>
                          {getStatusBadge(upload.upload_status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Upload Date</p>
                            <p className="font-medium">{new Date(upload.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Records Processed</p>
                            <p className="font-medium">{upload.processed_count} / {upload.total_count}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Success Rate</p>
                            <p className="font-medium">
                              {upload.total_count > 0 
                                ? `${((upload.processed_count / upload.total_count) * 100).toFixed(1)}%`
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Average Score</p>
                            <p className="font-medium">
                              {upload.upload_metadata?.average_score 
                                ? upload.upload_metadata.average_score.toFixed(2)
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>

                        {upload.upload_metadata && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            {upload.upload_metadata.data_format && (
                              <div>
                                <span className="font-medium">Format:</span> {upload.upload_metadata.data_format}
                              </div>
                            )}
                            {upload.upload_metadata.evaluations_created !== undefined && (
                              <div>
                                <span className="font-medium">Evaluations Created:</span> {upload.upload_metadata.evaluations_created}
                              </div>
                            )}
                            {upload.upload_metadata.recordings_matched !== undefined && (
                              <div>
                                <span className="font-medium">Recordings Matched:</span> {upload.upload_metadata.recordings_matched}
                              </div>
                            )}
                            {upload.upload_metadata.skipped_records !== undefined && (
                              <div>
                                <span className="font-medium">Skipped Records:</span> {upload.upload_metadata.skipped_records}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredUploads.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Upload Records Found</h3>
                  <p className="text-gray-600">No BDR scorecard uploads match the current filters.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Evaluations Tab */}
        {activeTab === 'evaluations' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredEvaluations.length} of {evaluations.length} evaluation records
            </div>

            {filteredEvaluations.map((evaluation) => {
              const source = getEvaluationSource(evaluation.coaching_notes);
              return (
                <Card key={evaluation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Target className="h-8 w-8 text-purple-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {evaluation.call_identifier || 'Unknown Call'}
                            </h3>
                            <Badge className={source.color}>
                              {source.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Overall Score</p>
                              <p className="font-medium text-lg">
                                {evaluation.overall_score?.toFixed(1) || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Evaluation Date</p>
                              <p className="font-medium">{new Date(evaluation.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Training Program</p>
                              <p className="font-medium">{evaluation.training_program?.name || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Recording</p>
                              <p className="font-medium text-xs">
                                {evaluation.recording?.title || 'No Recording Match'}
                              </p>
                            </div>
                          </div>

                          {evaluation.coaching_notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-600 mb-1">Coaching Notes:</p>
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {evaluation.coaching_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredEvaluations.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Evaluations Found</h3>
                  <p className="text-gray-600">No BDR scorecard evaluations match the current filters.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BDRScorecardUploadHistory;