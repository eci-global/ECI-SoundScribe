import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram, BDRTrainingProgress } from '@/types/bdr-training';

interface BDRUserProgressTableProps {
  programs: BDRTrainingProgram[];
}

interface UserProgressData {
  userId: string;
  userName: string;
  userEmail: string;
  programId: string;
  programName: string;
  callsCompleted: number;
  averageScore?: number;
  latestScore?: number;
  bestScore?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  completionPercentage: number;
  lastActivityAt?: string;
  startedAt?: string;
  completedAt?: string;
}

const BDRUserProgressTable: React.FC<BDRUserProgressTableProps> = ({ programs }) => {
  const [progressData, setProgressData] = useState<UserProgressData[]>([]);
  const [filteredData, setFilteredData] = useState<UserProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');


  useEffect(() => {
    loadProgressData();
  }, [programs]);

  useEffect(() => {
    filterData();
  }, [progressData, searchTerm, statusFilter, programFilter]);

  const loadProgressData = async () => {
    try {
      setLoading(true);

      // Load user progress with profile information
      const { data: progressData, error: progressError } = await supabase
        .from('bdr_training_progress')
        .select(`
          *,
          profiles!bdr_training_progress_user_id_fkey(full_name, email),
          bdr_training_programs!bdr_training_progress_training_program_id_fkey(name)
        `);

      if (progressError) {
        console.error('Error loading progress data:', progressError);
        return;
      }

      const formattedData: UserProgressData[] = progressData?.map(progress => ({
        userId: progress.user_id,
        userName: progress.profiles?.full_name || 'Unknown User',
        userEmail: progress.profiles?.email || '',
        programId: progress.training_program_id,
        programName: progress.bdr_training_programs?.name || 'Unknown Program',
        callsCompleted: progress.calls_completed,
        averageScore: progress.average_score,
        latestScore: progress.latest_score,
        bestScore: progress.best_score,
        status: progress.status,
        completionPercentage: progress.completion_percentage,
        lastActivityAt: progress.last_activity_at,
        startedAt: progress.started_at,
        completedAt: progress.completed_at
      })) || [];

      setProgressData(formattedData);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...progressData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.programName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Program filter
    if (programFilter !== 'all') {
      filtered = filtered.filter(item => item.programId === programFilter);
    }

    setFilteredData(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: 'Not Started', variant: 'secondary' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      paused: { label: 'Paused', variant: 'outline' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return <span className="text-gray-400">-</span>;
    
    const color = score >= 90 ? 'text-green-600' : 
                  score >= 75 ? 'text-blue-600' : 
                  score >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    return <span className={`font-medium ${color}`}>{score.toFixed(1)}%</span>;
  };

  const exportData = () => {
    const csvContent = [
      ['User Name', 'Email', 'Program', 'Calls Completed', 'Average Score', 'Latest Score', 'Best Score', 'Status', 'Completion %', 'Last Activity'].join(','),
      ...filteredData.map(item => [
        item.userName,
        item.userEmail,
        item.programName,
        item.callsCompleted,
        item.averageScore?.toFixed(1) || '',
        item.latestScore?.toFixed(1) || '',
        item.bestScore?.toFixed(1) || '',
        item.status,
        item.completionPercentage.toFixed(1),
        item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bdr-training-progress-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Progress Tracking</CardTitle>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users, emails, or programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(program => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredData.filter(d => d.status === 'completed').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {filteredData.filter(d => d.status === 'in_progress').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredData.length > 0 ? 
                    (filteredData
                      .filter(d => d.averageScore)
                      .reduce((sum, d) => sum + (d.averageScore || 0), 0) / 
                     filteredData.filter(d => d.averageScore).length
                    ).toFixed(1) + '%' : '-'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Progress Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead>Best</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow key={`${item.userId}-${item.programId}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.userName}</p>
                      <p className="text-sm text-gray-600">{item.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.programName}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.callsCompleted}</span>
                  </TableCell>
                  <TableCell>{getScoreBadge(item.averageScore)}</TableCell>
                  <TableCell>{getScoreBadge(item.latestScore)}</TableCell>
                  <TableCell>{getScoreBadge(item.bestScore)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={item.completionPercentage} className="w-20" />
                      <p className="text-xs text-gray-600">{item.completionPercentage.toFixed(0)}%</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    {item.lastActivityAt ? (
                      <span className="text-sm text-gray-600">
                        {new Date(item.lastActivityAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No progress data found matching your filters.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BDRUserProgressTable;