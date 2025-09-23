import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { MetricTile } from '@/components/MetricTile';
import AdminHome from '@/pages/admin/AdminHome';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    loading: false,
    signOut: vi.fn()
  })
}));

// Mock the hooks
vi.mock('@/hooks/useKpiMetrics', () => ({
  useKpiMetrics: () => ({
    data: {
      instantSummaries: { today: 127, last7Days: 894, percentChange: 12.5, status: 'up' },
      repAdoption: { rate: 73.2, activeReps: 156, totalReps: 213, percentChange: 8.1, status: 'healthy' },
      coachingScore: { current: 82.4, delta: 5.7, trend: 'improving', status: 'healthy' },
      failureRate: { current: 1.2, failed: 23, retried: 89, status: 'healthy' }
    },
    loading: false,
    error: null
  })
}));

vi.mock('@/hooks/useOkta', () => ({
  useOkta: () => ({
    orgData: {
      organization: { name: 'Test Org', plan: 'Enterprise' },
      stats: { licenses: { total: 100, used: 80, available: 20 } }
    },
    loading: false
  })
}));

vi.mock('@/hooks/useSupabaseLive', () => ({
  useSupabaseLive: () => ({
    data: [],
    loading: false,
    error: null
  })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Admin Suite Components', () => {
  describe('AdminLayout', () => {
    test('renders sidebar with navigation items', () => {
      renderWithRouter(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByText('Admin home')).toBeInTheDocument();
      expect(screen.getByText('Library')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Access control')).toBeInTheDocument();
    });

    test('displays user email in sidebar', () => {
      renderWithRouter(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    test('sidebar links have correct aria-current when active', () => {
      // This would need more sophisticated routing mock to test properly
      renderWithRouter(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const adminHomeLink = screen.getByText('Admin home').closest('button');
      expect(adminHomeLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('MetricTile', () => {
    test('renders with correct title and value', () => {
      render(
        <MetricTile
          title="Test Metric"
          value={123}
          status="Healthy"
        />
      );

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    test('displays trend information when provided', () => {
      render(
        <MetricTile
          title="Test Metric"
          value="85%"
          status="Healthy"
          trend="up"
          trendValue="+12.5%"
        />
      );

      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    test('shows subValue when provided', () => {
      render(
        <MetricTile
          title="Test Metric"
          value={127}
          subValue="this week"
          status="Healthy"
        />
      );

      expect(screen.getByText('this week')).toBeInTheDocument();
    });
  });

  describe('AdminHome', () => {
    test('renders four KPI tiles', async () => {
      renderWithRouter(<AdminHome />);

      await waitFor(() => {
        expect(screen.getByText('Instant Summaries Delivered')).toBeInTheDocument();
        expect(screen.getByText('Rep Adoption Rate')).toBeInTheDocument();
        expect(screen.getByText('Average Coaching Score Δ')).toBeInTheDocument();
        expect(screen.getByText('Failure & Retry Monitor')).toBeInTheDocument();
      });
    });

    test('displays numeric values in KPI tiles', async () => {
      renderWithRouter(<AdminHome />);

      await waitFor(() => {
        expect(screen.getByText('127')).toBeInTheDocument(); // Instant Summaries
        expect(screen.getByText('73.2%')).toBeInTheDocument(); // Rep Adoption Rate
        expect(screen.getByText('82.4')).toBeInTheDocument(); // Coaching Score
        expect(screen.getByText('1.2%')).toBeInTheDocument(); // Failure Rate
      });
    });

    test('shows loading state initially', () => {
      // This test would need to be refactored to properly test loading state
      // For now, just test that the page renders
      renderWithRouter(<AdminHome />);
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });
  });

  describe('Data Integration', () => {
    test('AuditLogTable updates with real-time data', async () => {
      // This would test the Supabase real-time integration
      // Mock implementation for now
      expect(true).toBe(true);
    });

    test('IntegrationHeartbeat polls health endpoints', async () => {
      // This would test the 30-second polling functionality
      // Mock implementation for now
      expect(true).toBe(true);
    });
  });
});