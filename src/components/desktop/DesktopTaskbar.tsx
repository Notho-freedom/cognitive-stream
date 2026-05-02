import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  isLoading?: boolean;
  isStreaming?: boolean;
}

export const DesktopTaskbar = memo(function DesktopTaskbar({
  brainMode, isAutonomous, autonomyCount, autonomyLimit, activeTasks,
  windows, onFocusWindow, onMinimizeWindow, onCloseWindow, radialItems,
  onToggleCommandBar, isLoading, isStreaming,
}: DesktopTaskbarProps) {
  const { isAvailable, systemInfo } = useSystemBridge();
  const [time, setTime] = useState(() => new Date());
  const [radial, setRadial] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const [hoverDock, setHoverDock] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openRadial = () => {
    if (!startBtnRef.current) return;
    const r = startBtnRef.current.getBoundingClientRect();
    setRadial({ open: true, x: r.left + r.width / 2, y: r.top - 8 });
  };

  const brainActive = isLoading || isStreaming;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto flex justify-center pb-2 px-2"
      >
        {/* Dock container - centered, auto-width */}
        <motion.div
          className="relative flex items-end gap-0.5 px-3 py-1.5 rounded-2xl"
          onMouseEnter={() => setHoverDock(true)}
          onMouseLeave={() => setHoverDock(false)}
          style={{
            background: 'hsl(220 20% 8% / 0.72)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid hsl(187 85% 53% / 0.12)',
            boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(187 85% 53% / 0.06)',
          }}
        >
          {/* Glow line on top */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-intent-primary/25 to-transparent" />

          {/* Start button */}
          <DockItem tooltip="Menu" isActive={radial.open}>
            <button
              ref={startBtnRef}
              onClick={openRadial}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-intent-primary/15 active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L18 10L10 18L2 10Z" stroke="hsl(187 85% 53%)" strokeWidth="1.5" fill="hsl(187 85% 53% / 0.1)" />
                <circle cx="10" cy="10" r="2" fill="hsl(187 85% 53% / 0.6)" />
              </svg>
            </button>
          </DockItem>

          {/* Separator */}
          <div className="w-px h-6 bg-intent-primary/15 mx-1 self-center" />

          {/* Terminal AI button */}
          <DockItem tooltip="Terminal IA (Ctrl+K)">
            <button
              onClick={onToggleCommandBar}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-intent-primary/15 active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="3" width="16" height="12" rx="2" stroke="hsl(187 85% 53% / 0.7)" strokeWidth="1.2" />
                <path d="M4 8L7 10L4 12" stroke="hsl(187 85% 53%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="9" y1="12" x2="13" y2="12" stroke="hsl(187 85% 53% / 0.5)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </DockItem>

          {/* Separator before window items */}
          {windows.length > 0 && (
            <div className="w-px h-6 bg-intent-primary/15 mx-1 self-center" />
          )}

          {/* Open windows */}
          {windows.map(win => (
            <DockItem key={win.id} tooltip={win.title} isActive={win.focused && !win.minimized}>
              <button
                onClick={() => win.minimized ? onFocusWindow(win.id) : (win.focused ? onMinimizeWindow(win.id) : onFocusWindow(win.id))}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-90',
                  win.focused && !win.minimized
                    ? 'bg-intent-primary/20 text-intent-primary'
                    : 'text-text-ghost/70 hover:bg-white/8 hover:text-text-primary',
                )}
              >
                <span className="text-xs font-light tracking-wider uppercase">
                  {win.title.charAt(0)}
                </span>
              </button>
              {/* Active dot */}
              {!win.minimized && (
                <motion.div
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-intent-primary"
                  layoutId={`dock-dot-${win.id}`}
                />
              )}
            </DockItem>
          ))}

          {/* Separator before system tray */}
          <div className="w-px h-6 bg-intent-primary/15 mx-1 self-center" />

          {/* Brain status indicator */}
          <DockItem tooltip={brainMode ?? 'VEILLE'}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl">
              <motion.div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  brainActive ? 'bg-intent-primary' : 'bg-text-ghost/30',
                )}
                animate={brainActive ? {
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7],
                  boxShadow: ['0 0 0 0 hsl(187 85% 53% / 0)', '0 0 8px 2px hsl(187 85% 53% / 0.4)', '0 0 0 0 hsl(187 85% 53% / 0)'],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </DockItem>

          {/* Bridge status */}
          <DockItem tooltip={isAvailable ? 'Système connecté' : 'Mode web'}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                isAvailable ? 'bg-intent-success' : 'bg-text-ghost/40',
              )} />
            </div>
          </DockItem>

          {/* Clock */}
          <DockItem tooltip={time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}>
            <div className="flex flex-col items-center justify-center w-14 h-10 rounded-xl">
              <span className="text-[11px] font-light tabular-nums text-text-primary/90">
                {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[8px] text-text-ghost/50">
                {time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          </DockItem>
        </motion.div>
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

/** Individual dock item with hover magnification and tooltip */
function DockItem({
  children,
  tooltip,
  isActive,
}: {
  children: React.ReactNode;
  tooltip?: string;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        scale: hovered ? 1.15 : 1,
        y: hovered ? -4 : 0,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
      <AnimatePresence>
        {hovered && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-8 whitespace-nowrap px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-primary rounded-md pointer-events-none"
            style={{
              background: 'hsl(220 20% 10% / 0.9)',
              border: '1px solid hsl(187 85% 53% / 0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
