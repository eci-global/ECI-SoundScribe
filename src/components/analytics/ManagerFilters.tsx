import React, { useMemo } from 'react';
import { Filter, Users, Layers, Calendar, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ManagerFilterState } from '@/utils/managerAnalytics';

export interface EmployeeOption {
  id: string;
  name: string;
  team?: string;
}

export interface ManagerFiltersProps {
  filters: ManagerFilterState;
  onChange: (filters: ManagerFilterState) => void;
  onReset: () => void;
  employees: EmployeeOption[];
  teams: string[];
  callTypes: string[];
}

function toggleListValue(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list.filter(item => item !== value);
  }
  return [...list, value];
}

export function ManagerFilters({ filters, onChange, onReset, employees, teams, callTypes }: ManagerFiltersProps) {
  const employeeLabel = useMemo(() => {
    if (!filters.selectedEmployees.length) {
      return 'All employees';
    }
    if (filters.selectedEmployees.length === 1) {
      const selected = employees.find(emp => emp.id === filters.selectedEmployees[0]);
      return selected ? selected.name : '1 employee';
    }
    return `${filters.selectedEmployees.length} employees`;
  }, [filters.selectedEmployees, employees]);

  const teamLabel = useMemo(() => {
    if (!filters.selectedTeams.length) {
      return 'All teams';
    }
    if (filters.selectedTeams.length === 1) {
      return filters.selectedTeams[0];
    }
    return `${filters.selectedTeams.length} teams`;
  }, [filters.selectedTeams]);

  const callTypeLabel = useMemo(() => {
    if (!filters.callTypes.length) {
      return 'All call types';
    }
    if (filters.callTypes.length === 1) {
      return filters.callTypes[0];
    }
    return `${filters.callTypes.length} selected`;
  }, [filters.callTypes]);

  const dateFrom = filters.dateRange?.start?.slice(0, 10) ?? '';
  const dateTo = filters.dateRange?.end?.slice(0, 10) ?? '';

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-gray-500 hover:text-red-600">
          Reset
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-start">
              <Users className="mr-2 h-4 w-4 text-red-500" />
              <span className="truncate text-sm">{employeeLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Select employees</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {employees.map(employee => (
              <DropdownMenuCheckboxItem
                key={employee.id}
                checked={filters.selectedEmployees.includes(employee.id)}
                onCheckedChange={() =>
                  onChange({
                    ...filters,
                    selectedEmployees: toggleListValue(filters.selectedEmployees, employee.id),
                  })
                }
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                  <span className="text-xs text-gray-500">{employee.team || 'Unassigned'}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-start">
              <Layers className="mr-2 h-4 w-4 text-gray-500" />
              <span className="truncate text-sm">{teamLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Select teams</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map(team => (
              <DropdownMenuCheckboxItem
                key={team}
                checked={filters.selectedTeams.includes(team)}
                onCheckedChange={() =>
                  onChange({
                    ...filters,
                    selectedTeams: toggleListValue(filters.selectedTeams, team),
                  })
                }
              >
                {team}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-start">
              <Phone className="mr-2 h-4 w-4 text-gray-500" />
              <span className="truncate text-sm">{callTypeLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Call types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {callTypes.map(callType => (
              <DropdownMenuCheckboxItem
                key={callType}
                checked={filters.callTypes.includes(callType)}
                onCheckedChange={() =>
                  onChange({
                    ...filters,
                    callTypes: toggleListValue(filters.callTypes, callType),
                  })
                }
              >
                {callType}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <Calendar className="h-3 w-3" /> Date range
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={event =>
                onChange({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    start: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined,
                    end: filters.dateRange?.end,
                  },
                })
              }
            />
            <Input
              type="date"
              value={dateTo}
              onChange={event =>
                onChange({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    start: filters.dateRange?.start,
                    end: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,200px)]">
        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Search</label>
          <Input
            placeholder="Search calls, summaries or names"
            value={filters.search ?? ''}
            onChange={event =>
              onChange({
                ...filters,
                search: event.target.value,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Minimum score</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[filters.minScore ?? 0]}
              min={0}
              max={10}
              step={0.5}
              onValueChange={([value]) =>
                onChange({
                  ...filters,
                  minScore: value > 0 ? value : undefined,
                })
              }
            />
            <span className="w-10 text-right text-sm font-medium text-gray-700">
              {filters.minScore ?? 0}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.selectedEmployees.map(employeeId => {
            const employee = employees.find(item => item.id === employeeId);
            if (!employee) {
              return null;
            }
            return (
              <Badge key={employeeId} variant="secondary" className="gap-1">
                {employee.name}
                <button
                  type="button"
                  className="ml-1 text-xs"
                  onClick={() =>
                    onChange({
                      ...filters,
                      selectedEmployees: filters.selectedEmployees.filter(id => id !== employeeId),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {filters.selectedTeams.map(team => (
            <Badge key={team} variant="outline" className="gap-1 text-gray-700">
              {team}
              <button
                type="button"
                className="ml-1 text-xs"
                onClick={() =>
                  onChange({
                    ...filters,
                    selectedTeams: filters.selectedTeams.filter(item => item !== team),
                  })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {(filters.minScore ?? 0) > 0 && (
            <Badge variant="outline" className="gap-1 text-gray-700">
              Min score {filters.minScore}
              <button
                type="button"
                className="ml-1 text-xs"
                onClick={() =>
                  onChange({
                    ...filters,
                    minScore: undefined,
                  })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.callTypes.map(type => (
            <Badge key={type} variant="outline" className="gap-1 text-gray-700">
              {type}
              <button
                type="button"
                className="ml-1 text-xs"
                onClick={() =>
                  onChange({
                    ...filters,
                    callTypes: filters.callTypes.filter(item => item !== type),
                  })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
