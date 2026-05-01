import { useCallback, useRef, memo, type ReactNode, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Maximize2, X } from 'lucide-react';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { CogContextMenu } from './CogContextMenu';
import { useContextMenu } from '@/hooks/useContextMenu';
import { cn } from '@/lib/utils';
import type { CogWindowState } from '@/hooks/useCogWindowManager';

interface CogWindowProps {
  window: CogWindowState;
  children: ReactNode;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onPositionChange: (id: string, pos: { x: number; y: number }) => void;
}

export const CogWindow = memo(function CogWindow({
  window: win,
  children,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onPositionChange,
}: CogWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctx = useContextMenu();

  const windowContextItems = [
    { label: win.minimized ? 'Restaurer' : 'Réduire', icon: '−', onClick: () => onMinimize(win.id) },
    { label: win.maximized ? 'Restaurer' : 'Maximiser', icon: '□', onClick: () => onMaximize(win.id) },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Fermer', icon: '✕', danger: true, onClick: () => onClose(win.id) },
  ];

  const handleDragStart = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus(win.id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.position.x,
      origY: win.position.y,
    };

    const handleMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const next = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          onPositionChange(win.id, next);
        });
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [win.id, win.position, onFocus, onPositionChange]);

  const style = win.maximized
    ? { position: 'fixed' as const, inset: 0, zIndex: win.zIndex }
    : {
        position: 'absolute' as const,
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.minimized ? 'auto' : win.size.height,
        zIndex: win.zIndex,
      };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      className="pointer-events-auto"
      onMouseDown={() => onFocus(win.id)}
    >
      <FuturisticFrame
        variant="primary"
        animated={false}
        surfaceOpacity={win.focused ? 1.0 : 0.85}
        gridOpacity={0.015}
      >
        <div className="flex flex-col h-full">
          {/* Title bar — draggable + context menu */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-intent-primary/15 cursor-grab select-none"
            onMouseDown={handleDragStart}
            onContextMenu={(e) => { e.preventDefault(); ctx.openMenu(e as any, windowContextItems); }}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                win.focused ? 'bg-intent-primary' : 'bg-text-ghost/40',
              )} />
              <span className="text-[10px] uppercase tracking-[0.25em] text-text-ghost/70">
                {win.title}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onMinimize(win.id)} className="p-1 text-text-ghost/40 hover:text-text-primary transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onMaximize(win.id)} className="p-1 text-text-ghost/40 hover:text-text-primary transition-colors">
                <Maximize2 className="w-3 h-3" />
              </button>
              <button onClick={() => onClose(win.id)} className="p-1 text-text-ghost/40 hover:text-intent-warning transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!win.minimized && (
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
          )}
          {win.minimized && (
            <div className="px-4 py-2 text-[10px] text-text-ghost/55">
              Fenêtre réduite
            </div>
          )}
        </div>
      </FuturisticFrame>
      <CogContextMenu open={ctx.menu.open} x={ctx.menu.x} y={ctx.menu.y} items={ctx.menu.items} onClose={ctx.close} />
    </motion.div>
  );
});
