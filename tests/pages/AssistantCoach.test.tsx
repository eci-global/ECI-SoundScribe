import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistantCoach from '../../src/pages/AssistantCoach';
import { CoachingService } from '../../src/services/coachingService';
import { supabase } from '../../src/integrations/supabase/client';
import type { Recording } from '../../src/types/recording';

// Mock the services
jest.mock('../../src/services/coachingService');
jest.mock('../../src/integrations/supabase/client');

const mockRecording: Recording = {
  id: '123',
  created_at: new Date().toISOString(),
  user_id: 'user-123',
  filename: 'test.mp3',
  status: 'completed',
  duration: 300,
  coaching_evaluation: {
    overallScore: 85,
    strengths: ['Good rapport building'],
    improvements: ['Ask more open-ended questions'],
    criteria: { talkTimeRatio: 45 },
    summary: 'A good call with some areas for improvement.',
  },
  ai_next_steps: ['Follow up with the prospect next week'],
  transcript: 'This is a test transcript.',
  summary: 'This is a test summary.',
  content_type: 'sales_call',
  enable_coaching: true,
};

(supabase.from as jest.Mock).mockReturnValue({
  select: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: mockRecording, error: null }),
});

(CoachingService.getCoachingEvaluation as jest.Mock).mockResolvedValue(mockRecording.coaching_evaluation);

(supabase.functions.invoke as jest.Mock).mockResolvedValue({
  data: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('This is a streamed response.'));
      controller.close();
    },
  }),
});

it('renders insight cards with live coaching data', async () => {
  render(<AssistantCoach />);

  await waitFor(() => {
    expect(screen.getByText(/AI Coaching Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Items/i)).toBeInTheDocument();
    expect(screen.getByText(/A good call with some areas for improvement./i)).toBeInTheDocument();
  });
});

it('sends user message and shows streaming reply', async () => {
  render(<AssistantCoach />);

  fireEvent.change(screen.getByPlaceholderText(/Ask for coaching advice.../i), {
    target: { value: 'How can I improve my questioning?' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));

  await waitFor(() => {
    expect(screen.getByText(/How can I improve my questioning?/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a streamed response./i)).toBeInTheDocument();
  });
});

it('methodology toggle updates system prompt', async () => {
  render(<AssistantCoach />);

  fireEvent.click(screen.getByText(/MEDDIC/i));

  fireEvent.change(screen.getByPlaceholderText(/Ask for coaching advice.../i), {
    target: { value: 'How can I improve my questioning?' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));

  await waitFor(() => {
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'generate-coaching-chat',
      expect.objectContaining({
        body: expect.stringContaining('"methodology":"MEDDIC"'),
      })
    );
  });
});
