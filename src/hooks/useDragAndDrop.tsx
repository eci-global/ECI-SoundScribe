
import { useState, useRef, useCallback } from 'react';

interface UseDragAndDropProps {
  onFileDrop: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
}

export const useDragAndDrop = ({
  onFileDrop,
  accept = ['audio/*', 'video/*'],
  multiple = false,
  maxSize = 2 * 1024 * 1024 * 1024 // 2GB limit
}: UseDragAndDropProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);

  const validateFile = useCallback((file: File) => {
    // Check file type
    const isValidType = accept.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      console.warn(`Invalid file type: ${file.type}. Accepted types: ${accept.join(', ')}`);
      return false;
    }
    
    if (file.size > maxSize) {
      console.warn(`File too large: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB. Max size: ${(maxSize / (1024 * 1024 * 1024)).toFixed(2)}GB`);
      return false;
    }
    
    return true;
  }, [accept, maxSize]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragOver(false);
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsDragActive(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(validateFile);
      
      if (validFiles.length > 0) {
        onFileDrop(multiple ? validFiles : [validFiles[0]]);
      } else {
        console.warn('No valid files found in drop');
      }
    }
  }, [onFileDrop, multiple, validateFile]);

  const getRootProps = () => ({
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  });

  const getInputProps = () => ({
    type: 'file' as const,
    accept: accept.join(','),
    multiple,
    style: { display: 'none' }
  });

  return {
    isDragOver,
    isDragActive,
    getRootProps,
    getInputProps,
  };
};
