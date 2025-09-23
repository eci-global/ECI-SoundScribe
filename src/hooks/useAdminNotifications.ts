
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminNotification {
  id: string;
  type: 'system' | 'user' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const generateMockNotifications = (): AdminNotification[] => {
    const baseTime = new Date();
    return [
      {
        id: '1',
        type: 'system',
        severity: 'medium',
        title: 'High API usage detected',
        message: 'OpenAI API usage is approaching monthly limits',
        timestamp: new Date(baseTime.getTime() - 15 * 60000), // 15 minutes ago
        read: false,
        actionRequired: true,
        actionUrl: '/admin/settings'
      },
      {
        id: '2',
        type: 'user',
        severity: 'low',
        title: 'New user registration',
        message: '3 new users have registered in the last hour',
        timestamp: new Date(baseTime.getTime() - 30 * 60000), // 30 minutes ago
        read: false
      },
      {
        id: '3',
        type: 'performance',
        severity: 'high',
        title: 'Processing queue backed up',
        message: '12 recordings waiting for AI processing',
        timestamp: new Date(baseTime.getTime() - 45 * 60000), // 45 minutes ago
        read: true,
        actionRequired: true,
        actionUrl: '/admin/queue'
      },
      {
        id: '4',
        type: 'security',
        severity: 'medium',
        title: 'Multiple failed login attempts',
        message: 'User account locked due to failed attempts',
        timestamp: new Date(baseTime.getTime() - 60 * 60000), // 1 hour ago
        read: true
      },
      {
        id: '5',
        type: 'system',
        severity: 'critical',
        title: 'Database connection issues',
        message: 'Intermittent connection timeouts detected',
        timestamp: new Date(baseTime.getTime() - 90 * 60000), // 1.5 hours ago
        read: true,
        actionRequired: true,
        actionUrl: '/admin/health'
      }
    ];
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // For now, use mock data since we don't have a notifications table
      const mockNotifications = generateMockNotifications();
      setNotifications(mockNotifications);
      
      const unread = mockNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      
      // Play notification sound for new unread notifications (but not console.beep)
      if (unread > 0) {
        try {
          // Create a simple audio notification
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (audioError) {
          // Silently fail if audio context is not available
          console.log('Audio notification not available');
        }
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'recordings'
      }, () => {
        // Refetch notifications when data changes
        fetchNotifications();
      })
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications: fetchNotifications
  };
}
