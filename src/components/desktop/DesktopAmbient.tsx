import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/** Ambient particles + scanline. Pointer-events: none. */
export const DesktopAmbient = memo(function DesktopAmbient({ disabled = false }: { disabled?: boolean }) {
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 18 + Math.random() * 18,
    })),
  );
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (disabled) return;
    const handler = (e: MouseEvent) => {
      // Only register clicks on the desktop layer (no UI element)
      const target = e.target as HTMLElement;
      if (target.closest('button, input, [data-no-ripple]')) return;
      const id = Date.now() + Math.random();
      setRipples(prev => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [disabled]);

  if (disabled) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-[3px] h-[3px] bg-intent-primary/40 rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: ['0%', '-12%', '6%', '0%'],
            opacity: [0.1, 0.6, 0.3, 0.1],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-intent-primary/15 to-transparent"
        animate={{ top: ['-2%', '102%'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      {ripples.map(r => (
        <motion.div
          key={r.id}
          className="absolute rounded-full border border-intent-primary/40"
          style={{ left: r.x - 4, top: r.y - 4, width: 8, height: 8 }}
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 14, opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
});
