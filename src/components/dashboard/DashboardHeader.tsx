
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, LogOut, FileDown, Shield, Settings, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  onUploadClick: () => void;
}

export default function DashboardHeader({ onUploadClick }: DashboardHeaderProps) {
  const { signOut, user } = useAuth();
  const { isAdmin, loading: roleLoading, userRole } = useUserRole();
  const navigate = useNavigate();

  // For now, give all authenticated users admin access
  const hasAdminAccess = !!user;

  console.log('DashboardHeader - isAdmin:', isAdmin, 'userRole:', userRole, 'roleLoading:', roleLoading, 'hasAdminAccess:', hasAdminAccess);

  return (
    <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/placeholder.svg" 
                alt="SoundScribe Logo" 
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SoundScribe
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Single Upload CTA */}
            <Button
              onClick={onUploadClick}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            
            {/* Admin tools - minimal and consolidated */}
            {hasAdminAccess && (
              <div className="flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => navigate('/admin')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                >
                  <Shield className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => navigate('/status')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    onClick={() => navigate('/debug')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email}
              </span>
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="hover:bg-gray-100 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
