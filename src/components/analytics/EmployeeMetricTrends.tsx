import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Phone, Target } from 'lucide-react';
import type { Recording } from '@/types/recording';
import { EmployeeSummary } from '@/utils/managerAnalytics';

interface EmployeeMetricTrendsProps {
  recordings: Recording[];
  employees: EmployeeSummary[];
}

export function EmployeeMetricTrends({ recordings, employees }: EmployeeMetricTrendsProps) {
  // Calculate trends from recordings data
  const calculateTrends = () => {
    const last30Days = recordings.filter(r =>
      new Date(r.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const last7Days = recordings.filter(r =>
      new Date(r.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      totalCalls30Days: last30Days.length,
      totalCalls7Days: last7Days.length,
      avgCallsPerDay: last30Days.length / 30,
      avgCallsPerWeek: last7Days.length,
    };
  };

  const trends = calculateTrends();

  // Simple chart data simulation
  const chartData = [
    { day: 'Mon', calls: 12, score: 4.2 },
    { day: 'Tue', calls: 15, score: 4.1 },
    { day: 'Wed', calls: 18, score: 4.3 },
    { day: 'Thu', calls: 14, score: 4.0 },
    { day: 'Fri', calls: 20, score: 4.4 },
    { day: 'Sat', calls: 8, score: 4.2 },
    { day: 'Sun', calls: 5, score: 4.1 },
  ];

  const maxCalls = Math.max(...chartData.map(d => d.calls));
  const maxScore = 5.0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Calls (30 days)</p>
              <p className="text-lg font-semibold text-gray-900">{trends.totalCalls30Days}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-50 p-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Calls (7 days)</p>
              <p className="text-lg font-semibold text-gray-900">{trends.totalCalls7Days}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-purple-50 p-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg/Day</p>
              <p className="text-lg font-semibold text-gray-900">{trends.avgCallsPerDay.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-orange-50 p-2">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Employees</p>
              <p className="text-lg font-semibold text-gray-900">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Call Volume Chart */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Call Volume Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">{data.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(data.calls / maxCalls) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{data.calls}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Trend Chart */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">{data.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(data.score / maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{data.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Top Performers This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.slice(0, 5).map((employee, index) => (
              <div key={employee.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{employee.employeeName}</p>
                    <p className="text-xs text-gray-500">{employee.team}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{employee.averageScore.toFixed(1)}/5.0</p>
                  <p className="text-xs text-gray-500">{employee.totalCalls} calls</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}