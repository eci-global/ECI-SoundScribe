import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  Sparkles,
  FileAudio,
  Clock,
  ChevronRight,
  Bot,
  User as UserIcon,
  Mic,
  Paperclip,
  MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateAIResponse } from '@/utils/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  recordingId?: string;
  recordingTitle?: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  transcript?: string;
  created_at: string;
  duration?: number;
}

interface ChatbotProps {
  userId: string;
  recordings: Recording[];
}

export default function Chatbot({ userId, recordings }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showRecordingsList, setShowRecordingsList] = useState(true);
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
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your recording assistant. Select a recording from the list or ask me anything about your audio content. I can help you understand key points, find specific information, or answer questions about your uploads.",
        timestamp: new Date()
      }]);
    }
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Add user message
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      recordingId: selectedRecording?.id,
      recordingTitle: selectedRecording?.title
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      let context = {};
      let title = 'General Question';

      if (selectedRecording) {
        // Fetch full recording details if needed
        const { data, error } = await supabase
          .from('recordings')
          .select('*')
          .eq('id', selectedRecording.id)
          .single();

        if (data && !error) {
          context = {
            transcript: data.transcript,
            summary: data.summary,
            description: data.description
          };
          title = data.title;
        }
      }

      const aiResponse = await generateAIResponse(title, userMessage, context);
      
      if (aiResponse.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.response,
          timestamp: new Date(),
          recordingId: selectedRecording?.id,
          recordingTitle: selectedRecording?.title
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

  const selectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowRecordingsList(false);
    
    // Add context message
    const contextMessage: Message = {
      id: `context-${Date.now()}`,
      role: 'assistant',
      content: `Great! I'm now focused on "${recording.title}". What would you like to know about this recording?`,
      timestamp: new Date(),
      recordingId: recording.id,
      recordingTitle: recording.title
    };
    setMessages(prev => [...prev, contextMessage]);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Q&A Assistant</h1>
          <p className="text-gray-600 dark:text-gray-300">Ask questions about your uploads and get intelligent responses</p>
        </div>

        <div className="flex h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Recordings Sidebar */}
          <div className={`${showRecordingsList ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Your Uploads
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a recording to chat about</p>
            </div>
        
            <div className="overflow-y-auto h-[calc(100%-80px)]">
              {recordings.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No recordings yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {recordings.map((recording) => (
                    <button
                      key={recording.id}
                      onClick={() => selectRecording(recording)}
                      className={`w-full text-left p-3 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedRecording?.id === recording.id 
                          ? 'bg-eci-blue/10 border border-eci-blue/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedRecording?.id === recording.id 
                            ? 'bg-eci-blue text-white' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          <FileAudio className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{recording.title}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(recording.duration)}
                            </span>
                            <span>
                              {new Date(recording.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowRecordingsList(!showRecordingsList)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
                  >
                    <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-eci-blue" />
                      Q&A Assistant
                    </h2>
                    {selectedRecording && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Chatting about: {selectedRecording.title}
                      </p>
                    )}
                  </div>
                </div>
            
                
                <div className="flex items-center gap-2">
                  {selectedRecording && (
                    <button
                      onClick={() => {
                        setSelectedRecording(null);
                        setShowRecordingsList(true);
                      }}
                      className="text-sm text-eci-blue hover:text-eci-blue-dark font-medium"
                    >
                      Change Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-eci-blue to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                      {message.recordingTitle && message.role === 'user' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          About: {message.recordingTitle}
                        </p>
                      )}
                      <div
                        className={`p-4 rounded-2xl ${
                          message.role === 'assistant'
                            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                            : 'bg-gradient-to-r from-eci-blue to-eci-blue-dark text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <p className={`text-xs mt-1 ${
                        message.role === 'assistant' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400 text-right'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-500 flex items-center justify-center flex-shrink-0 order-2">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
            
                
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-eci-blue to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={selectedRecording ? "Ask about this recording..." : "Select a recording to start chatting..."}
                      disabled={loading || !selectedRecording}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-eci-blue focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={loading || !inputMessage.trim() || !selectedRecording}
                    className="p-3 bg-gradient-to-r from-eci-blue to-eci-blue-dark text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                {!selectedRecording && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Select a recording from the list to start asking questions
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 