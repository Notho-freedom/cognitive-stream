import { memo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Folder, Grid3X3, Monitor, Settings, TerminalSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import { useSound } from '@/hooks/useSound';
import type { CogWindowState } from '@/hooks/useCogWindowManager';
import { KaliStartMenu, type KaliMenuAction } from './KaliStartMenu';
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
  menuActions: KaliMenuAction[];
  onToggleCommandBar: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
}

const WINDOW_ICONS: Record<string, React.ReactNode> = {
  explorer: <Folder size={12} />,
  terminal: <TerminalSquare size={12} />,
  tests: <Grid3X3 size={12} />,
};

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode, isAutonomous, autonomyCount, autonomyLimit, activeTasks,
  windows, onFocusWindow, onMinimizeWindow, onCloseWindow, menuActions,
  onToggleCommandBar, isLoading, isStreaming,
}: DesktopTaskbarProps) {
  const { isAvailable } = useSystemBridge();
  const { play, playHover } = useSound();
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const [hoveredWindow, setHoveredWindow] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState(1);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    play('click');
    if (!startBtnRef.current) return;
    const r = startBtnRef.current.getBoundingClientRect();
    setMenu({ open: true, x: r.left, y: r.bottom + 4 });
  };

  const brainActive = isLoading || isStreaming;

  // Quick launchers from menu favorites
  const favorites = menuActions.filter(a => a.category === 'favorites').slice(0, 4);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-auto"
      >
        <div
          className="flex items-center h-9 px-1 select-none border-b border-border/50"
          style={{
            background: 'hsl(220 24% 5% / 0.95)',
            backdropFilter: 'blur(24px) saturate(1.4)',
          }}
        >
          {/* Kali applications menu trigger */}
          <button
            ref={startBtnRef}
            onClick={openMenu}
            onMouseEnter={playHover}
            className={cn(
              'h-7 px-2.5 flex items-center gap-2 rounded-sm transition-colors mr-1',
              'text-[11px] font-light text-foreground/85',
              menu.open ? 'bg-primary/15 text-primary' : 'hover:bg-[hsl(var(--explorer-hover))]',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"
                stroke="hsl(var(--primary))" strokeWidth="1.4" fill="hsl(var(--primary) / 0.12)" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.2" fill="hsl(var(--primary))" />
            </svg>
            <span className="hidden sm:inline tracking-wide">Applications</span>
          </button>

          <div className="w-px h-4 bg-border/40 mx-0.5" />

          {/* Quick launchers */}
          <div className="flex items-center gap-px mr-1">
            {favorites.map(fav => (
              <button
                key={fav.id}
                onClick={() => { play('click'); fav.onClick(); }}
                onMouseEnter={playHover}
                title={fav.label}
                className="h-7 w-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
              >
                {fav.icon ?? <Folder size={13} />}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border/40 mx-0.5" />

          {/* Open windows (XFCE-style task list) */}
          <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none px-1">
            {windows.length === 0 && (
              <div className="hidden sm:flex items-center gap-1.5 h-7 px-2 text-[10px] uppercase tracking-wider text-muted-foreground/35">
                <Grid3X3 size={11} /> Espace de travail prêt
              </div>
            )}
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
                    'h-7 px-2 flex items-center gap-1.5 rounded-sm text-[11px] font-light transition-colors min-w-[120px] max-w-[200px]',
                    win.focused && !win.minimized
                      ? 'bg-[hsl(220_22%_10%)] text-foreground border-b-2 border-primary'
                      : win.minimized
                        ? 'text-muted-foreground/60 italic hover:bg-[hsl(var(--explorer-hover))]'
                        : 'text-muted-foreground hover:bg-[hsl(var(--explorer-hover))] hover:text-foreground',
                  )}
                >
                  <span className="text-primary/80 shrink-0">{WINDOW_ICONS[win.type] ?? <Folder size={12} />}</span>
                  <span className="truncate flex-1 text-left">{win.title}</span>
                </button>

                {hoveredWindow === win.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full left-0 mt-1 px-2.5 py-1.5 rounded border border-border/40 pointer-events-none z-[60] whitespace-nowrap"
                    style={{
                      background: 'hsl(220 24% 5% / 0.97)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <div className="text-[10px] font-light text-foreground">{win.title}</div>
                    <div className="text-[9px] text-muted-foreground/60">
                      {win.minimized ? 'Réduit' : win.maximized ? 'Plein écran' : `${win.size.width}×${win.size.height}`}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <div className="w-px h-4 bg-border/40 mx-0.5" />

          {/* Workspaces */}
          <div className="hidden md:flex items-center gap-px mr-1" title="Espaces de travail">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => { play('click'); setWorkspace(n); }}
                className={cn(
                  'h-5 w-5 text-[9px] font-light border transition-colors flex items-center justify-center',
                  workspace === n
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))]',
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border/40 mx-0.5" />

          {/* Terminal AI */}
          <button
            onClick={() => { play('click'); onToggleCommandBar(); }}
            onMouseEnter={playHover}
            title="Terminal IA (Ctrl+K)"
            className="h-7 px-2 flex items-center gap-1.5 rounded-sm text-[10px] font-light text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          >
            <TerminalSquare size={12} className="text-primary/70" />
            <span className="hidden lg:inline tracking-wider">IA</span>
          </button>

          {/* System Tray */}
          <SystemTray
            brainMode={brainMode}
            brainActive={!!brainActive}
            isConnected={isAvailable}
          />
        </div>
      </motion.div>

      <KaliStartMenu
        open={menu.open}
        anchor={{ x: menu.x, y: menu.y }}
        actions={menuActions}
        onClose={() => setMenu(s => ({ ...s, open: false }))}
      />
    </>
  );
});
