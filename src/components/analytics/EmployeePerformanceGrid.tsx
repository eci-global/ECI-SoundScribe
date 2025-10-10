import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowUpRight, Phone, Target } from 'lucide-react';
import { EmployeeSummary } from '@/utils/managerAnalytics';

interface EmployeePerformanceGridProps {
  employees: EmployeeSummary[];
  onSelectEmployee: (employeeId: string) => void;
}

export function EmployeePerformanceGrid({ employees, onSelectEmployee }: EmployeePerformanceGridProps) {
  if (employees.length === 0) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employee data</h3>
            <p className="text-sm">Adjust your filters to see employee performance data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Employee Performance</h2>
        <span className="text-xs text-gray-500">{employees.length} employees</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => {
          const trendColor = employee.recentScoreTrend >= 0 ? 'text-green-600' : 'text-red-600';
          const TrendIcon = employee.recentScoreTrend >= 0 ? TrendingUp : TrendingDown;

          return (
            <Card key={employee.employeeId} className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {employee.employeeName}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {employee.team}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectEmployee(employee.employeeId)}
                    className="text-gray-400 hover:text-gray-600 h-7 w-7 p-0"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">Calls</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{employee.totalCalls}</p>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">Score</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-base font-semibold text-gray-900">
                        {employee.averageScore.toFixed(1)}
                      </p>
                      <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {employee.strengths.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Top Strengths
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {employee.strengths.slice(0, 2).map((strength, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          {strength}
                        </Badge>
                      ))}
                      {employee.strengths.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{employee.strengths.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {employee.improvements.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Focus Areas
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {employee.improvements.slice(0, 2).map((improvement, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                        >
                          {improvement}
                        </Badge>
                      ))}
                      {employee.improvements.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{employee.improvements.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}