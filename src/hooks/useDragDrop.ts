import { useState, useCallback, useRef, type DragEvent } from 'react';

export interface DragDropItem {
  id: string;
  path: string;
  type: 'file' | 'directory';
  name: string;
}

interface UseDragDropOptions {
  onDrop?: (items: DragDropItem[], targetPath: string) => void;
}

export function useDragDrop(options: UseDragDropOptions = {}) {
  const [draggedItems, setDraggedItems] = useState<DragDropItem[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const startDrag = useCallback((items: DragDropItem[], e: DragEvent) => {
    setDraggedItems(items);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(items));
  }, []);

  const handleDragEnter = useCallback((targetPath: string, e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setDropTarget(targetPath);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDropTarget(null);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((targetPath: string, e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDropTarget(null);
    setIsDragging(false);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const items = JSON.parse(raw) as DragDropItem[];
        options.onDrop?.(items, targetPath);
      }
    } catch {
      // ignore
    }
    setDraggedItems([]);
  }, [options]);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedItems([]);
    setDropTarget(null);
    dragCounterRef.current = 0;
  }, []);

  return {
    draggedItems,
    dropTarget,
    isDragging,
    startDrag,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    endDrag,
  };
}
