import { useCallback, useRef, memo, type ReactNode, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { CogContextMenu } from './CogContextMenu';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useSound } from '@/hooks/useSound';
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
  const { play, playHover } = useSound();

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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      className="pointer-events-auto"
      onMouseDown={() => onFocus(win.id)}
    >
      <div
        className={cn(
          'flex flex-col h-full rounded-lg overflow-hidden border',
          win.focused ? 'border-border/50' : 'border-border/25',
        )}
        style={{
          background: 'hsl(220 24% 4% / 0.96)',
          backdropFilter: 'blur(20px)',
          boxShadow: win.focused
            ? '0 12px 40px hsl(0 0% 0% / 0.5), 0 0 1px hsl(var(--primary) / 0.2)'
            : '0 8px 24px hsl(0 0% 0% / 0.4)',
        }}
      >
        {/* Title bar — explorer-style */}
        <div
          className="flex items-center h-9 px-2 border-b border-border/40 cursor-grab select-none shrink-0"
          style={{ background: 'hsl(220 24% 3%)' }}
          onMouseDown={handleDragStart}
          onContextMenu={(e) => { e.preventDefault(); ctx.openMenu(e as any, windowContextItems); }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              win.focused ? 'bg-primary' : 'bg-muted-foreground/30',
            )} />
            <span className="text-[12px] font-light text-muted-foreground truncate">
              {win.title}
            </span>
          </div>
          <div className="flex items-center shrink-0">
            <button
              onClick={() => { play('click'); onMinimize(win.id); }}
              onMouseEnter={playHover}
              className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
            >
              <Minus size={13} />
            </button>
            <button
              onClick={() => { play('click'); onMaximize(win.id); }}
              onMouseEnter={playHover}
              className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
            >
              <Square size={11} />
            </button>
            <button
              onClick={() => { play('close'); onClose(win.id); }}
              onMouseEnter={playHover}
              className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-white hover:bg-destructive transition-colors"
            >
              <X size={13} />
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
          <div className="px-3 py-2 text-[11px] text-muted-foreground font-light">
            Fenêtre réduite
          </div>
        )}
      </div>
      <CogContextMenu open={ctx.menu.open} x={ctx.menu.x} y={ctx.menu.y} items={ctx.menu.items} onClose={ctx.close} />
    </motion.div>
  );
});
