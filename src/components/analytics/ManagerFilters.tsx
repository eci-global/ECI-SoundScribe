import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, Search, X, Users, Target } from 'lucide-react';
import { ManagerFilterState } from '@/utils/managerAnalytics';

export interface EmployeeOption {
  id: string;
  name: string;
  team: string;
}

interface ManagerFiltersProps {
  filters: ManagerFilterState;
  onChange: (filters: ManagerFilterState) => void;
  onReset: () => void;
  employees: EmployeeOption[];
  teams: string[];
  callTypes: string[];
}

export function ManagerFilters({
  filters,
  onChange,
  onReset,
  employees,
  teams,
  callTypes
}: ManagerFiltersProps) {
  const updateFilters = (updates: Partial<ManagerFilterState>) => {
    onChange({ ...filters, ...updates });
  };

  const toggleEmployee = (employeeId: string) => {
    const selected = filters.selectedEmployees.includes(employeeId)
      ? filters.selectedEmployees.filter(id => id !== employeeId)
      : [...filters.selectedEmployees, employeeId];
    updateFilters({ selectedEmployees: selected });
  };

  const toggleTeam = (team: string) => {
    const selected = filters.selectedTeams.includes(team)
      ? filters.selectedTeams.filter(t => t !== team)
      : [...filters.selectedTeams, team];
    updateFilters({ selectedTeams: selected });
  };

  const toggleCallType = (callType: string) => {
    const selected = filters.callTypes.includes(callType)
      ? filters.callTypes.filter(t => t !== callType)
      : [...filters.callTypes, callType];
    updateFilters({ callTypes: selected });
  };

  const activeFiltersCount =
    filters.selectedEmployees.length +
    filters.selectedTeams.length +
    filters.callTypes.length +
    (filters.search ? 1 : 0) +
    (filters.minScore ? 1 : 0);

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg font-semibold text-gray-900">
              Filters
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search recordings..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filters.dateRange.start.split('T')[0]}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, start: e.target.value + 'T00:00:00.000Z' }
              })}
            />
            <Input
              type="date"
              value={filters.dateRange.end.split('T')[0]}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, end: e.target.value + 'T23:59:59.999Z' }
              })}
            />
          </div>
        </div>

        {/* Employees */}
        {employees.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees ({filters.selectedEmployees.length} selected)
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.selectedEmployees.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">
                    {employee.name} ({employee.team})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Teams ({filters.selectedTeams.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Badge
                  key={team}
                  variant={filters.selectedTeams.includes(team) ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    filters.selectedTeams.includes(team)
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => toggleTeam(team)}
                >
                  {team}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Call Types */}
        {callTypes.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Call Types ({filters.callTypes.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {callTypes.map((callType) => (
                <Badge
                  key={callType}
                  variant={filters.callTypes.includes(callType) ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    filters.callTypes.includes(callType)
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => toggleCallType(callType)}
                >
                  {callType}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Minimum Score */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Minimum Score
          </label>
          <Input
            type="number"
            placeholder="e.g., 3.0"
            value={filters.minScore || ''}
            onChange={(e) => updateFilters({
              minScore: e.target.value ? parseFloat(e.target.value) : undefined
            })}
            step="0.1"
            min="0"
            max="5"
          />
        </div>
      </CardContent>
    </Card>
  );
}