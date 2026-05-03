import { useState, useRef, useEffect, useMemo, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StateIndicator } from '@/components/cognitive/StateIndicator';
import type { IndicatorMode } from '@/components/cognitive/StateIndicator';
import type { ActionPayload } from '@/components/cognitive/dynamic/types';

const DESKTOP_COMMANDS = [
  { cmd: 'open explorer', desc: 'Ouvrir l\'explorateur' },
  { cmd: 'open settings', desc: 'Ouvrir les paramètres' },
  { cmd: 'open tests', desc: 'Panel de tests cognitifs' },
  { cmd: 'clear', desc: 'Fermer toutes les cartes' },
  { cmd: 'close all', desc: 'Tout fermer (cartes + fenêtres)' },
  { cmd: 'focus terminal', desc: 'Focus sur le terminal' },
];

interface DesktopCommandBarProps {
  onSend: (message: string) => void;
  onConfirmAction: (message?: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  pendingAction: ActionPayload | null;
  aiProvider: string | null;
  aiModel: string | null;
  isLocalFallback: boolean;
  brainMode: string | null;
  messageCount: number;
  onMouseStateChange?: (inside: boolean) => void;
  visible: boolean;
  onToggleVisible: () => void;
}

const POS_KEY = 'desktop:commandbar:position:v1';

interface Position { x: number; y: number }

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function savePosition(p: Position) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {}
}

/**
 * DesktopCommandBar — Draggable AI Terminal. Hidden by default, Ctrl+K toggles.
 */
export function DesktopCommandBar({
  onSend, onConfirmAction, isLoading, isStreaming, error, pendingAction,
  aiProvider, aiModel, isLocalFallback, brainMode, messageCount,
  onMouseStateChange, visible, onToggleVisible,
}: DesktopCommandBarProps) {
  const [input, setInput] = useState('');
  const [position, setPosition] = useState<Position | null>(() => loadPosition());
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase().trim();
    return DESKTOP_COMMANDS.filter(c => c.cmd.startsWith(lower) && c.cmd !== lower);
  }, [input]);

  useEffect(() => {
    if (visible) requestAnimationFrame(() => inputRef.current?.focus());
  }, [visible]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onToggleVisible();
      }
      if (e.key === 'Escape' && visible) onToggleVisible();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onToggleVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (pendingAction) onConfirmAction(input.trim());
    else onSend(input.trim());
    setInput('');
  };

  const getIndicatorMode = (): IndicatorMode => {
    if (isLoading && !isStreaming) return 'thinking';
    if (isStreaming) return 'responding';
    if (error) return 'warning';
    if (pendingAction) return 'listening';
    return 'idle';
  };

  const getProviderDisplay = () => {
    if (!aiProvider) return '';
    const modelName = aiModel ? aiModel.split('/').pop()?.toUpperCase() : '';
    if (isLocalFallback) return `⚡${modelName || aiProvider.toUpperCase()}`;
    return modelName || aiProvider.toUpperCase();
  };

  const handleDragStart = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return;
    e.preventDefault();
    const W = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const H = typeof window !== 'undefined' ? window.innerHeight : 720;
    const cur = position ?? { x: (W - 560) / 2, y: H - 100 };
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: cur.x, origY: cur.y };

    const onMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const next = {
        x: Math.max(0, Math.min(W - 560, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(H - 60, dragRef.current.origY + dy)),
      };
      setPosition(next);
    };
    const onUp = () => {
      if (position) savePosition(position);
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const positionStyle = position
    ? { left: position.x, top: position.y, transform: 'none' as const }
    : { left: '50%', bottom: '24px', transform: 'translateX(-50%)' as const };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-50"
          style={positionStyle}
          onMouseEnter={() => onMouseStateChange?.(true)}
          onMouseLeave={() => onMouseStateChange?.(false)}
        >
          {/* Drag handle bar at top */}
          <div
            onMouseDown={handleDragStart}
            className="h-2.5 w-[560px] bg-[hsl(var(--explorer-hover))] hover:bg-border/50 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center gap-1 rounded-t-lg"
            title="Glissez pour déplacer · Ctrl+K"
          >
            <span className="w-6 h-0.5 bg-muted-foreground/30 rounded" />
            <span className="w-2 h-0.5 bg-muted-foreground/30 rounded" />
          </div>

          <div
            className="relative w-[560px] rounded-b-lg overflow-hidden border border-border/40 border-t-0"
            style={{
              background: 'hsl(220 24% 4% / 0.96)',
              backdropFilter: 'blur(24px) saturate(1.4)',
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.015] pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--primary) / 0.15) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--primary) / 0.15) 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px',
              }}
            />

            <form onSubmit={handleSubmit}>
              <div className="relative z-10 flex items-center gap-2 px-3 py-2.5">
                <StateIndicator mode={getIndicatorMode()} size="sm" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingAction ? 'Confirmez...' : "Demandez à l'IA... (Ctrl+K)"}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40',
                    'text-[12px] font-light tracking-wide outline-none',
                  )}
                />
                <div className="flex items-center gap-2 text-[7px] text-text-ghost font-mono tracking-wider">
                  {brainMode && <span className="text-intent-primary">{brainMode}</span>}
                  {aiProvider && (
                    <span className={isLocalFallback ? 'text-intent-focus' : 'text-intent-secondary'}>
                      {getProviderDisplay()}
                    </span>
                  )}
                  <span>#{messageCount}</span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    'px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium transition-all',
                    'text-text-primary border border-intent-primary/40',
                    'hover:bg-intent-primary/20 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                  style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
                >
                  {isLoading ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>◐</motion.span>
                  ) : pendingAction ? '✓' : '→'}
                </button>
              </div>
            </form>

            <motion.div
              className="absolute inset-x-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(187 100% 60% / 0.3), transparent)' }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
