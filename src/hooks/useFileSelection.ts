import { useCallback, useState } from 'react';
import type { FileEntity } from '@/types/explorer.types';

export function useFileSelection(files: FileEntity[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const select = useCallback((id: string, multi = false, range = false) => {
    if (range && lastSelected) {
      const ids = files.map(f => f.id);
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
    setLastSelected(id);
  }, [files, lastSelected]);

  const selectAll = useCallback(() => {
    setSelected(files.map(f => f.id));
  }, [files]);

  const clear = useCallback(() => {
    setSelected([]);
    setLastSelected(null);
  }, []);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  return { selected, select, selectAll, clear, isSelected };
}
