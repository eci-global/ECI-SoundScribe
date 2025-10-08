import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallQualityRecord } from '@/utils/managerAnalytics';
import { Clock, ArrowRight } from 'lucide-react';

interface CallQualityTableProps {
  rows: CallQualityRecord[];
  onInspect: (record: CallQualityRecord) => void;
}

const riskTone: Record<CallQualityRecord['riskLevel'], string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function CallQualityTable({ rows, onInspect }: CallQualityTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        No calls found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-48">Employee</TableHead>
            <TableHead>Call type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Recorded</TableHead>
            <TableHead>Focus</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const createdAt = new Date(row.recordedAt);
            const recordedLabel = `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            return (
              <TableRow key={row.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">{row.employeeName}</span>
                    <span className="text-xs text-gray-500">{row.team}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{row.callType}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-gray-200 text-gray-600">
                    {row.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.score !== null ? (
                    <span className={row.score < 6 ? 'text-rose-600 font-semibold' : 'text-gray-900 font-semibold'}>
                      {row.score}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{recordedLabel}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {row.focusArea ? (
                    <Badge variant="outline" className="border-gray-200 text-gray-700">
                      {row.focusArea}
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant="outline" className={riskTone[row.riskLevel]}>
                      {row.riskLevel.toUpperCase()}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => onInspect(row)}>
                      Inspect
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
