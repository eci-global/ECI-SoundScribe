import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  MessageSquare,
  Calendar,
  Star,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import type { EmployeeListResponse, EmployeeSearchResult, EmployeeSearchFilters } from '@/types/employee';

const EmployeeDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EmployeeSearchFilters>({});
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'calls' | 'recent'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadEmployees();
  }, [filters]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.log('Loading employees with filters:', filters);
      const response = await EmployeeService.getEmployees(filters);
      console.log('EmployeeService response:', response);
      setEmployees(response.employees);
      console.log('Set employees:', response.employees);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (key: keyof EmployeeSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getScoreTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getScoreTrendText = (trend: number) => {
    if (trend > 0.1) return 'Improving';
    if (trend < -0.1) return 'Declining';
    return 'Stable';
  };

  const getScoreTrendColor = (trend: number) => {
    if (trend > 0.1) return 'text-green-600';
    if (trend < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  const filteredEmployees = employees.filter(employee => {
    if (!searchTerm) return true;
    const hay = `${employee.employee.first_name} ${employee.employee.last_name} ${employee.employee.email} ${employee.employee.role || ''} ${employee.employee.department || ''}`.toLowerCase();
    return hay.includes(searchTerm.toLowerCase());
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.performance_summary.current_score - a.performance_summary.current_score;
      case 'calls':
        return b.performance_summary.total_calls - a.performance_summary.total_calls;
      case 'recent':
        return new Date(b.performance_summary.last_evaluation_date).getTime() - 
               new Date(a.performance_summary.last_evaluation_date).getTime();
      default:
        return `${a.employee.first_name} ${a.employee.last_name}`.localeCompare(
          `${b.employee.first_name} ${b.employee.last_name}`
        );
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Directory</h1>
          <p className="text-gray-600">Manage and track employee performance</p>
        </div>
        <Button onClick={() => window.location.href = '/employees'}>
          Add Employee
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select onValueChange={(value) => handleFilterChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilterChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="BDR">BDR</SelectItem>
                <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                <SelectItem value="Support Agent">Support Agent</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="calls">Total Calls</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {employees.length} employees found
        </div>
      </div>

      {/* Employee Cards */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEmployees.map((employeeData) => (
            <Card 
              key={employeeData.employee.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/employees/profile/${employeeData.employee.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {employeeData.employee.first_name} {employeeData.employee.last_name}
                    </CardTitle>
                    <CardDescription>
                      {employeeData.employee.role} • {employeeData.employee.department}
                    </CardDescription>
                  </div>
                  <Badge variant={employeeData.employee.status === 'active' ? 'default' : 'secondary'}>
                    {employeeData.employee.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Performance Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">
                        {employeeData.performance_summary.current_score.toFixed(1)}
                      </span>
                      {getScoreTrendIcon(employeeData.performance_summary.score_trend)}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{employeeData.performance_summary.total_calls} calls</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span>{employeeData.performance_summary.coaching_notes_count} sessions</span>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="text-xs text-gray-600">
                    {employeeData.recent_activity}
                  </div>

                  {/* Strengths Preview */}
                  {employeeData.performance_summary.recent_strengths.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-1 text-xs font-medium text-green-700 mb-1">
                        <Star className="h-3 w-3" />
                        <span>Top Strength</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {employeeData.performance_summary.recent_strengths[0]}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEmployees.map((employeeData) => (
            <Card 
              key={employeeData.employee.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/employees/profile/${employeeData.employee.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {employeeData.employee.first_name} {employeeData.employee.last_name}
                        </h3>
                        <p className="text-gray-600">
                          {employeeData.employee.role} • {employeeData.employee.department}
                        </p>
                      </div>
                      <Badge variant={employeeData.employee.status === 'active' ? 'default' : 'secondary'}>
                        {employeeData.employee.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Score */}
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {employeeData.performance_summary.current_score.toFixed(1)}
                      </div>
                      <div className="flex items-center space-x-1 text-xs">
                        {getScoreTrendIcon(employeeData.performance_summary.score_trend)}
                        <span className={getScoreTrendColor(employeeData.performance_summary.score_trend)}>
                          {getScoreTrendText(employeeData.performance_summary.score_trend)}
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{employeeData.performance_summary.total_calls}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{employeeData.performance_summary.coaching_notes_count}</span>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="text-sm text-gray-500">
                      {employeeData.recent_activity}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {employees.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or add a new employee.
          </p>
          <Button onClick={() => window.location.href = '/employees'}>
            Add Employee
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
