
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from '@/components/auth/AuthPage';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading } = useAuth();
  
  console.log('Index.tsx - loading:', loading, 'user:', user);

  if (loading) {
    console.log('Index.tsx - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('Index.tsx - Rendering:', user ? 'Dashboard' : 'AuthPage');
  return user ? <Dashboard /> : <AuthPage />;
};

export default Index;
