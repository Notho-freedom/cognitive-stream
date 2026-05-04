import { memo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useSound } from '@/hooks/useSound';
import type { CogWindowState } from '@/hooks/useCogWindowManager';
import { StartRadialMenu, type RadialItem } from './StartRadialMenu';
import { SystemTray } from './SystemTray';

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

const WINDOW_ICONS: Record<string, string> = {
  explorer: '📁',
  terminal: '⌘',
  tests: '⊛',
};

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode, isAutonomous, autonomyCount, autonomyLimit, activeTasks,
  windows, onFocusWindow, onMinimizeWindow, onCloseWindow, radialItems,
  onToggleCommandBar, isLoading, isStreaming,
}: DesktopTaskbarProps) {
  const { isAvailable } = useSystemBridge();
  const { play, playHover } = useSound();
  const [radial, setRadial] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const [hoveredWindow, setHoveredWindow] = useState<string | null>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  const openRadial = () => {
    play('click');
    if (!startBtnRef.current) return;
    const r = startBtnRef.current.getBoundingClientRect();
    setRadial({ open: true, x: r.left + r.width / 2, y: r.top - 8 });
  };

  const brainActive = isLoading || isStreaming;

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
              <div key={win.id} className="relative">
                <button
                  onClick={() => {
                    play('click');
                    if (win.minimized) onFocusWindow(win.id);
                    else if (win.focused) onMinimizeWindow(win.id);
                    else onFocusWindow(win.id);
                  }}
                  onMouseEnter={() => { playHover(); setHoveredWindow(win.id); }}
                  onMouseLeave={() => setHoveredWindow(null)}
                  className={cn(
                    'h-7 px-2.5 flex items-center gap-1.5 rounded text-[11px] font-light transition-colors min-w-[100px] max-w-[180px]',
                    win.focused && !win.minimized
                      ? 'bg-[hsl(var(--explorer-hover))] text-foreground border-b-2 border-primary/60'
                      : 'text-muted-foreground hover:bg-[hsl(var(--explorer-hover))] hover:text-foreground',
                  )}
                >
                  <span className="text-xs">{WINDOW_ICONS[win.type] ?? '◇'}</span>
                  <span className="truncate">{win.title}</span>
                </button>

                {/* Window preview tooltip */}
                {hoveredWindow === win.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg border border-border/30 pointer-events-none z-[60]"
                    style={{
                      background: 'hsl(220 24% 5% / 0.96)',
                      backdropFilter: 'blur(16px)',
                      minWidth: 160,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{WINDOW_ICONS[win.type] ?? '◇'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-light text-foreground truncate">{win.title}</div>
                        <div className="text-[8px] text-muted-foreground/60 mt-0.5">
                          {win.minimized ? 'Réduit' : win.maximized ? 'Maximisé' : `${win.size.width}×${win.size.height}`}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* System Tray */}
          <SystemTray
            brainMode={brainMode}
            brainActive={!!brainActive}
            isConnected={isAvailable}
          />
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
