import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeSummary } from '@/utils/managerAnalytics';
import { Sparkline } from '@/components/Sparkline';
import { Users, ArrowUpRight } from 'lucide-react';

interface EmployeePerformanceGridProps {
  employees: EmployeeSummary[];
  onSelectEmployee?: (employeeId: string) => void;
}

export function EmployeePerformanceGrid({ employees, onSelectEmployee }: EmployeePerformanceGridProps) {
  if (!employees.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        No employee activity found for the selected filters.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {employees.map(employee => (
        <Card key={employee.employeeId} className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-gray-900">{employee.employeeName}</CardTitle>
              <p className="text-xs text-gray-500">{employee.team}</p>
            </div>
            <Badge variant="outline" className="border-gray-200 text-gray-700">
              {employee.totalCalls} calls
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Avg score" value={employee.averageScore ?? '--'} accent={employee.averageScore !== null && employee.averageScore < 6 ? 'text-rose-600' : 'text-gray-900'} />
              <Metric label="Trend" value={`${employee.improvementRate >= 0 ? '+' : ''}${employee.improvementRate.toFixed(2)}`} accent={employee.improvementRate >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
              <Metric label="Coached" value={employee.coachedCalls} />
              <Metric label="Weekly volume" value={employee.callsThisWeek} />
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Score trend</span>
                <span>{employee.scoreTrend.length} data points</span>
              </div>
              <Sparkline data={employee.scoreTrend.length ? employee.scoreTrend : [0]} height={40} color="#dc2626" className="mt-2" />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              {employee.focusAreas.length ? (
                employee.focusAreas.map(area => (
                  <Badge key={`${employee.employeeId}-${area}`} variant="outline" className="border-gray-200 text-gray-700">
                    {area}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-gray-500">No focus areas captured yet.</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {employee.lastCallAt ? `Last call ${new Date(employee.lastCallAt).toLocaleDateString()}` : 'No recent calls'}
              </div>
              {onSelectEmployee ? (
                <Button size="sm" variant="outline" onClick={() => onSelectEmployee(employee.employeeId)}>
                  Focus
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
  accent?: string;
}

function Metric({ label, value, accent }: MetricProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${accent ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

