import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
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
  onTogglePanel: () => void;
}

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode, isAutonomous, autonomyCount, autonomyLimit, activeTasks,
  windows, onFocusWindow, onMinimizeWindow, radialItems,
  onToggleCommandBar, onTogglePanel,
}: DesktopTaskbarProps) {
  const { isAvailable, systemInfo } = useSystemBridge();
  const [time, setTime] = useState(() => new Date());
  const [radial, setRadial] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const startBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openRadial = () => {
    if (!startBtnRef.current) return;
    const r = startBtnRef.current.getBoundingClientRect();
    setRadial({ open: true, x: r.left + r.width / 2, y: r.top - 6 });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto h-[44px]"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-intent-primary/40 to-transparent" />
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] bg-intent-primary/20 pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="flex items-center justify-between h-full px-3 bg-surface-deep/95 backdrop-blur-xl border-t border-intent-primary/15">
          {/* LEFT: Radial trigger + command bar shortcut */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <button
              ref={startBtnRef}
              onClick={openRadial}
              className={cn(
                'flex items-center justify-center w-9 h-9 transition-all',
                'text-intent-primary border border-intent-primary/40 hover:bg-intent-primary/15',
                radial.open && 'bg-intent-primary/20',
              )}
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
              aria-label="Menu radial"
              title="Menu (apps)"
            >
              <span className="text-base font-light">◈</span>
            </button>
            <button
              onClick={onToggleCommandBar}
              className="flex items-center justify-center w-8 h-8 text-text-ghost hover:text-intent-primary border border-intent-primary/15 hover:border-intent-primary/40 transition-colors"
              style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
              title="Terminal IA (Ctrl+K)"
            >
              <span className="text-xs font-mono">⌘K</span>
            </button>
            <button
              onClick={onTogglePanel}
              className="flex items-center justify-center w-8 h-8 text-text-ghost hover:text-intent-primary border border-intent-primary/15 hover:border-intent-primary/40 transition-colors"
              style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
              title="Activité"
            >
              <span className="text-xs">≡</span>
            </button>
          </div>

          {/* CENTER: Open windows dock */}
          <div className="flex items-center justify-center gap-2 flex-1 overflow-x-auto px-4">
            {windows.length === 0 && (
              <div className="text-[8px] uppercase tracking-[0.3em] text-text-ghost/30">
                · IDLE ·
              </div>
            )}
            {windows.map(win => (
              <motion.button
                key={win.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => win.minimized ? onFocusWindow(win.id) : (win.focused ? onMinimizeWindow(win.id) : onFocusWindow(win.id))}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-wider transition-all border',
                  win.focused && !win.minimized
                    ? 'text-intent-primary border-intent-primary bg-intent-primary/10'
                    : 'text-text-ghost border-intent-primary/15 hover:text-text-primary hover:border-intent-primary/40',
                )}
                style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
              >
                <span className={cn(
                  'w-1 h-1 rounded-full',
                  win.focused && !win.minimized ? 'bg-intent-primary' : 'bg-text-ghost/40',
                )} />
                {win.title}
                {win.focused && !win.minimized && (
                  <motion.span
                    layoutId="taskbar-focus-glow"
                    className="absolute inset-0 border border-intent-primary/40 pointer-events-none"
                    style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* RIGHT: Status + clock */}
          <div className="flex items-center gap-3 text-[8px] font-mono tracking-wider min-w-[260px] justify-end">
            <motion.div
              className={cn('w-1.5 h-1.5 rounded-full', isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40')}
              animate={isAvailable ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={cn('uppercase', isAvailable ? 'text-intent-success' : 'text-text-ghost')}>
              {isAvailable ? 'SYSTEM' : 'WEB'}
            </span>
            {brainMode && (
              <>
                <span className="text-text-ghost/30">|</span>
                <span className="text-intent-primary">{brainMode}</span>
              </>
            )}
            {isAutonomous && (
              <>
                <span className="text-text-ghost/30">|</span>
                <motion.span className="text-intent-secondary"
                  animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  AUTO {autonomyCount}/{autonomyLimit}
                </motion.span>
              </>
            )}
            {activeTasks > 0 && (
              <>
                <span className="text-text-ghost/30">|</span>
                <span className="text-intent-focus">{activeTasks}T</span>
              </>
            )}
            <span className="text-text-ghost/30">|</span>
            <span className="uppercase tracking-[0.2em] text-text-ghost/60 hidden md:inline">
              {isAvailable && systemInfo ? systemInfo.hostname : 'COG'}
            </span>
            <span className="text-text-primary tabular-nums text-[10px]">
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-text-ghost/60 text-[8px]">
              {time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
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
