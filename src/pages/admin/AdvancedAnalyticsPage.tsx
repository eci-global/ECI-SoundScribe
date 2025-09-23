import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';

export default function AdvancedAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Advanced Analytics</h1>
            <p className="text-body text-eci-gray-600">
              In-depth analysis, predictions, and performance insights
            </p>
          </div>
          
          <AdvancedAnalytics />
        </div>
      </div>
    </AdminLayout>
  );
}