import React from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecordingFilters } from '@/hooks/useRecordings';

interface FilterBarProps {
  filters: RecordingFilters;
  onFiltersChange: (filters: RecordingFilters) => void;
  totalCount?: number;
}

export default function FilterBar({ filters, onFiltersChange, totalCount }: FilterBarProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value === 'all' ? undefined : value });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ ...filters, dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ ...filters, dateTo: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-4">
      {/* Search and primary filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range filters */}
        <div className="flex gap-2">
          <Input
            type="date"
            placeholder="From date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="w-full md:w-[140px]"
          />
          <Input
            type="date"
            placeholder="To date"
            value={filters.dateTo || ''}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="w-full md:w-[140px]"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters and count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              {filters.search}
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {filters.status}
              <button
                onClick={() => handleStatusChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} to ${filters.dateTo}`
                : filters.dateFrom
                ? `From ${filters.dateFrom}`
                : `To ${filters.dateTo}`}
              <button
                onClick={() => {
                  handleDateFromChange('');
                  handleDateToChange('');
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>

        {totalCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            {totalCount} recording{totalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}