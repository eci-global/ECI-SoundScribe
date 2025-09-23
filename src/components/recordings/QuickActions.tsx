import React from 'react';
import { Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  className?: string;
}

export default function QuickActions({ className }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleUpload = () => {
    navigate('/uploads');
  };

  const handleImport = () => {
    navigate('/uploads?tab=import');
  };

  const actions = [
    {
      label: 'Upload New',
      icon: Upload,
      onClick: handleUpload,
      variant: 'default' as const,
      className: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300'
    },
    {
      label: 'Import',
      icon: Download,
      onClick: handleImport,
      variant: 'outline' as const,
      className: 'border-white/20 bg-white/10 backdrop-blur-sm text-gray-700 hover:bg-white/20 transition-all duration-300'
    },

  ];

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {actions.map((action, index) => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={action.onClick}
          className={`group relative overflow-hidden ${action.className}`}
        >
          <action.icon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
          {action.label}
          
          {/* Subtle shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Button>
      ))}
    </div>
  );
}