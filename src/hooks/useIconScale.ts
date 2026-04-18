import { useEffect, useState } from 'react';

const KEY = 'desktop:icons:scale';
const MIN = 0.6;
const MAX = 1.8;
const STEP = 0.1;

function load(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? Number(raw) : 1;
    return Number.isFinite(v) ? Math.min(MAX, Math.max(MIN, v)) : 1;
  } catch { return 1; }
}

/** Ctrl+wheel anywhere in the app changes desktop icon scale. */
export function useIconScale() {
  const [scale, setScale] = useState<number>(() => load());

  useEffect(() => {
    try { localStorage.setItem(KEY, String(scale)); } catch {}
  }, [scale]);

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale(prev => {
        const dir = e.deltaY > 0 ? -1 : 1;
        const next = Math.round((prev + dir * STEP) * 10) / 10;
        return Math.min(MAX, Math.max(MIN, next));
      });
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, []);

  return { scale, setScale, MIN, MAX };
}
