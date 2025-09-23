import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bell, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  TrendingUp,
  ExternalLink,
  X,
  Eye,
  Filter
} from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface SmartNotificationInboxProps {
  className?: string;
  compact?: boolean;
}

export default function SmartNotificationInbox({ 
  className, 
  compact = false 
}: SmartNotificationInboxProps) {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    getUnreadCount
  } = useSmartNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'critical'>('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ai_insight':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'coaching_alert':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'processing_complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'action_required':
        return <Target className="h-4 w-4 text-red-500" />;
      case 'performance_trend':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high';
      case 'critical':
        return notification.priority === 'critical';
      default:
        return true;
    }
  });

  const unreadCount = getUnreadCount();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          {!compact && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className="h-7 px-2 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                {filter === 'all' ? 'All' : 'Unread'}
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Read All
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">
              AI insights will appear here as recordings are processed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.slice(0, compact ? 5 : 20).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "border rounded-lg p-3 transition-all duration-200",
                  !notification.read 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "bg-gray-50 border-gray-200",
                  "hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(notification.priority))}
                        >
                          {notification.priority}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {/* Metadata display */}
                      {notification.metadata && (
                        <div className="text-xs text-gray-500 mb-2">
                          {notification.metadata.insights && (
                            <div>
                              <span className="font-medium">Key insights:</span>
                              <ul className="list-disc list-inside ml-2 mt-1">
                                {notification.metadata.insights.slice(0, 2).map((insight: string, idx: number) => (
                                  <li key={idx} className="truncate">{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {notification.metadata.actionItems && (
                            <div>
                              <span className="font-medium">Action items:</span>
                              <ul className="list-disc list-inside ml-2 mt-1">
                                {notification.metadata.actionItems.slice(0, 2).map((item: string, idx: number) => (
                                  <li key={idx} className="truncate">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {notification.actionUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <Link to={notification.actionUrl}>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Link>
                            </Button>
                          )}
                          
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissNotification(notification.id)}
                            className="h-6 px-2 text-xs text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 