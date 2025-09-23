import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Target, 
  Award, 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  FileText,
  Star,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { formatDistanceToNow } from 'date-fns';

interface RecentCallsWidgetProps {
  recordings: Recording[];
  onRecordingClick: (id: string) => void;
}

export function RecentCallsWidget({ recordings, onRecordingClick }: RecentCallsWidgetProps) {
  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'BANT':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'MEDDIC':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'SPICED':
        return <Zap className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInsightIcon = (score: number, hasFramework: boolean) => {
    if (!hasFramework) return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    if (score >= 8) return <Star className="w-4 h-4 text-green-600" />;
    if (score >= 6) return <TrendingUp className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Get AI insights for each call
  const getCallInsight = (recording: Recording) => {
    const score = recording.coaching_evaluation?.overallScore || 0;
    const framework = (recording as any).primary_framework;
    
    if (!framework) {
      return {
        type: 'info',
        message: 'No framework analysis available'
      };
    }

    if (score >= 8) {
      return {
        type: 'success',
        message: `Excellent ${framework} execution - great discovery work!`
      };
    } else if (score >= 6) {
      return {
        type: 'warning',
        message: `Good ${framework} foundation - focus on pain quantification`
      };
    } else {
      return {
        type: 'error',
        message: `${framework} needs work - review qualification basics`
      };
    }
  };

  // Sort recordings by created date and take the most recent
  const recentRecordings = recordings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Phone className="w-5 h-5 text-blue-600" />
            <span>Recent Calls</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/recordings'}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recentRecordings.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">No recordings yet</p>
            <p className="text-sm text-gray-400">Upload your first call to get AI coaching insights</p>
          </div>
        ) : (
          recentRecordings.map((recording) => {
            const score = recording.coaching_evaluation?.overallScore || 0;
            const framework = (recording as any).primary_framework;
            const insight = getCallInsight(recording);
            
            return (
              <div
                key={recording.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onRecordingClick(recording.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-1">{recording.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}</span>
                      </div>
                      {recording.duration && (
                        <span className="text-xs text-gray-500">
                          {Math.round(recording.duration / 60)}min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {framework && getFrameworkIcon(framework)}
                    <Badge className={cn("text-xs", getStatusColor(recording.status))}>
                      {recording.status}
                    </Badge>
                  </div>
                </div>

                {/* Score and Framework */}
                {recording.coaching_evaluation && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Score:</span>
                      <span className={cn("text-sm font-bold", getScoreColor(score))}>
                        {score.toFixed(1)}/10
                      </span>
                      {framework && (
                        <Badge variant="outline" className="text-xs">
                          {framework}
                        </Badge>
                      )}
                    </div>
                    {getInsightIcon(score, !!framework)}
                  </div>
                )}

                {/* AI Insight */}
                <div className={cn(
                  "p-2 rounded text-xs flex items-start space-x-2",
                  insight.type === 'success' ? 'bg-green-50 text-green-700' :
                  insight.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                  insight.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-700'
                )}>
                  {getInsightIcon(score, !!framework)}
                  <span className="flex-1">{insight.message}</span>
                </div>

                {/* Quick Actions */}
                {recording.status === 'completed' && (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      {recording.coaching_evaluation?.strengths?.length > 0 && (
                        <span>{recording.coaching_evaluation.strengths.length} strengths</span>
                      )}
                      {recording.coaching_evaluation?.strengths?.length > 0 && 
                       recording.coaching_evaluation?.improvements?.length > 0 && (
                        <span>•</span>
                      )}
                      {recording.coaching_evaluation?.improvements?.length > 0 && (
                        <span>{recording.coaching_evaluation.improvements.length} improvements</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Performance Summary */}
        {recentRecordings.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last 5 calls average:</span>
              <span className={cn(
                "font-bold",
                getScoreColor(
                  recentRecordings
                    .filter(r => r.coaching_evaluation?.overallScore)
                    .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
                  recentRecordings.filter(r => r.coaching_evaluation?.overallScore).length || 0
                )
              )}>
                {(
                  recentRecordings
                    .filter(r => r.coaching_evaluation?.overallScore)
                    .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
                  recentRecordings.filter(r => r.coaching_evaluation?.overallScore).length || 0
                ).toFixed(1)}/10
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}