import { useState, useCallback, useRef, useEffect } from 'react';

interface UseDragOptions {
  onDrag?: (progress: number) => void;
  onDragEnd?: (progress: number) => void;
  onDragStart?: () => void;
}

export function useDrag({ onDrag, onDragEnd, onDragStart }: UseDragOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const getProgress = useCallback((clientX: number) => {
    if (!containerRef.current) return 0;
    
    const rect = containerRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return progress;
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    const progress = getProgress(event.clientX);
    setDragProgress(progress);
    onDragStart?.();
    onDrag?.(progress);
  }, [getProgress, onDrag, onDragStart]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const progress = getProgress(event.clientX);
    setDragProgress(progress);
    onDrag?.(progress);
  }, [isDragging, getProgress, onDrag]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const progress = getProgress(event.clientX);
    onDragEnd?.(progress);
  }, [isDragging, getProgress, onDragEnd]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (isDragging) return;
    
    const progress = getProgress(event.clientX);
    setDragProgress(progress);
    onDrag?.(progress);
    onDragEnd?.(progress);
  }, [isDragging, getProgress, onDrag, onDragEnd]);

  // Handle mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    containerRef,
    isDragging,
    dragProgress,
    handleMouseDown,
    handleClick,
    setProgress: setDragProgress
  };
}