import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X, TerminalSquare, FolderOpen, Settings, TestTube2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useSound } from '@/hooks/useSound';
import type { CogWindowState } from '@/hooks/useCogWindowManager';
import { StartRadialMenu, type RadialItem } from './StartRadialMenu';

interface DesktopTaskbarProps {
  brainMode: string | null;
  isAutonomous: boolean;
  autonomyCount: number;
  autonomyLimit: number;
  activeTasks: number;
  windows: CogWindowState[];
  onFocusWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onCloseWindow?: (id: string) => void;
  radialItems: RadialItem[];
  onToggleCommandBar: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
}

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode, isAutonomous, autonomyCount, autonomyLimit, activeTasks,
  windows, onFocusWindow, onMinimizeWindow, onCloseWindow, radialItems,
  onToggleCommandBar, isLoading, isStreaming,
}: DesktopTaskbarProps) {
  const { isAvailable, systemInfo } = useSystemBridge();
  const { play, playHover } = useSound();
  const [time, setTime] = useState(() => new Date());
  const [radial, setRadial] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const startBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openRadial = () => {
    play('click');
    if (!startBtnRef.current) return;
    const r = startBtnRef.current.getBoundingClientRect();
    setRadial({ open: true, x: r.left + r.width / 2, y: r.top - 8 });
  };

  const brainActive = isLoading || isStreaming;

  const windowIcon = (type: string) => {
    if (type === 'explorer') return '📁';
    if (type === 'terminal') return '⌘';
    if (type === 'tests') return '⊛';
    return '◇';
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto"
      >
        <div
          className="flex items-center h-10 px-2 select-none border-t border-border/40"
          style={{
            background: 'hsl(220 24% 3% / 0.92)',
            backdropFilter: 'blur(24px) saturate(1.4)',
          }}
        >
          {/* Start button */}
          <button
            ref={startBtnRef}
            onClick={openRadial}
            onMouseEnter={playHover}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors mr-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L15 8L8 15L1 8Z" stroke="hsl(var(--primary))" strokeWidth="1.2" fill="hsl(var(--primary) / 0.1)" />
              <circle cx="8" cy="8" r="1.5" fill="hsl(var(--primary) / 0.6)" />
            </svg>
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Terminal AI */}
          <button
            onClick={() => { play('click'); onToggleCommandBar(); }}
            onMouseEnter={playHover}
            className="h-7 px-2 flex items-center gap-1.5 rounded text-[11px] font-light text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          >
            <TerminalSquare size={13} className="text-primary/70" />
            <span className="hidden sm:inline">Ctrl+K</span>
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Open windows */}
          <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {windows.map(win => (
              <button
                key={win.id}
                onClick={() => {
                  play('click');
                  if (win.minimized) onFocusWindow(win.id);
                  else if (win.focused) onMinimizeWindow(win.id);
                  else onFocusWindow(win.id);
                }}
                onMouseEnter={playHover}
                className={cn(
                  'h-7 px-2.5 flex items-center gap-1.5 rounded text-[11px] font-light transition-colors min-w-[100px] max-w-[180px]',
                  win.focused && !win.minimized
                    ? 'bg-[hsl(var(--explorer-hover))] text-foreground border-b-2 border-primary/60'
                    : 'text-muted-foreground hover:bg-[hsl(var(--explorer-hover))] hover:text-foreground',
                )}
              >
                <span className="text-xs">{windowIcon(win.type)}</span>
                <span className="truncate">{win.title}</span>
              </button>
            ))}
          </div>

          {/* System tray */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Brain status */}
            <div className="flex items-center gap-1.5 px-1.5 h-7 rounded text-[10px] font-mono">
              <motion.div
                className={cn(
                  'w-2 h-2 rounded-full',
                  brainActive ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
                animate={brainActive ? {
                  scale: [1, 1.4, 1],
                  opacity: [0.6, 1, 0.6],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-muted-foreground/70 uppercase tracking-wider">
                {brainMode ?? 'VEILLE'}
              </span>
            </div>

            {/* Bridge */}
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              isAvailable ? 'bg-emerald-400' : 'bg-muted-foreground/30',
            )} title={isAvailable ? 'Système connecté' : 'Mode web'} />

            {/* Separator */}
            <div className="w-px h-5 bg-border/30" />

            {/* Clock */}
            <div className="flex flex-col items-end px-1.5 h-7 justify-center">
              <span className="text-[11px] font-light tabular-nums text-foreground/90 leading-tight">
                {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[8px] text-muted-foreground/60 leading-tight">
                {time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <StartRadialMenu
        open={radial.open}
        anchor={{ x: radial.x, y: radial.y }}
        items={radialItems}
        onClose={() => setRadial(s => ({ ...s, open: false }))}
      />
    </>
  );
});
