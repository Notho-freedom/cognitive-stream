import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

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

/** Context menu — explorer glass-menu style */
export function CogContextMenu({ open, x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { playHover } = useSound();

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

  const clamp = () => {
    if (typeof window === 'undefined') return { left: x, top: y };
    const W = window.innerWidth, H = window.innerHeight;
    const w = 220, h = items.length * 30 + 12;
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
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[9999] w-[220px] glass-menu rounded-lg overflow-hidden"
          style={{
            ...clamp(),
            background: 'hsl(220 24% 5% / 0.96)',
            backdropFilter: 'blur(20px) saturate(1.3)',
            border: '1px solid hsl(var(--border) / 0.5)',
            boxShadow: '0 8px 32px hsl(0 0% 0% / 0.5)',
          }}
        >
          <div className="py-1">
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="h-px bg-border/30 my-1 mx-2" />
              ) : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onMouseEnter={playHover}
                  onClick={() => { item.onClick(); onClose(); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-light transition-colors',
                    item.disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : item.danger
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-[hsl(var(--explorer-hover))]',
                  )}
                >
                  <span className={cn(
                    'w-4 text-center text-[11px]',
                    item.danger ? 'text-destructive' : 'text-muted-foreground',
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
