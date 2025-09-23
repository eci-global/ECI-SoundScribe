
import React from 'react';
import { Upload, FileAudio, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalDragOverlayProps {
  isActive: boolean;
  onDrop: (files: File[]) => void;
}

export const GlobalDragOverlay: React.FC<GlobalDragOverlayProps> = ({
  isActive,
  onDrop
}) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => 
        file.type.startsWith('audio/') || file.type.startsWith('video/')
      );
      
      if (validFiles.length > 0) {
        onDrop(validFiles);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isActive) return null;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-md',
        'animate-fade-in'
      )}
    >
      <div className="text-center space-y-6 p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse" />
          <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-8 border border-white/30">
            <Upload className="h-16 w-16 text-white mx-auto animate-bounce" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-white">
            Drop your files here
          </h2>
          <p className="text-lg text-white/80">
            Upload audio and video recordings to get started
          </p>
          
          <div className="flex items-center justify-center space-x-6 pt-4">
            <div className="flex items-center space-x-2 text-white/70">
              <FileAudio className="h-5 w-5" />
              <span className="text-sm">Audio</span>
            </div>
            <div className="w-px h-6 bg-white/30" />
            <div className="flex items-center space-x-2 text-white/70">
              <FileVideo className="h-5 w-5" />
              <span className="text-sm">Video</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};
