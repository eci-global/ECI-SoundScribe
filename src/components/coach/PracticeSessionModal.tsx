import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type PracticeSessionPayload = {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  focusAreas?: string[];
  actionItems?: string[];
  strengths?: string[];
  recording: any; // Recording type imported lazily to avoid circular deps
  mode?: 'sales' | 'support';
  supportingMetrics?: Array<{ label: string; value: number | string }>; 
};

interface Props {
  open: boolean;
  data?: PracticeSessionPayload;
  onOpenChange: (open: boolean) => void;
  onCompletePractice: (payload: PracticeSessionPayload) => void;
}

export default function PracticeSessionModal({ open, data, onOpenChange, onCompletePractice }: Props) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-xl bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Start Practice Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Practice focus</div>
            <div className="text-base font-medium text-gray-900">{data.title}</div>
            {data.description ? (
              <p className="mt-1 text-sm text-gray-600">{data.description}</p>
            ) : null}
          </div>

          {data.focusAreas && data.focusAreas.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-900">Focus areas</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                {data.focusAreas.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {data.actionItems && data.actionItems.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-900">Action items</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                {data.actionItems.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onCompletePractice(data)}>Log Practice</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

