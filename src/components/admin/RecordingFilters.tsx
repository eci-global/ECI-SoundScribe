import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Team {
  id: string;
  name: string;
  department: string;
}

interface RecordingFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  teams: Team[];
  className?: string;
}

const RecordingFilters: React.FC<RecordingFiltersProps> = ({
  filters,
  onFiltersChange,
  teams,
  className
}) => {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      employeeName: '',
      teamId: 'all_teams',
      contentType: 'all_types',
      status: 'all_statuses',
      bdrScoreRange: [0, 4],
      dateRange: {
        from: '',
        to: ''
      }
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.employeeName) count++;
    if (filters.teamId && filters.teamId !== 'all_teams') count++;
    if (filters.contentType && filters.contentType !== 'all_types') count++;
    if (filters.status && filters.status !== 'all_statuses') count++;
    if (filters.bdrScoreRange[0] > 0 || filters.bdrScoreRange[1] < 4) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={cn("bg-white border-2 border-dashed border-eci-gray-200", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-eci-gray-600" />
            <h3 className="text-title font-semibold text-eci-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            disabled={activeFiltersCount === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-caption font-medium text-eci-gray-700">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Employee, customer, or content..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Employee Name */}
          <div className="space-y-2">
            <Label htmlFor="employeeName" className="text-caption font-medium text-eci-gray-700">
              Employee Name
            </Label>
            <Input
              id="employeeName"
              placeholder="Filter by employee..."
              value={filters.employeeName}
              onChange={(e) => updateFilter('employeeName', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Team */}
          <div className="space-y-2">
            <Label htmlFor="team" className="text-caption font-medium text-eci-gray-700">
              Team
            </Label>
            <Select
              value={filters.teamId}
              onValueChange={(value) => updateFilter('teamId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_teams">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="contentType" className="text-caption font-medium text-eci-gray-700">
              Call Type
            </Label>
            <Select
              value={filters.contentType}
              onValueChange={(value) => updateFilter('contentType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_types">All types</SelectItem>
                <SelectItem value="sales_call">Sales Call</SelectItem>
                <SelectItem value="customer_support">Customer Support</SelectItem>
                <SelectItem value="team_meeting">Team Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-caption font-medium text-eci-gray-700">
              Processing Status
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* BDR Score Range */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-caption font-medium text-eci-gray-700">
              BDR Score Range: {filters.bdrScoreRange[0]}.0 - {filters.bdrScoreRange[1]}.0
            </Label>
            <div className="px-2">
              <Slider
                value={filters.bdrScoreRange}
                onValueChange={(value) => updateFilter('bdrScoreRange', value)}
                max={4}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-caption text-eci-gray-500 mt-1">
                <span>0.0 (Poor)</span>
                <span>2.0 (Average)</span>
                <span>4.0 (Excellent)</span>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-caption font-medium text-eci-gray-700">
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={filters.dateRange.from}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    from: e.target.value
                  })}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={filters.dateRange.to}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    to: e.target.value
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="mt-6 pt-4 border-t border-eci-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption text-eci-gray-600">Active filters:</span>

              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <button onClick={() => updateFilter('search', '')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.employeeName && (
                <Badge variant="secondary" className="gap-1">
                  Employee: {filters.employeeName}
                  <button onClick={() => updateFilter('employeeName', '')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.teamId && filters.teamId !== 'all_teams' && (
                <Badge variant="secondary" className="gap-1">
                  Team: {teams.find(t => t.id === filters.teamId)?.name}
                  <button onClick={() => updateFilter('teamId', 'all_teams')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.contentType && filters.contentType !== 'all_types' && (
                <Badge variant="secondary" className="gap-1">
                  Type: {filters.contentType.replace('_', ' ')}
                  <button onClick={() => updateFilter('contentType', 'all_types')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.status && filters.status !== 'all_statuses' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <button onClick={() => updateFilter('status', 'all_statuses')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {(filters.bdrScoreRange[0] > 0 || filters.bdrScoreRange[1] < 4) && (
                <Badge variant="secondary" className="gap-1">
                  BDR: {filters.bdrScoreRange[0]}-{filters.bdrScoreRange[1]}
                  <button onClick={() => updateFilter('bdrScoreRange', [0, 4])}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {(filters.dateRange.from || filters.dateRange.to) && (
                <Badge variant="secondary" className="gap-1">
                  Date: {filters.dateRange.from || '...'} to {filters.dateRange.to || '...'}
                  <button onClick={() => updateFilter('dateRange', { from: '', to: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecordingFilters;