import { useState, useCallback, useRef } from 'react';

export interface CogWindowState {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
}

let nextZIndex = 100;

export function useCogWindowManager() {
  const [windows, setWindows] = useState<CogWindowState[]>([]);
  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  const open = useCallback((type: string, title: string, opts?: Partial<Pick<CogWindowState, 'position' | 'size'>>) => {
    const existing = windowsRef.current.find(w => w.type === type);
    if (existing) {
      // Focus existing
      setWindows(prev => prev.map(w =>
        w.id === existing.id
          ? { ...w, minimized: false, focused: true, zIndex: ++nextZIndex }
          : { ...w, focused: false }
      ));
      return existing.id;
    }

    const id = `cog-${type}-${Date.now()}`;
    const newWindow: CogWindowState = {
      id,
      type,
      title,
      position: opts?.position ?? { x: 80 + windowsRef.current.length * 30, y: 60 + windowsRef.current.length * 30 },
      size: opts?.size ?? { width: 900, height: 600 },
      zIndex: ++nextZIndex,
      minimized: false,
      maximized: false,
      focused: true,
    };

    setWindows(prev => [
      ...prev.map(w => ({ ...w, focused: false })),
      newWindow,
    ]);
    return id;
  }, []);

  const close = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const focus = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id
        ? { ...w, focused: true, zIndex: ++nextZIndex }
        : { ...w, focused: false }
    ));
  }, []);

  const minimize = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: !w.minimized } : w
    ));
  }, []);

  const maximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, maximized: !w.maximized } : w
    ));
  }, []);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, position } : w
    ));
  }, []);

  const updateSize = useCallback((id: string, size: { width: number; height: number }) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, size } : w
    ));
  }, []);

  return {
    windows,
    open,
    close,
    focus,
    minimize,
    maximize,
    updatePosition,
    updateSize,
  };
}
