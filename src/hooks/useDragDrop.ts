import { useState, useCallback } from 'react';

const MIME = 'application/x-explorer-ids';

export function useDragDropTarget(onDrop: (ids: string[], copy: boolean) => void) {
  const [over, setOver] = useState(false);
  const handlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
      if (!over) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const raw = e.dataTransfer.getData(MIME);
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids) && ids.length) onDrop(ids, e.ctrlKey || e.metaKey);
      } catch {}
    },
  };
  return { over, handlers };
}

export function makeDragHandlers(ids: string[]) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData(MIME, JSON.stringify(ids));
    },
  };
}

export const EXPLORER_DND_MIME = MIME;
