import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageSquare, X, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  recording_id: string;
  title: string;
  created_at: string;
}

export interface ChatInterfaceProps {
  recordingId: string;
  onClose?: () => void;
}

export function ChatInterface({ recordingId, onClose }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (recordingId && user) {
      findOrCreateSession();
    }
  }, [recordingId, user]);

  const findOrCreateSession = async () => {
    try {
      setLoadingSession(true);
      
      // First, try to find existing session
      const { data: existingSessions, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let currentSession: ChatSession;

      if (existingSessions && existingSessions.length > 0) {
        currentSession = existingSessions[0];
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            recording_id: recordingId,
            user_id: user?.id,
            title: `Chat about Recording ${recordingId.slice(0, 8)}`
          })
          .select()
          .single();

        if (createError) throw createError;
        currentSession = newSession;
      }

      setSession(currentSession);
      await loadMessages(currentSession.id);
    } catch (error) {
      console.error('Error finding/creating session:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat session",
        variant: "destructive"
      });
    } finally {
      setLoadingSession(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Message interface
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user',
        content: msg.content,
        created_at: msg.created_at
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !session || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message to UI immediately
      const userMessageObj: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessageObj]);

      // Save user message to database
      const { error: saveError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          role: 'user',
          content: userMessage
        });

      if (saveError) throw saveError;

      // Simulate AI response (replace with actual AI call)
      setTimeout(async () => {
        const aiResponse = `I understand you're asking about: "${userMessage}". Based on the recording analysis, I can help you with insights about this conversation.`;
        
        const aiMessageObj: Message = {
          id: `temp-ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessageObj]);

        // Save AI response to database
        await supabase
          .from('chat_messages')
          .insert({
            session_id: session.id,
            role: 'assistant',
            content: aiResponse
          });

        setIsLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingSession) {
    return (
      <Card className="w-full h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading chat session...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recording Chat
            <Badge variant="outline">AI Assistant</Badge>
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start a conversation about this recording</p>
                <p className="text-sm">Ask questions about the content, insights, or get summaries</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === 'user' ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    <span className="text-xs text-gray-600">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this recording..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
