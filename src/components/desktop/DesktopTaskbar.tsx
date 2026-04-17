import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import type { CogWindowState } from '@/hooks/useCogWindowManager';

interface DesktopTaskbarProps {
  brainMode: string | null;
  isAutonomous: boolean;
  autonomyCount: number;
  autonomyLimit: number;
  activeTasks: number;
  windows: CogWindowState[];
  onFocusWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  startMenuItems: Array<{ label: string; onClick: () => void; icon?: string }>;
}

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode,
  isAutonomous,
  autonomyCount,
  autonomyLimit,
  activeTasks,
  windows,
  onFocusWindow,
  onMinimizeWindow,
  startMenuItems,
}: DesktopTaskbarProps) {
  const { isAvailable, systemInfo } = useSystemBridge();
  const [time, setTime] = useState(() => new Date());
  const [startOpen, setStartOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!startOpen) return;
    const handle = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartOpen(false);
      }
    };
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [startOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto h-[44px]"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-intent-primary/30 to-transparent" />

      <div
        className="flex items-center justify-between h-full px-3 bg-surface-deep/95 backdrop-blur-xl border-t border-intent-primary/10"
      >
        {/* LEFT: Start button + open windows */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div ref={startRef} className="relative">
            <button
              onClick={() => setStartOpen(v => !v)}
              className={cn(
                'flex items-center justify-center w-9 h-9 transition-colors',
                'text-intent-primary border border-intent-primary/30',
                startOpen ? 'bg-intent-primary/20' : 'hover:bg-intent-primary/10',
              )}
              style={{ clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)' }}
              aria-label="Menu démarrer"
            >
              <span className="text-base font-light">◈</span>
            </button>

            <AnimatePresence>
              {startOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-full left-0 mb-2 w-[260px] bg-surface-deep/98 backdrop-blur-xl border border-intent-primary/25"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
                >
                  <div className="p-2">
                    <div className="px-2 py-1 mb-1 text-[9px] uppercase tracking-[0.25em] text-text-ghost/60">
                      Applications
                    </div>
                    {startMenuItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { item.onClick(); setStartOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-text-primary hover:bg-intent-primary/10 transition-colors"
                      >
                        <span className="text-intent-primary text-sm">{item.icon ?? '◇'}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Open windows */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {windows.map(win => (
              <button
                key={win.id}
                onClick={() => win.minimized ? onFocusWindow(win.id) : (win.focused ? onMinimizeWindow(win.id) : onFocusWindow(win.id))}
                className={cn(
                  'px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all border-b-2',
                  win.focused && !win.minimized
                    ? 'text-intent-primary border-intent-primary bg-intent-primary/10'
                    : 'text-text-ghost border-transparent hover:text-text-primary hover:bg-white/5',
                )}
              >
                {win.title}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Brain status */}
        <div className="flex items-center gap-3 text-[8px] font-mono tracking-wider px-3">
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
              <motion.span
                className="text-intent-secondary"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
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
        </div>

        {/* RIGHT: Hostname + clock */}
        <div className="flex items-center gap-3 text-[9px] font-mono tracking-wider text-text-ghost flex-1 justify-end">
          <span className="uppercase tracking-[0.2em] text-text-ghost/60">
            {isAvailable && systemInfo ? systemInfo.hostname : 'COGNITIVE STREAM'}
          </span>
          <span className="text-text-ghost/30">|</span>
          <span className="text-text-primary tabular-nums">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-text-ghost/60 text-[8px]">
            {time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
