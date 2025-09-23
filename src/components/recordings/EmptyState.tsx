import React from 'react';
import { FileAudio, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export default function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate('/uploads');
  };

  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No recordings found
        </h3>
        <p className="text-gray-500 mb-6">
          No recordings match your current filters. Try adjusting your search criteria.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <FileAudio className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No recordings yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Start by uploading your first recording or importing from external platforms 
        like Outreach.io to see AI-powered insights and analysis.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={handleUploadClick} className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Recording
        </Button>
        <Button variant="outline" onClick={() => navigate('/uploads')}>
          Import from Platforms
        </Button>
      </div>
    </div>
  );
}