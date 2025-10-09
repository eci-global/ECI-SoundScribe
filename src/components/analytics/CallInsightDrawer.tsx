import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Star, Phone, User, Calendar, FileText, PlayCircle, X } from 'lucide-react';
import { CallQualityRecord } from '@/utils/managerAnalytics';

interface CallInsightDrawerProps {
  record: CallQualityRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallInsightDrawer({ record, open, onOpenChange }: CallInsightDrawerProps) {
  if (!record) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3.0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
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

  // Mock additional data that would typically come from the full recording
  const mockInsights = {
    transcript: 'This is a sample transcript excerpt. The full transcript would show the complete conversation...',
    keyMoments: [
      { time: 120, description: 'Opening and introduction' },
      { time: 300, description: 'Problem identification' },
      { time: 480, description: 'Solution presentation' },
      { time: 600, description: 'Closing and next steps' },
    ],
    strengths: ['Clear communication', 'Active listening', 'Professional tone'],
    improvements: ['Follow-up questions', 'Solution depth', 'Time management'],
    tags: ['follow-up-needed', 'high-priority', 'customer-satisfaction'],
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-2xl sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold text-gray-900 line-clamp-2">
                {record.title}
              </SheetTitle>
              <SheetDescription className="mt-2">
                Deep dive analysis for this call recording
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Call Overview */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-600" />
                Call Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatDate(record.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatDuration(record.duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={`${getContentTypeColor(record.contentType)}`}
                >
                  {record.contentType.replace('_', ' ')}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`border ${getScoreColor(record.score)}`}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {record.score.toFixed(1)}/5.0
                </Badge>
              </div>

              {record.description && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-700">{record.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Score Breakdown */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-gray-600" />
                Quality Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Communication', 'Problem Solving', 'Professionalism', 'Follow-through'].map((criteria, index) => {
                  const score = record.score + (Math.random() - 0.5) * 1; // Mock individual scores
                  const normalizedScore = Math.max(1, Math.min(5, score));
                  return (
                    <div key={criteria} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{criteria}</span>
                        <span className="text-gray-600">{normalizedScore.toFixed(1)}/5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            normalizedScore >= 4 ? 'bg-green-500' :
                            normalizedScore >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(normalizedScore / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Key Moments */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-gray-600" />
                Key Moments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockInsights.keyMoments.map((moment, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      {formatDuration(moment.time)}
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{moment.description}</span>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border border-green-200 bg-green-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-green-900">
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockInsights.strengths.map((strength, index) => (
                    <Badge key={index} variant="secondary" className="bg-green-100 text-green-700 mr-2 mb-2">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-orange-200 bg-orange-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-orange-900">
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockInsights.improvements.map((improvement, index) => (
                    <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-700 mr-2 mb-2">
                      {improvement}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transcript Preview */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Transcript Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 italic">
                  {mockInsights.transcript}
                </p>
                <Button variant="link" className="mt-2 p-0 text-blue-600 hover:text-blue-700">
                  View full transcript →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockInsights.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button className="flex-1">
              Schedule Follow-up
            </Button>
            <Button variant="outline" className="flex-1">
              Export Report
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}