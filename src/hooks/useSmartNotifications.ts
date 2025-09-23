
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Recording } from '@/types/recording';
import type { AIInsights } from '@/types/coaching';

interface SmartNotification {
  id: string;
  type: 'ai_insight' | 'coaching_alert' | 'processing_complete' | 'action_required' | 'performance_trend';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  recordingId?: string;
  actionUrl?: string;
  metadata?: any;
}

export function useSmartNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Set up real-time subscription for recording changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const channel = supabase
      .channel(`smart-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const recording = payload.new as Recording;
          await generateSmartNotifications(recording);
        }
      )
      .subscribe();

    setLoading(false);

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const generateSmartNotifications = async (recording: Recording) => {
    if (!recording) return;

    const newNotifications: SmartNotification[] = [];

    // Generate notification for completed processing
    if (recording.status === 'completed' && recording.summary) {
      newNotifications.push({
        id: `processing-complete-${recording.id}`,
        type: 'processing_complete',
        title: 'Recording Analysis Complete',
        message: `AI analysis for "${recording.title}" has been completed successfully.`,
        priority: 'medium',
        timestamp: new Date(),
        read: false,
        recordingId: recording.id,
        actionUrl: `/outreach/recordings/${recording.id}`,
        metadata: {
          recordingTitle: recording.title,
          hasCoaching: !!recording.coaching_evaluation
        }
      });
    }

    // Generate coaching alert if coaching evaluation shows low score
    if (recording.coaching_evaluation && recording.coaching_evaluation.overallScore < 60) {
      newNotifications.push({
        id: `coaching-alert-${recording.id}`,
        type: 'coaching_alert',
        title: 'Coaching Alert: Low Performance Score',
        message: `The call "${recording.title}" scored ${recording.coaching_evaluation.overallScore}/100. Review coaching insights for improvement opportunities.`,
        priority: 'high',
        timestamp: new Date(),
        read: false,
        recordingId: recording.id,
        actionUrl: `/outreach/recordings/${recording.id}`,
        metadata: {
          score: recording.coaching_evaluation.overallScore,
          improvements: recording.coaching_evaluation.improvements?.slice(0, 2) || []
        }
      });
    }

    // Generate AI insight notification if there are actionable insights
    const aiInsights = recording.ai_insights as AIInsights | null;
    if (aiInsights && Array.isArray(aiInsights.actionItems) && aiInsights.actionItems.length > 0) {
      newNotifications.push({
        id: `ai-insight-${recording.id}`,
        type: 'ai_insight',
        title: 'New AI Insights Available',
        message: `${aiInsights.actionItems.length} action items identified from "${recording.title}".`,
        priority: 'medium',
        timestamp: new Date(),
        read: false,
        recordingId: recording.id,
        actionUrl: `/outreach/recordings/${recording.id}`,
        metadata: {
          actionItems: aiInsights.actionItems.slice(0, 3),
          insights: Array.isArray(aiInsights.keyTakeaways) ? aiInsights.keyTakeaways.slice(0, 2) : []
        }
      });
    }

    // Add new notifications to state
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
    }
  };

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const getNotificationsByPriority = useCallback((priority: string) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    getUnreadCount,
    getNotificationsByPriority,
    generateSmartNotifications
  };
}
