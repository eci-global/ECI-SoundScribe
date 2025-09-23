import React, { useState, useEffect } from 'react';
import { Bell, Search, Check, Trash2, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import StandardLayout from '@/components/layout/StandardLayout';
import { useRecordings } from '@/hooks/useRecordings';
import type { RecordingListItem } from '@/hooks/useRecordings';

interface ProcessedNotification {
  id: string;
  type: 'new_recording' | 'processing' | 'completed' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  recordingId?: string;
}

export default function NotificationsInbox() {
  const [notifications, setNotifications] = useState<ProcessedNotification[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: recordings = [], isLoading, refetch } = useRecordings({});

  useEffect(() => {
    if (recordings.length > 0) {
      generateNotificationsFromRecordings(recordings);
    }
  }, [recordings]);

  const generateNotificationsFromRecordings = (recordingData: RecordingListItem[]) => {
    const generatedNotifications: ProcessedNotification[] = [];

    recordingData.forEach((recording) => {
      const recordingDate = new Date(recording.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - recordingDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only show notifications for recent recordings (last 30 days)
      if (daysDiff <= 30) {
        switch (recording.status) {
          case 'completed':
            generatedNotifications.push({
              id: `completed-${recording.id}`,
              type: 'completed',
              title: 'Recording Ready',
              message: `"${recording.title}" has been processed and is ready for review`,
              timestamp: recordingDate,
              read: daysDiff > 1, // Mark as read if older than 1 day
              recordingId: recording.id
            });
            break;
          case 'processing':
            generatedNotifications.push({
              id: `processing-${recording.id}`,
              type: 'processing',
              title: 'Processing Recording',
              message: `"${recording.title}" is currently being processed`,
              timestamp: recordingDate,
              read: false,
              recordingId: recording.id
            });
            break;
          case 'failed':
            generatedNotifications.push({
              id: `failed-${recording.id}`,
              type: 'error',
              title: 'Processing Failed',
              message: `Failed to process "${recording.title}". Please try uploading again.`,
              timestamp: recordingDate,
              read: false,
              recordingId: recording.id
            });
            break;
          case 'uploading':
            generatedNotifications.push({
              id: `uploading-${recording.id}`,
              type: 'new_recording',
              title: 'Upload in Progress',
              message: `"${recording.title}" is being uploaded`,
              timestamp: recordingDate,
              read: false,
              recordingId: recording.id
            });
            break;
        }
      }
    });

    // Sort by timestamp (newest first)
    generatedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(generatedNotifications);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((notification) => ({ ...notification, read: true }))
    );
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((notification) => notification.id !== id));
  };

  const handleDeleteAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'new_recording':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread' && notification.read) {
      return false;
    }
    const searchStr = searchQuery.toLowerCase();
    return (
      notification.message.toLowerCase().includes(searchStr) ||
      notification.title.toLowerCase().includes(searchStr)
    );
  });

  if (isLoading) {
    return (
      <StandardLayout activeSection="notifications">
        <div className="min-h-screen bg-eci-light-gray">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout activeSection="notifications">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-800 mb-2">Notifications</h1>
            <p className="text-body-large text-eci-gray-600">
              Stay up-to-date on recording processing status and platform updates
            </p>
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-3">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-2 rounded-lg text-body-small font-medium transition-all duration-150",
                  filter === 'all'
                    ? "bg-eci-blue text-white shadow-sm"
                    : "text-eci-gray-600 hover:text-eci-gray-800 bg-eci-gray-100"
                )}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  "px-4 py-2 rounded-lg text-body-small font-medium transition-all duration-150",
                  filter === 'unread'
                    ? "bg-eci-blue text-white shadow-sm"
                    : "text-eci-gray-600 hover:text-eci-gray-800 bg-eci-gray-100"
                )}
              >
                Unread ({notifications.filter(n => !n.read).length})
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-eci-gray-200 rounded-lg pl-10 pr-4 py-2 text-body-small text-eci-gray-700 placeholder-eci-gray-400 focus:outline-none focus:ring-2 focus:ring-eci-blue/20 focus:border-eci-blue transition-all w-64"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="px-3 py-2 rounded-lg text-body-small font-medium bg-eci-gray-100 text-eci-gray-600 hover:text-eci-gray-800 transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline-block" />
                Refresh
              </button>
              {notifications.some(n => !n.read) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-2 rounded-lg text-body-small font-medium bg-eci-gray-100 text-eci-gray-600 hover:text-eci-gray-800 transition-all"
                >
                  <Check className="w-4 h-4 mr-2 inline-block" />
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-2 rounded-lg text-body-small font-medium bg-eci-red-light text-eci-red hover:bg-eci-red/10 transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2 inline-block" />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-10 h-10 mx-auto mb-4 text-eci-gray-400" />
                <h3 className="text-title text-eci-gray-800 mb-2">
                  {notifications.length === 0 ? 'No Recent Activity' : 'No Matching Notifications'}
                </h3>
                <p className="text-body text-eci-gray-600">
                  {notifications.length === 0 
                    ? "Upload some recordings to see notifications about their processing status."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-eci-gray-200">
                {filteredNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      "px-6 py-4 transition-all duration-150",
                      !notification.read ? "bg-eci-blue/5 hover:bg-eci-blue/10" : "hover:bg-eci-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-body font-medium text-eci-gray-800">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-eci-blue rounded-full"></div>
                            )}
                          </div>
                          <p className="text-body-small text-eci-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-body-small text-eci-gray-500 mt-1">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-eci-blue hover:text-eci-blue-dark transition-colors p-1"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-eci-red hover:text-eci-red-dark transition-colors p-1"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}
