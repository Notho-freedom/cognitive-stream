import { useEffect, useState, useRef, memo, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ThoughtStream } from '@/components/cognitive/ThoughtStream';
import { CognitiveRenderer } from '@/components/cognitive/dynamic/CognitiveRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';

export interface FloatingCard {
  id: string;
  type: 'response' | 'action' | 'error' | 'thought';
  schema?: CognitiveUISchema;
  text?: string;
  error?: string;
  autoDismissMs?: number; // 0 = manual dismiss only
  timestamp: number;
  position: { x: number; y: number };
  zIndex: number;
}

interface FloatingResponseCardProps {
  card: FloatingCard;
  onDismiss: (id: string) => void;
  onAction: (action: ActionPayload) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onBringToFront: (id: string) => void;
  onMouseStateChange?: (inside: boolean) => void;
  surfaceOpacity?: number;
}

const TYPE_CONFIG = {
  response: { label: 'RÉPONSE', dotClass: 'bg-intent-primary' },
  action:   { label: 'ACTION',  dotClass: 'bg-intent-focus' },
  error:    { label: 'ERREUR',  dotClass: 'bg-intent-warning' },
  thought:  { label: 'PENSÉE',  dotClass: 'bg-intent-secondary' },
} as const;

/**
 * FloatingResponseCard — Universal container for ALL cognitive output.
 * Text, schemas, errors, thoughts — everything renders inside this card.
 * Handles scroll for large content and adapts width to content type.
 */
export const FloatingResponseCard = memo(function FloatingResponseCard({
  card,
  onDismiss,
  onAction,
  onPositionChange,
  onBringToFront,
  onMouseStateChange,
  surfaceOpacity,
}: FloatingResponseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Mark complete immediately if no streaming text
  useEffect(() => {
    if (!card.text || card.type !== 'response') {
      setIsComplete(true);
    }
  }, [card.text, card.type]);

  // Auto-dismiss timer (paused on hover)
  useEffect(() => {
    if (!card.autoDismissMs || card.autoDismissMs <= 0) return;
    if (isHovered) return;
    if (!isComplete && card.type === 'response' && card.text) return;

    const timer = setTimeout(() => {
      onDismiss(card.id);
    }, card.autoDismissMs);

    return () => clearTimeout(timer);
  }, [card.id, card.autoDismissMs, card.timestamp, isHovered, isComplete, card.type, card.text, onDismiss]);

  const frameVariant = card.type === 'error' ? 'secondary' : 'primary';
  const config = TYPE_CONFIG[card.type];

  // Determine if content needs extra width (schemas with tables/grids)
  const hasSchema = Boolean(card.schema);
  const hasText = Boolean(card.text);
  const hasError = Boolean(card.error);

  const handleDragStart = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onBringToFront(card.id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: card.position.x,
      origY: card.position.y,
    };

    const handleMove = (ev: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      pendingPositionRef.current = {
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      };
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingPositionRef.current) {
            onPositionChange(card.id, pendingPositionRef.current);
          }
        });
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto absolute select-none"
      style={{ left: card.position.x, top: card.position.y, zIndex: card.zIndex }}
      onMouseEnter={() => { setIsHovered(true); onMouseStateChange?.(true); }}
      onMouseLeave={() => { setIsHovered(false); onMouseStateChange?.(false); }}
    >
      <div className={cn(
        'relative',
        hasSchema ? 'w-[540px] max-w-[90vw]' : 'w-[480px] max-w-[85vw]',
      )}>
        <FuturisticFrame
          variant={frameVariant}
          animated={!isComplete}
          surfaceOpacity={surfaceOpacity ?? 0.75}
          gridOpacity={0.02}
        >
          <div className="p-5">
            {/* ── Header ── */}
            <CardHeader
              type={card.type}
              config={config}
              onDismiss={() => onDismiss(card.id)}
              onDragStart={handleDragStart}
            />

            {/* ── Content area with scroll ── */}
            <ScrollArea className="max-h-[60vh]">
              <div ref={contentRef} className="space-y-3 pr-2">
                {/* Error banner */}
                {hasError && (
                  <div
                    className="p-3 border border-intent-warning/30 bg-intent-warning/5"
                    style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
                  >
                    <p className="text-xs text-intent-warning leading-relaxed">{card.error}</p>
                  </div>
                )}

                {/* Text content (streamed) */}
                {hasText && (
                  <div className="min-h-[32px]">
                    <ThoughtStream
                      text={card.text!}
                      speed="adaptive"
                      isStreaming={card.type === 'response'}
                      onComplete={() => setIsComplete(true)}
                    />
                  </div>
                )}

                {/* Schema-driven cognitive components — rendered INSIDE the card */}
                {hasSchema && (
                  <div className={cn(
                    hasText ? 'pt-2 mt-2 border-t border-intent-primary/10' : '',
                  )}>
                    <CognitiveRenderer schema={card.schema!} onAction={onAction} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Footer data bar ── */}
            <CardFooter />

            {/* Auto-dismiss progress bar */}
            {card.autoDismissMs && card.autoDismissMs > 0 && !isHovered && (
              <motion.div
                className="absolute bottom-0 left-0 h-px bg-intent-primary/40"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: card.autoDismissMs / 1000, ease: 'linear' }}
              />
            )}
          </div>
        </FuturisticFrame>
      </div>
    </motion.div>
  );
});

/* ── Sub-components ── */

function CardHeader({
  type,
  config,
  onDismiss,
  onDragStart,
}: {
  type: FloatingCard['type'];
  config: { label: string; dotClass: string };
  onDismiss: () => void;
  onDragStart: (event: MouseEvent) => void;
}) {
  return (
    <div
      className="flex items-center justify-between mb-3 pb-2 border-b border-intent-primary/15 cursor-grab"
      onMouseDown={onDragStart}
    >
      <div className="flex items-center gap-2">
        <div className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
        <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost font-light">
          {config.label}
        </span>
      </div>

      <button
        onClick={onDismiss}
        className="text-[8px] text-text-ghost/50 hover:text-text-secondary uppercase tracking-wider transition-colors px-2 py-0.5"
      >
        ✕
      </button>
    </div>
  );
}

function CardFooter() {
  return (
    <div className="flex items-center justify-between mt-3 pt-2 border-t border-intent-primary/10">
      <div className="flex items-center gap-4 text-[8px] text-text-ghost/50 font-mono tracking-wide">
        <motion.span
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          SYS.OK
        </motion.span>
        <motion.span
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          LAT:12ms
        </motion.span>
      </div>
      <div className="flex items-center gap-1">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 h-1 bg-intent-primary"
            animate={{ opacity: [0.2, i < 3 ? 0.8 : 0.4, 0.2] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
