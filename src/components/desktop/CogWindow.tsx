import { useCallback, useRef, memo, type ReactNode, type MouseEvent, useState } from 'react';
import { motion } from 'framer-motion';
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
  onResize?: (id: string, size: { width: number; height: number }) => void;
}

type SnapZone = 'left' | 'right' | 'top-left' | 'top-right' | null;

const SNAP_THRESHOLD = 16;
const EDGE_ZONE = 48;

function getSnapZone(x: number, y: number): SnapZone {
  const vw = window.innerWidth;
  const nearLeft = x <= SNAP_THRESHOLD;
  const nearRight = x >= vw - SNAP_THRESHOLD;
  const nearTop = y <= SNAP_THRESHOLD;

  if (nearLeft && nearTop) return 'top-left';
  if (nearRight && nearTop) return 'top-right';
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  return null;
}

function getSnapStyle(zone: SnapZone): React.CSSProperties | null {
  const taskbarH = 40;
  const h = `calc(100vh - ${taskbarH}px)`;
  switch (zone) {
    case 'left': return { position: 'fixed', left: 0, top: taskbarH, width: '50vw', height: h };
    case 'right': return { position: 'fixed', right: 0, top: taskbarH, width: '50vw', height: h };
    case 'top-left': return { position: 'fixed', left: 0, top: taskbarH, width: '50vw', height: `calc(50vh - ${taskbarH / 2}px)` };
    case 'top-right': return { position: 'fixed', right: 0, top: taskbarH, width: '50vw', height: `calc(50vh - ${taskbarH / 2}px)` };
    default: return null;
  }
}

export const CogWindow = memo(function CogWindow({
  window: win,
  children,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onPositionChange,
  onResize,
}: CogWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctx = useContextMenu();
  const { play, playHover } = useSound();
  const [snapPreview, setSnapPreview] = useState<SnapZone>(null);
  const [snappedZone, setSnappedZone] = useState<SnapZone>(null);

  const windowContextItems = [
    { label: win.minimized ? 'Restaurer' : 'Réduire', icon: '−', onClick: () => onMinimize(win.id) },
    { label: win.maximized ? 'Restaurer' : 'Maximiser', icon: '□', onClick: () => onMaximize(win.id) },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Accrocher à gauche', icon: '◧', onClick: () => setSnappedZone('left') },
    { label: 'Accrocher à droite', icon: '◨', onClick: () => setSnappedZone('right') },
    { separator: true, label: '', onClick: () => {} },
    { label: 'Fermer', icon: '✕', danger: true, onClick: () => onClose(win.id) },
  ];

  const handleDragStart = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus(win.id);
    setSnappedZone(null); // Unsnap when dragging
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

      // Show snap preview
      const zone = getSnapZone(ev.clientX, ev.clientY);
      setSnapPreview(zone);

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          onPositionChange(win.id, next);
        });
      }
    };

    const handleUp = (ev: globalThis.MouseEvent) => {
      const zone = getSnapZone(ev.clientX, ev.clientY);
      if (zone) {
        setSnappedZone(zone);
        play('click');
      }
      setSnapPreview(null);
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
  }, [win.id, win.position, onFocus, onPositionChange, play]);

  // Determine style
  const snapStyle = snappedZone ? getSnapStyle(snappedZone) : null;
  const isSnapped = !!snapStyle;

  const style = win.maximized
    ? { position: 'fixed' as const, left: 0, right: 0, top: 40, bottom: 0, zIndex: win.zIndex }
    : isSnapped
      ? { ...snapStyle, zIndex: win.zIndex }
      : {
          position: 'absolute' as const,
          left: win.position.x,
          top: win.position.y,
          width: win.size.width,
          height: win.minimized ? 'auto' : win.size.height,
          zIndex: win.zIndex,
        };

  return (
    <>
      {/* Snap preview indicator */}
      {snapPreview && (
        <div
          className="fixed z-[9998] pointer-events-none rounded-lg border-2 border-primary/40 transition-all duration-150"
          style={{
            ...getSnapStyle(snapPreview),
            background: 'hsl(var(--primary) / 0.06)',
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: win.minimized ? 0 : 1,
          scale: win.minimized ? 0.8 : 1,
          y: win.minimized ? 100 : 0,
        }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={style as any}
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
          {/* Title bar */}
          <div
            className="flex items-center h-9 px-2 border-b border-border/40 cursor-grab select-none shrink-0"
            style={{ background: 'hsl(220 24% 3%)' }}
            onMouseDown={handleDragStart}
            onDoubleClick={() => {
              play('click');
              if (snappedZone) { setSnappedZone(null); return; }
              onMaximize(win.id);
            }}
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
              {isSnapped && (
                <span className="text-[8px] text-primary/50 uppercase tracking-wider">accroché</span>
              )}
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
                onClick={() => { play('click'); if (snappedZone) { setSnappedZone(null); } else { onMaximize(win.id); } }}
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
        </div>
        <CogContextMenu open={ctx.menu.open} x={ctx.menu.x} y={ctx.menu.y} items={ctx.menu.items} onClose={ctx.close} />
      </motion.div>
    </>
  );
});
