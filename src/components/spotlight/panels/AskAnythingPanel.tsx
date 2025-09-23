
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Sparkles, Clock, User, Bot, BarChart3, Lightbulb, HelpCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Conversation {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  confidence?: number;
}

interface RecordingContext {
  hasBDRData: boolean;
  hasCoachingData: boolean;
  hasTranscript: boolean;
  contentType?: string;
}

interface AskAnythingPanelProps {
  recordingId: string;
  transcript?: string;
  aiInsights?: any;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  {
    category: 'Call Analysis',
    icon: MessageSquare,
    questions: [
      "What were the main objections raised?",
      "How did the prospect respond to pricing?",
      "What are the next steps?",
      "What pain points were discussed?",
      "How engaged was the prospect?"
    ]
  }
];

const BDR_SUGGESTED_QUESTIONS = [
  {
    category: 'BDR Score Analysis',
    icon: BarChart3,
    questions: [
      'Why did this call score low on business acumen?',
      'What specific improvements would raise the overall score?',
      'How does this score compare to program averages?'
    ]
  },
  {
    category: 'Coaching Guidance',
    icon: Lightbulb,
    questions: [
      'What should I focus on coaching for this rep?',
      'Which criterion needs the most immediate attention?',
      'How can I help improve their talk time ratio?'
    ]
  },
  {
    category: 'Understanding Criteria',
    icon: HelpCircle,
    questions: [
      'Explain the scoring for the opening criterion',
      'What makes a strong closing in BDR calls?',
      'How is the qualification score calculated?'
    ]
  }
];

export function AskAnythingPanel({ recordingId, transcript, aiInsights }: AskAnythingPanelProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [context, setContext] = useState<RecordingContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load context information on mount
  useEffect(() => {
    const loadContext = async () => {
      setContextLoading(true);
      setError(null);

      try {
        // Use the unified-chat function to detect context
        const { data, error } = await supabase.functions.invoke('unified-chat', {
          body: {
            recordingId,
            question: "Context detection", // Special request for context only
            conversationHistory: []
          }
        });

        if (error) {
          console.warn('Context detection failed, using defaults:', error);
          setContext({
            hasBDRData: false,
            hasCoachingData: false,
            hasTranscript: Boolean(transcript),
            contentType: 'general'
          });
        } else {
          setContext(data.context);
        }
      } catch (err) {
        console.error('Failed to load context:', err);
        setError('Failed to load recording context');
        setContext({
          hasBDRData: false,
          hasCoachingData: false,
          hasTranscript: Boolean(transcript),
          contentType: 'general'
        });
      } finally {
        setContextLoading(false);
      }
    };

    loadContext();
  }, [recordingId, transcript]);

  const handleAskQuestion = async (questionToAsk: string) => {
    if (!questionToAsk.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Create temporary conversation entry for immediate UI feedback
    const tempId = `temp-${Date.now()}`;
    const tempConversation: Conversation = {
      id: tempId,
      question: questionToAsk.trim(),
      answer: '',
      timestamp: new Date()
    };

    setConversations(prev => [tempConversation, ...prev]);
    setQuestion('');

    try {
      // Get conversation history for context
      const conversationHistory = conversations.map(conv => ({
        role: 'user' as const,
        content: conv.question
      })).concat(conversations.map(conv => ({
        role: 'assistant' as const,
        content: conv.answer
      }))).slice(0, 10); // Last 5 exchanges

      // Call the unified-chat Edge Function
      const { data, error } = await supabase.functions.invoke('unified-chat', {
        body: {
          recordingId,
          question: questionToAsk.trim(),
          conversationHistory
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get response');
      }

      // Update the temporary conversation with the real response
      const finalConversation: Conversation = {
        id: `conv-${Date.now()}`,
        question: questionToAsk.trim(),
        answer: data.response,
        timestamp: new Date(),
        confidence: 0.85 // Could be enhanced with actual confidence from AI
      };

      setConversations(prev =>
        prev.map(conv => conv.id === tempId ? finalConversation : conv)
      );

    } catch (err) {
      console.error('Failed to ask question:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');

      // Update temp conversation with error
      const errorConversation: Conversation = {
        id: `error-${Date.now()}`,
        question: questionToAsk.trim(),
        answer: 'Sorry, I encountered an error processing your question. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
        confidence: 0
      };

      setConversations(prev =>
        prev.map(conv => conv.id === tempId ? errorConversation : conv)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestedQuestions = () => {
    if (!context) return DEFAULT_SUGGESTED_QUESTIONS;

    // Return BDR-specific questions if BDR data is available
    if (context.hasBDRData) {
      return BDR_SUGGESTED_QUESTIONS;
    }

    // Return default questions for other recordings
    return DEFAULT_SUGGESTED_QUESTIONS;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Ask Anything</h3>
          <Badge variant="outline" className="text-xs">
            AI-Powered
          </Badge>
        </div>

        {/* Context indicator */}
        {context && !contextLoading && (
          <div className="flex items-center gap-2">
            {context.hasBDRData && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                <BarChart3 className="h-3 w-3 mr-1" />
                BDR Analysis
              </Badge>
            )}
            {context.hasCoachingData && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Lightbulb className="h-3 w-3 mr-1" />
                Coaching Data
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Question Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask a question about this recording..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion(question)}
          className="flex-1"
        />
        <Button
          onClick={() => handleAskQuestion(question)}
          disabled={!question.trim() || isLoading}
          size="sm"
        >
          {isLoading ? (
            <Sparkles className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dynamic Suggested Questions */}
      {!contextLoading && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {context?.hasBDRData ? 'BDR-specific questions:' : 'Suggested questions:'}
          </p>
          {getSuggestedQuestions().map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <category.icon className="h-4 w-4" />
                {category.category}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {category.questions.map((suggestedQ, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAskQuestion(suggestedQ)}
                    disabled={isLoading}
                    className="justify-start text-left h-auto py-2 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
                  >
                    {suggestedQ}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context loading indicator */}
      {contextLoading && (
        <div className="flex items-center gap-2 py-4">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">Loading context...</span>
        </div>
      )}

      {/* Conversation History */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {conversations.map((conv) => (
          <Card key={conv.id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Question */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">You asked:</span>
                  </div>
                  <p className="text-sm text-blue-800">{conv.question}</p>
                </div>

                {/* Answer */}
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">
                        {context?.hasBDRData ? 'BDR Assistant:' : 'AI Assistant:'}
                      </span>
                    </div>
                    {conv.confidence !== undefined && conv.confidence > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(conv.confidence * 100)}% confident
                      </Badge>
                    )}
                  </div>

                  {conv.answer ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{conv.answer}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {conv.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Loading indicator for new questions */}
        {isLoading && conversations.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Sparkles className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-sm text-gray-600">Getting response...</span>
          </div>
        )}
      </div>

      {conversations.length === 0 && !isLoading && !contextLoading && (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No questions asked yet</p>
          <p className="text-sm">
            {context?.hasBDRData
              ? 'Ask questions about BDR scores, coaching insights, or criteria analysis'
              : 'Start by asking a question about this recording'
            }
          </p>
        </div>
      )}
    </div>
  );
}
