
import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ExternalLink } from 'lucide-react';

export default function AdminSignIn() {
  const [dynamicProvisioning, setDynamicProvisioning] = useState(false);

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Administration</h1>
            <p className="text-body text-eci-gray-600">Manage sign-in and authentication settings</p>
          </div>

          {/* Sign-in section */}
          <div className="mb-8">
            <h2 className="text-title-large text-eci-gray-900 mb-6">Sign-In</h2>
            
            <div className="space-y-6">
              {/* Sign-in and password options */}
              <AdminCard
                title="Sign-in and password options"
                description="Configure authentication methods and password requirements"
                action={
                  <Button variant="outline" size="sm" className="border-eci-gray-300 text-eci-gray-700 hover:bg-eci-gray-50">
                    Edit
                  </Button>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-eci-gray-100 last:border-b-0">
                    <div>
                      <p className="text-body font-medium text-eci-gray-900">Password authentication</p>
                      <p className="text-body-small text-eci-gray-600">Users can sign in with email and password</p>
                    </div>
                    <div className="text-body-small text-eci-teal font-medium">Enabled</div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-eci-gray-100 last:border-b-0">
                    <div>
                      <p className="text-body font-medium text-eci-gray-900">Two-factor authentication</p>
                      <p className="text-body-small text-eci-gray-600">Require additional verification step</p>
                    </div>
                    <div className="text-body-small text-eci-gray-500 font-medium">Optional</div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-body font-medium text-eci-gray-900">Password requirements</p>
                      <p className="text-body-small text-eci-gray-600">Minimum 8 characters, mixed case required</p>
                    </div>
                    <div className="text-body-small text-eci-teal font-medium">Active</div>
                  </div>
                </div>
              </AdminCard>

              {/* Cross-instance sign-in */}
              <AdminCard
                title="Cross-instance sign-in"
                description="Allow users to access multiple instances with a single account"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-medium text-eci-gray-900">Cross-instance access</p>
                      <p className="text-body-small text-eci-gray-600">Users can sign in to related instances</p>
                    </div>
                    <div className="text-body-small text-eci-gray-500 font-medium">Disabled</div>
                  </div>
                  <div className="pt-2">
                    <button className="inline-flex items-center gap-2 text-body-small text-eci-blue hover:text-eci-blue-dark transition-colors">
                      Learn more about cross-instance sign-in
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </AdminCard>

              {/* Dynamic user provisioning */}
              <AdminCard
                title="Dynamic user provisioning"
                description="Automatically create user accounts when they first sign in"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-medium text-eci-gray-900">Auto-provision new users</p>
                      <p className="text-body-small text-eci-gray-600">Create accounts automatically on first sign-in attempt</p>
                    </div>
                    <Switch 
                      checked={dynamicProvisioning}
                      onCheckedChange={setDynamicProvisioning}
                    />
                  </div>
                  {dynamicProvisioning && (
                    <div className="mt-4 p-4 bg-eci-blue/5 border border-eci-blue/20 rounded-lg">
                      <p className="text-body-small text-eci-gray-700">
                        New users will be automatically created with default permissions when they sign in for the first time.
                      </p>
                    </div>
                  )}
                </div>
              </AdminCard>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
