import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Star, FileText } from 'lucide-react';
import { CallQualityRecord } from '@/utils/managerAnalytics';

interface CallQualityTableProps {
  rows: CallQualityRecord[];
  onInspect: (row: CallQualityRecord) => void;
}

export function CallQualityTable({ rows, onInspect }: CallQualityTableProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'text-green-600 bg-green-50';
    if (score >= 3.0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'sales_call':
        return 'bg-blue-100 text-blue-700';
      case 'customer_support':
        return 'bg-green-100 text-green-700';
      case 'team_meeting':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (rows.length === 0) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No call data</h3>
            <p className="text-sm">Adjust your filters to see call quality data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            Call Quality Analysis
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {rows.length} calls
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Call Details
                </th>
                <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date & Duration
                </th>
                <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Score
                </th>
                <th className="text-center pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {row.title}
                      </h3>
                      {row.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {row.description}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-sm text-gray-900">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>{formatDate(row.createdAt)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDuration(row.duration)}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 pr-4">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getContentTypeColor(row.contentType)}`}
                    >
                      {row.contentType.replace('_', ' ')}
                    </Badge>
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium ${getScoreColor(row.score)}`}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {row.score.toFixed(1)}
                      </Badge>
                    </div>
                  </td>

                  <td className="py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onInspect(row)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900">{rows.length}</p>
              <p className="text-xs text-gray-500">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900">
                {(rows.reduce((sum, row) => sum + row.score, 0) / rows.length).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Average Score</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900">
                {Math.round(rows.reduce((sum, row) => sum + row.duration, 0) / 60)}m
              </p>
              <p className="text-xs text-gray-500">Total Duration</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}