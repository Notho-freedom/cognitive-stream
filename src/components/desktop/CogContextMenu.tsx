import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CogContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface Props {
  open: boolean;
  x: number;
  y: number;
  items: CogContextMenuItem[];
  onClose: () => void;
}

/** GX-styled context menu — frameless, beveled, glassmorphism. */
export function CogContextMenu({ open, x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handle);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', handle);
      window.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);

  // Clamp into viewport
  const clamp = () => {
    if (typeof window === 'undefined') return { left: x, top: y };
    const W = window.innerWidth, H = window.innerHeight;
    const w = 220, h = items.length * 30 + 20;
    return {
      left: Math.min(W - w - 8, Math.max(8, x)),
      top: Math.min(H - h - 8, Math.max(8, y)),
    };
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[9999] w-[220px] bg-surface-deep/96 backdrop-blur-xl border border-intent-primary/25 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          style={{
            ...clamp(),
            clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
          }}
        >
          <div className="py-1">
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="h-px bg-intent-primary/15 my-1 mx-2" />
              ) : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => { item.onClick(); onClose(); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-1.5 text-[11px] tracking-wide transition-colors',
                    item.disabled
                      ? 'text-text-ghost/30 cursor-not-allowed'
                      : item.danger
                        ? 'text-intent-warning hover:bg-intent-warning/10'
                        : 'text-text-primary hover:bg-intent-primary/10',
                  )}
                >
                  <span className={cn(
                    'w-4 text-center',
                    item.danger ? 'text-intent-warning' : 'text-intent-primary',
                  )}>
                    {item.icon ?? '◇'}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ),
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
