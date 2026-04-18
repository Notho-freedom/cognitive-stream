import { useCallback, useState } from 'react';
import type { CogContextMenuItem } from '@/components/desktop/CogContextMenu';

interface MenuState {
  open: boolean;
  x: number;
  y: number;
  items: CogContextMenuItem[];
}

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, items: [] });

  const openMenu = useCallback((e: React.MouseEvent | MouseEvent, items: CogContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ open: true, x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(m => ({ ...m, open: false })), []);

  return { menu, openMenu, close };
}
