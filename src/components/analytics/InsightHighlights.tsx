import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ManagerKpis, EmployeeSummary } from '@/utils/managerAnalytics';
import { AlertCircle, Trophy, Activity, ArrowDownRight } from 'lucide-react';

interface InsightHighlightsProps {
  kpis: ManagerKpis;
  employees: EmployeeSummary[];
}

export function InsightHighlights({ kpis, employees }: InsightHighlightsProps) {
  const { topPerformer, needsAttention, coachingBacklog } = useMemo(() => {
    const sortedByScore = [...employees]
      .filter(employee => (employee.averageScore ?? 0) > 0)
      .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));

    const topPerformer = sortedByScore[0];
    const needsAttention = employees
      .filter(employee => (employee.averageScore ?? 0) > 0 && (employee.averageScore ?? 0) < 6)
      .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
      .slice(0, 3);

    const backlog = employees
      .filter(employee => employee.latestScore === null)
      .slice(0, 3);

    return {
      topPerformer,
      needsAttention,
      coachingBacklog: backlog,
    };
  }, [employees]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top performer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topPerformer ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">{topPerformer.employeeName}</p>
                <p className="text-xs text-gray-500">{topPerformer.team}</p>
              </div>
              <Badge variant="outline" className="border-gray-200 text-gray-900">
                {topPerformer.averageScore}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No scored calls yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            Needs attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {needsAttention.length ? (
            needsAttention.map(employee => (
              <div key={employee.employeeId} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{employee.employeeName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-rose-200 text-rose-600">
                    {employee.averageScore}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Trend {employee.improvementRate >= 0 ? '+' : ''}{employee.improvementRate.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">All coached employees are above threshold.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Activity className="h-4 w-4 text-red-500" />
            Coaching backlog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-gray-500">{kpis.coachedCalls} of {kpis.totalCalls} calls coached this period</p>
          {coachingBacklog.length ? (
            coachingBacklog.map(employee => (
              <div key={employee.employeeId} className="flex items-center justify-between text-sm text-gray-700">
                <span>{employee.employeeName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gray-200 text-gray-600">
                    {employee.totalCalls - employee.coachedCalls} pending
                  </Badge>
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No backlog detected. Great job keeping up with coaching!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
