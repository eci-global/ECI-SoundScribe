import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Zap, 
  Activity, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Target
} from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import RealtimeProcessingPanel from './RealtimeProcessingPanel';
import SmartNotificationInbox from '../notifications/SmartNotificationInbox';
import { cn } from '@/lib/utils';

interface RealtimeAIDashboardProps {
  className?: string;
}

export default function RealtimeAIDashboard({ className }: RealtimeAIDashboardProps) {
  const { processingQueue, isProcessing } = useRealtimeAI();
  const { notifications, getUnreadCount, getNotificationsByPriority } = useSmartNotifications();

  const activeProcessing = processingQueue.filter(p => 
    p.status !== 'completed' && p.status !== 'failed'
  ).length;

  const completedToday = processingQueue.filter(p => {
    const today = new Date();
    const itemDate = new Date();
    return p.status === 'completed' && 
           itemDate.toDateString() === today.toDateString();
  }).length;

  const criticalNotifications = getNotificationsByPriority('critical').length;
  const highPriorityNotifications = getNotificationsByPriority('high').length;

  const averageProcessingTime = processingQueue.length > 0 
    ? Math.round(processingQueue.reduce((acc, p) => acc + (p.progress || 0), 0) / processingQueue.length)
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* AI Processing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Active Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{activeProcessing}</span>
              {isProcessing && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {activeProcessing > 0 ? 'AI analysis in progress' : 'No active processing'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{completedToday}</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recordings processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{getUnreadCount()}</span>
              {criticalNotifications > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalNotifications} critical
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              New notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Avg. Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{averageProcessingTime}%</span>
              <Progress value={averageProcessingTime} className="w-8 h-2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Processing Panel */}
        <RealtimeProcessingPanel />

        {/* Smart Notifications */}
        <SmartNotificationInbox />
      </div>

      {/* Priority Alerts */}
      {(criticalNotifications > 0 || highPriorityNotifications > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
              <Zap className="h-4 w-4" />
              Priority Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalNotifications > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-100 rounded border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    {criticalNotifications} critical alert{criticalNotifications > 1 ? 's' : ''} require immediate attention
                  </span>
                </div>
              )}
              
              {highPriorityNotifications > 0 && (
                <div className="flex items-center gap-2 p-2 bg-orange-100 rounded border border-orange-200">
                  <Target className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    {highPriorityNotifications} high-priority notification{highPriorityNotifications > 1 ? 's' : ''} pending review
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 