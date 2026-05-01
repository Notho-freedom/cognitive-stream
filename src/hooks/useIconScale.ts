import { useEffect, useCallback } from 'react';
import { useSettings } from '@/hooks/useSettings';

const MIN = 0.6;
const MAX = 1.8;
const STEP = 0.1;

/** Ctrl+wheel anywhere in the app changes desktop icon scale via settings. */
export function useIconScale() {
  const { settings, update } = useSettings();

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const next = Math.round((settings.iconScale + dir * STEP) * 10) / 10;
      update('iconScale', Math.min(MAX, Math.max(MIN, next)));
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [settings.iconScale, update]);

  return { scale: settings.iconScale, setScale: (v: number) => update('iconScale', v), MIN, MAX };
}
