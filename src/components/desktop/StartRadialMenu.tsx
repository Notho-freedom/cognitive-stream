import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

export interface RadialItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  open: boolean;
  anchor: { x: number; y: number };
  items: RadialItem[];
  onClose: () => void;
}

/** Radial GX command palette — items disposed in an arc. */
export function StartRadialMenu({ open, anchor, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);

  // Items in semicircle above the anchor
  const RADIUS = 130;
  const total = items.length;
  // Spread from -160deg to -20deg (above)
  const startAngle = -170;
  const endAngle = -10;
  const step = total <= 1 ? 0 : (endAngle - startAngle) / (total - 1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="fixed z-[9000] pointer-events-none"
          style={{ left: anchor.x, top: anchor.y, width: 0, height: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Center hub */}
          <motion.div
            className="absolute pointer-events-auto"
            style={{ left: -22, top: -22 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center bg-surface-deep/95 backdrop-blur-xl border border-intent-primary/40 text-intent-primary hover:bg-intent-primary/15 transition-colors"
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
              aria-label="Fermer le menu"
            >
              ◈
            </button>
          </motion.div>

          {items.map((item, i) => {
            const angle = (startAngle + step * i) * (Math.PI / 180);
            const x = Math.cos(angle) * RADIUS;
            const y = Math.sin(angle) * RADIUS;
            return (
              <motion.button
                key={i}
                className="absolute pointer-events-auto flex flex-col items-center justify-center w-[78px] h-[78px] bg-surface-deep/90 backdrop-blur-xl border border-intent-primary/25 text-text-primary hover:border-intent-primary hover:bg-intent-primary/10 transition-colors group"
                style={{
                  left: x - 39,
                  top: y - 39,
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                }}
                initial={{ opacity: 0, scale: 0.4, x: -x * 0.6, y: -y * 0.6 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.4, x: -x * 0.4, y: -y * 0.4 }}
                transition={{ duration: 0.22, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => { item.onClick(); onClose(); }}
              >
                <span className="text-lg text-intent-primary group-hover:text-intent-primary mb-1">
                  {item.icon}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-text-ghost group-hover:text-text-primary text-center px-1 leading-tight">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
