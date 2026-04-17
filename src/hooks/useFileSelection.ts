import { useCallback, useRef, useState } from 'react';
import type { FileEntity } from '@/types/explorer.types';

/**
 * Stable selection hook — callbacks never change identity.
 * Files are read via ref to avoid recreating handlers on each render.
 */
export function useFileSelection(files: FileEntity[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const lastSelectedRef = useRef<string | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  const select = useCallback((id: string, multi = false, range = false) => {
    const currentFiles = filesRef.current;
    const lastSelected = lastSelectedRef.current;

    if (range && lastSelected) {
      const ids = currentFiles.map(f => f.id);
      const startIdx = ids.indexOf(lastSelected);
      const endIdx = ids.indexOf(id);
      if (startIdx >= 0 && endIdx >= 0) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        setSelected(ids.slice(from, to + 1));
        return;
      }
    }

    if (multi) {
      setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    } else {
      setSelected([id]);
    }
    lastSelectedRef.current = id;
  }, []);

  const selectAll = useCallback(() => {
    setSelected(filesRef.current.map(f => f.id));
  }, []);

  const clear = useCallback(() => {
    setSelected(prev => (prev.length === 0 ? prev : []));
    lastSelectedRef.current = null;
  }, []);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  return { selected, select, selectAll, clear, isSelected };
}
