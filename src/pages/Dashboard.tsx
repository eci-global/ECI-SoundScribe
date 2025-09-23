
import React from 'react';
import StandardLayout from '@/components/layout/StandardLayout';
import { PersonalizedDashboard } from '@/pages/PersonalizedDashboard';

export default function Dashboard() {
  console.log('Dashboard.tsx - Dashboard component rendering');
  return (
    <StandardLayout activeSection="dashboard">
      <PersonalizedDashboard />
    </StandardLayout>
  );
}
