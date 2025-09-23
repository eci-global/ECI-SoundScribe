import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RecordingsList from '@/pages/outreach/RecordingsList';

// Mock the hooks
vi.mock('@/hooks/useRecordings', () => ({
  useRecordings: vi.fn(() => ({
    data: [
      {
        id: '1',
        title: 'Sales Call with Acme Corp',
        participants: 'John Doe, Jane Smith',
        duration: 1800, // 30 minutes
        created_at: '2025-06-20T10:00:00Z',
        status: 'completed',
        file_type: 'audio'
      },
      {
        id: '2', 
        title: 'Product Demo - TechStart',
        participants: 'Sarah Wilson, Mike Chen',
        duration: 2400, // 40 minutes
        created_at: '2025-06-19T14:30:00Z',
        status: 'processing',
        file_type: 'video'
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RecordingsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders recordings list with data', () => {
    render(<RecordingsList />, { wrapper: createWrapper() });
    
    // Check header
    expect(screen.getByText('Outreach Recordings')).toBeInTheDocument();
    expect(screen.getByText('AI-powered insights from your call recordings')).toBeInTheDocument();
    
    // Check recordings count badge (using getAllByText since it appears in multiple places)
    expect(screen.getAllByText('2 recordings')[0]).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Recorded')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check recording rows
    expect(screen.getByText('Sales Call with Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Product Demo - TechStart')).toBeInTheDocument();
    expect(screen.getByText('John Doe, Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Wilson, Mike Chen')).toBeInTheDocument();
  });

  test('clicking recording row navigates to detail page', async () => {
    render(<RecordingsList />, { wrapper: createWrapper() });
    
    // Click on first recording row
    const firstRow = screen.getByText('Sales Call with Acme Corp').closest('tr');
    expect(firstRow).toBeInTheDocument();
    
    fireEvent.click(firstRow!);
    
    // Check navigation was called with correct path
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/outreach/recordings/1');
    });
  });

  test('displays correct status chips', () => {
    render(<RecordingsList />, { wrapper: createWrapper() });
    
    // Check status indicators
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  test('formats duration correctly', () => {
    render(<RecordingsList />, { wrapper: createWrapper() });
    
    // Check duration formatting (1800 seconds = 30:00, 2400 seconds = 40:00)
    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getByText('40:00')).toBeInTheDocument();
  });

  test('shows refresh button', () => {
    render(<RecordingsList />, { wrapper: createWrapper() });
    
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
    
    fireEvent.click(refreshButton);
    // Note: In a real test, we'd verify the refetch function was called
  });
});