import { useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  recordingId?: string;
  recordingTitle?: string;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  recordingId?: string;
  recordingTitle?: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  source: 'chatbot-page' | 'canvas' | 'floating-chat';
}

const CHAT_HISTORY_KEY = 'soundscribe_chat_history';
const CHAT_SESSIONS_KEY = 'soundscribe_chat_sessions';

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      const savedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
      
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setChatHistory(historyWithDates);
      }
      
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        // Convert timestamp strings back to Date objects
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          lastActivity: new Date(session.lastActivity)
        }));
        setChatSessions(sessionsWithDates);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // Save to localStorage whenever chat history changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [chatHistory]);

  // Save to localStorage whenever chat sessions change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  }, [chatSessions]);

  const startChatSession = (
    recordingId?: string, 
    recordingTitle?: string, 
    source: ChatSession['source'] = 'chatbot-page'
  ): string => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id: sessionId,
      recordingId,
      recordingTitle,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      source
    };

    setChatSessions(prev => [newSession, ...prev]);
    return sessionId;
  };

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const messageWithId: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setChatHistory(prev => [...prev, messageWithId]);

    // Update session activity
    setChatSessions(prev => prev.map(session => 
      session.id === message.sessionId 
        ? { 
            ...session, 
            lastActivity: new Date(), 
            messageCount: session.messageCount + 1,
            recordingId: message.recordingId || session.recordingId,
            recordingTitle: message.recordingTitle || session.recordingTitle
          }
        : session
    ));

    return messageWithId;
  };

  const getSessionMessages = (sessionId: string): ChatMessage[] => {
    return chatHistory.filter(msg => msg.sessionId === sessionId);
  };

  const getRecordingChatHistory = (recordingId: string): ChatMessage[] => {
    return chatHistory.filter(msg => msg.recordingId === recordingId);
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    setChatSessions([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(CHAT_SESSIONS_KEY);
  };

  const deleteSession = (sessionId: string) => {
    setChatHistory(prev => prev.filter(msg => msg.sessionId !== sessionId));
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  // Get recent sessions (last 30 days)
  const getRecentSessions = (days: number = 30): ChatSession[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return chatSessions
      .filter(session => session.lastActivity > cutoffDate)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  };

  return {
    chatHistory,
    chatSessions,
    startChatSession,
    addMessage,
    getSessionMessages,
    getRecordingChatHistory,
    clearChatHistory,
    deleteSession,
    getRecentSessions
  };
}