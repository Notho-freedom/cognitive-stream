import { memo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CogWindowState } from '@/hooks/useCogWindowManager';

interface WindowSwitcherProps {
  windows: CogWindowState[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const WINDOW_ICONS: Record<string, string> = {
  explorer: '📁',
  terminal: '⌘',
  tests: '⊛',
};

/**
 * Alt+Tab window switcher overlay — GX glassmorphism.
 */
export const WindowSwitcher = memo(function WindowSwitcher({
  windows,
  onSelect,
  onClose,
}: WindowSwitcherProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (windows.length === 0) { onClose(); return; }

    let altDown = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altDown = true;

      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (!visible) {
          setVisible(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(prev => (prev + (e.shiftKey ? -1 : 1) + windows.length) % windows.length);
        }
      }

      if (e.key === 'Escape' && visible) {
        setVisible(false);
        onClose();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        altDown = false;
        if (visible) {
          const win = windows[selectedIndex];
          if (win) onSelect(win.id);
          setVisible(false);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [windows, visible, selectedIndex, onSelect, onClose]);

  if (!visible || windows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setVisible(false); onClose(); }} />

      {/* Switcher panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center gap-3 px-5 py-4 rounded-xl border border-border/40"
        style={{
          background: 'hsl(220 24% 5% / 0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 60px hsl(0 0% 0% / 0.6)',
        }}
      >
        {windows.map((win, i) => (
          <button
            key={win.id}
            onClick={() => { onSelect(win.id); setVisible(false); onClose(); }}
            className={cn(
              'flex flex-col items-center gap-2 px-5 py-3 rounded-lg transition-all min-w-[100px]',
              i === selectedIndex
                ? 'bg-[hsl(var(--primary)/0.15)] ring-1 ring-primary/40'
                : 'hover:bg-white/5',
            )}
          >
            <span className="text-2xl">{WINDOW_ICONS[win.type] ?? '◇'}</span>
            <span className="text-[10px] font-light tracking-wider uppercase text-muted-foreground truncate max-w-[120px]">
              {win.title}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
});
