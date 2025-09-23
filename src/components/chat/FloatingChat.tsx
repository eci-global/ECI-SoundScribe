import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Send, Bot, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { generateAIResponse } from '@/utils/aiService';
import { useToast } from '@/hooks/use-toast';

interface Recording {
  id: string;
  title: string;
  summary?: string;
  transcript?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FloatingChatProps {
  recording: Recording | null;
  onClose: () => void;
  userId: string;
}

export default function FloatingChat({ recording, onClose, userId }: FloatingChatProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (recording) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `I'm ready to answer questions about "${recording.title}". What would you like to know?`,
        timestamp: new Date()
      }]);
      setIsMinimized(false);
    }
  }, [recording]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !recording) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Add user message
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Fetch full recording details if needed
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recording.id)
        .single();

      const context = data && !error ? {
        transcript: data.transcript,
        summary: data.summary,
        description: data.description
      } : {};

      const aiResponse = await generateAIResponse(recording.title, userMessage, context);
      
      if (aiResponse.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(aiResponse.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!recording) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 z-50',
        isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gradient-to-r from-eci-blue to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-4 h-4 flex-shrink-0" />
          <h3 className="text-sm font-medium truncate">Chat: {recording.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Content */}
      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-56px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-eci-blue to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%]`}>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.role === 'assistant'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gradient-to-r from-eci-blue to-purple-600 text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                  <p className={`text-xs mt-1 ${
                    message.role === 'assistant' ? 'text-gray-500' : 'text-gray-600 text-right'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-eci-blue to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this recording..."
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent disabled:bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="p-2 bg-gradient-to-r from-eci-blue to-purple-600 text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 