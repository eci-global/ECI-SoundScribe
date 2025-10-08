import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PracticeBoard } from '@/components/coach/PracticeBoard';
import type { CoachPracticePreview } from '@/utils/coachingInsights';

const sampleItem: CoachPracticePreview = {
  id: 'item-1',
  recordingId: 'rec-1',
  title: 'Sharpen discovery pacing',
  highlight: 'Rehearse the opening question sequence',
  meta: '3 days ago',
  priority: 'high',
  mode: 'sales',
  focusAreas: ['Discovery pacing'],
  actionItems: ['Rehearse intro question flow'],
  strengths: ['Strong rapport'],
};

describe('PracticeBoard', () => {
  it('invokes onSelect when start button is clicked', () => {
    const handleSelect = vi.fn();

    render(
      <PracticeBoard items={[sampleItem]} mode="sales" onSelect={handleSelect} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Start practice/i }));
    expect(handleSelect).toHaveBeenCalledWith(sampleItem);
  });

  it('renders empty state when no items exist', () => {
    render(<PracticeBoard items={[]} mode="sales" onSelect={vi.fn()} />);

    expect(
      screen.getByText(/No open practice sessions/i),
    ).toBeInTheDocument();
  });
});
