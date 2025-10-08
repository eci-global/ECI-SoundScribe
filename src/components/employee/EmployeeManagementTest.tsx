import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

const EmployeeManagementTest: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Employee Management Test</h1>
        <p className="text-gray-600">This is a test component to verify routing works.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employee Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            If you can see this page, the routing is working correctly.
          </p>
          <Button onClick={() => window.location.href = '/employees'}>
            Go to Full Employee Management
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagementTest;
