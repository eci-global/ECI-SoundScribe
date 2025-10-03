
import React from 'react';
import UserCreator from '@/components/admin/UserCreator';

export default function CreateUsers() {
  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Create Initial Users</h1>
            <p className="text-body text-eci-gray-600">
              Set up the initial user accounts for the SoundScribe application
            </p>
          </div>
          
          <UserCreator />
        </div>
      </div>
    
  );
}
