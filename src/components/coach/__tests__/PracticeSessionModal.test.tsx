import type { Recording } from '@/types/recording';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PracticeSessionModal, { PracticeSessionPayload } from '@/components/coach/PracticeSessionModal';

const mockRecording: Recording = {
  id: 'rec-1',
  title: 'Discovery Call',
  status: 'completed' as const,
  file_type: 'audio' as const,
  created_at: new Date().toISOString(),
} as Recording;

const basePayload: PracticeSessionPayload = {
  id: 'rec-1',
  title: 'Rehearse Qualification',
  description: 'Focus on bringing MEDDIC questions earlier into the conversation.',
  priority: 'high',
  focusAreas: ['Qualification depth'],
  estimatedImpact: 12,
  timeToComplete: '15 minutes',
  recommendationType: 'practice_challenge',
  recording: mockRecording,
  actionItems: ['Run MEDDIC checklist before call', 'Confirm qualification criteria early'],
  strengths: ['Great rapport building'],
  mode: 'sales',
};

describe('PracticeSessionModal', () => {
  it('renders practice details when open', () => {
    render(
      <MemoryRouter>
        <PracticeSessionModal open data={basePayload} onOpenChange={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Rehearse Qualification/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus on bringing MEDDIC questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided practice/i)).toBeInTheDocument();
    expect(screen.getByText(/Great rapport building/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open Recording/i });
    expect(link).toHaveAttribute('href', '/outreach/recordings/rec-1');
  });

  it('invokes completion handler when practice is marked complete', () => {
    const onComplete = vi.fn();

    render(
      <MemoryRouter>
        <PracticeSessionModal open data={basePayload} onOpenChange={() => {}} onCompletePractice={onComplete} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Mark practice complete/i }));
    expect(onComplete).toHaveBeenCalledWith(basePayload);
  });
});

