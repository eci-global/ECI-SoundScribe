import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CallQualityRecord } from '@/utils/managerAnalytics';
import { getCoachingImprovements, getCoachingStrengths } from '@/types/recording';
import { Separator } from '@/components/ui/separator';
import { Clock, CalendarDays } from 'lucide-react';

interface CallInsightDrawerProps {
  record?: CallQualityRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallInsightDrawer({ record, open, onOpenChange }: CallInsightDrawerProps) {
  const recording = record?.recording;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto border-gray-200 bg-white">
        <DrawerHeader className="space-y-2 border-b border-gray-100 pb-4">
          <DrawerTitle className="text-lg font-semibold text-gray-900">
            {recording?.title ?? 'Call insight'}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-gray-600">
            Review detailed metrics, highlights, and follow-up actions for this call.
          </DrawerDescription>
          {record ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge variant="outline" className="border-gray-200 text-gray-700">{record.employeeName}</Badge>
              <Badge variant="outline" className="border-gray-200 text-gray-700">{record.team}</Badge>
              <Badge variant="outline" className="border-gray-200 text-gray-700">{record.callType}</Badge>
              {record.score !== null ? (
                <Badge variant="outline" className={record.score < 6 ? 'border-rose-200 text-rose-600' : 'border-gray-200 text-gray-700'}>
                  Score {record.score}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-200 text-amber-600">Awaiting coaching</Badge>
              )}
            </div>
          ) : null}
        </DrawerHeader>

        {record && recording ? (
          <div className="space-y-6 p-6">
            <section className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CalendarDays className="h-3 w-3" />
                  <span>{new Date(record.recordedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round((recording.duration ?? 0) / 60)} mins</span>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                {recording.summary || recording.ai_summary || 'No summary generated for this call.'}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Focus areas</h3>
              <div className="flex flex-wrap gap-2">
                {getCoachingImprovements(recording).length ? (
                  getCoachingImprovements(recording).map((item, index) => (
                    <Badge key={`${recording.id}-improvement-${index}`} variant="outline" className="border-gray-200 text-gray-700">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No improvements captured.</span>
                )}
              </div>
              <Separator />
              <h3 className="text-sm font-semibold text-gray-900">Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {getCoachingStrengths(recording).length ? (
                  getCoachingStrengths(recording).map((item, index) => (
                    <Badge key={`${recording.id}-strength-${index}`} variant="outline" className="border-gray-200 text-gray-700">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No strengths captured.</span>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Action options</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Button variant="outline">Assign coaching follow-up</Button>
                <Button variant="outline">Share highlights</Button>
                <Button variant="outline">Export transcript</Button>
                <Button variant="outline">Schedule review</Button>
              </div>
            </section>
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-500">Select a call from the table to view insights.</div>
        )}

        <DrawerFooter className="border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
