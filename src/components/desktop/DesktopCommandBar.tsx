import { useState, useRef, useCallback, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StateIndicator } from '@/components/cognitive/StateIndicator';
import type { IndicatorMode } from '@/components/cognitive/StateIndicator';
import type { ActionPayload } from '@/components/cognitive/dynamic/types';

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
}

/**
 * DesktopCommandBar — Barre de saisie fixe en bas-centre de l'écran
 * Input uniquement, pas de zone de réponse
 */
export function DesktopCommandBar({
  onSend,
  onConfirmAction,
  isLoading,
  isStreaming,
  error,
  pendingAction,
  aiProvider,
  aiModel,
  isLocalFallback,
  brainMode,
  messageCount,
  onMouseStateChange,
}: DesktopCommandBarProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    const width = 560;
    const height = 84;
    const margin = 24;
    return {
      x: Math.max(margin, (window.innerWidth - width) / 2),
      y: Math.max(margin, window.innerHeight - height - margin),
    };
  });

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const handleDragStart = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, button')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };

    const handleMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const width = 560;
      const height = 84;
      const margin = 16;
      const maxX = Math.max(margin, window.innerWidth - width - margin);
      const maxY = Math.max(margin, window.innerHeight - height - margin);
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPosition({
        x: clamp(dragRef.current.origX + dx, margin, maxX),
        y: clamp(dragRef.current.origY + dy, margin, maxY),
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [position]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (pendingAction) {
      onConfirmAction(input.trim());
    } else {
      onSend(input.trim());
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseEnter={() => onMouseStateChange?.(true)}
      onMouseLeave={() => onMouseStateChange?.(false)}
      onMouseDown={handleDragStart}
    >
      <div
        className="relative w-[560px]"
        style={{
          background: 'hsl(220 22% 8% / 0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          clipPath: 'polygon(16px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 16px)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(187 85% 53% / 0.2) 1px, transparent 1px),
              linear-gradient(90deg, hsl(187 85% 53% / 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Input form */}
        <form onSubmit={handleSubmit}>
          <div className="relative z-10 flex items-center gap-2 px-4 py-3">
            <StateIndicator mode={getIndicatorMode()} size="sm" />

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingAction ? 'Confirmez...' : "Demandez à l'IA..."}
              disabled={isLoading}
              className={cn(
                'flex-1 bg-transparent text-text-primary placeholder:text-text-ghost/40',
                'text-sm font-light tracking-wide outline-none',
              )}
              autoFocus
            />

            {/* Status chips */}
            <div className="flex items-center gap-2 text-[7px] text-text-ghost font-mono tracking-wider">
              {brainMode && (
                <span className="text-intent-primary">{brainMode}</span>
              )}
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

        {/* Scan line */}
        <motion.div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(187 100% 60% / 0.3), transparent)',
          }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Border edges */}
      <div
        className="absolute top-0 left-[20px] right-[8px] h-px"
        style={{ background: 'linear-gradient(90deg, hsl(187 100% 60% / 0.7), hsl(187 85% 35% / 0.2))' }}
      />
      <div
        className="absolute bottom-0 left-[8px] right-[20px] h-px"
        style={{ background: 'linear-gradient(90deg, hsl(187 85% 35% / 0.2), hsl(187 100% 60% / 0.5))' }}
      />

      {/* Corner accents */}
      <motion.div
        className="absolute -top-px -left-px"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <line x1="0" y1="16" x2="16" y2="0" stroke="hsl(187, 100%, 60%)" strokeWidth="1" />
          <circle cx="14" cy="2" r="1.5" fill="hsl(187, 100%, 60%)" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute -bottom-px -right-px"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <line x1="2" y1="18" x2="18" y2="2" stroke="hsl(187, 100%, 60%)" strokeWidth="1" />
          <circle cx="4" cy="16" r="1.5" fill="hsl(187, 100%, 60%)" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
