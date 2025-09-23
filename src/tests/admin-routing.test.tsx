import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminDashboard from '@/pages/AdminDashboard';

// Mock auth and role hooks to simulate an admin user
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'admin@test.com' }, loading: false })
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: true, loading: false, userRole: 'admin' })
}));

describe('Admin routing', () => {
  it('renders Advanced Analytics page from /admin/analytics', async () => {
    const { container, findAllByText } = renderWithRouter('/admin/analytics');
    // Multiple headings may match; ensure at least one is present
    const titles = await findAllByText('Advanced Analytics');
    expect(titles.length).toBeGreaterThan(0);
    expect(container).toBeTruthy();
  });
});

function renderWithRouter(initialPath: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const ui = (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </MemoryRouter>
  );

  // Lazy import testing library only in test context
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rtl = require('@testing-library/react');
  const { render } = rtl;
  const utils = render(ui, { container });
  return { container, ...utils };
}
