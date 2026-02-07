import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FuturisticFrame } from '@/components/cognitive/FuturisticFrame';
import { ThoughtStream } from '@/components/cognitive/ThoughtStream';
import { CognitiveRenderer } from '@/components/cognitive/dynamic/CognitiveRenderer';
import type { CognitiveUISchema, ActionPayload } from '@/components/cognitive/dynamic/types';

export interface FloatingCard {
  id: string;
  type: 'response' | 'action' | 'error' | 'thought';
  schema?: CognitiveUISchema;
  text?: string;
  error?: string;
  autoDismissMs?: number; // 0 = manual dismiss only
  timestamp: number;
}

interface FloatingResponseCardProps {
  card: FloatingCard;
  index: number;
  total: number;
  onDismiss: (id: string) => void;
  onAction: (action: ActionPayload) => void;
  onMouseStateChange?: (inside: boolean) => void;
}

/**
 * FloatingResponseCard — Carte de réponse flottante au centre de l'écran
 * Apparaît avec animation, disparaît après un délai ou manuellement
 */
export function FloatingResponseCard({
  card,
  index,
  total,
  onDismiss,
  onAction,
  onMouseStateChange,
}: FloatingResponseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Auto-dismiss timer (paused on hover)
  useEffect(() => {
    if (!card.autoDismissMs || card.autoDismissMs <= 0) return;
    if (isHovered) return;
    if (!isComplete && card.type === 'response' && card.text) return; // Wait for streaming

    const timer = setTimeout(() => {
      onDismiss(card.id);
    }, card.autoDismissMs);

    return () => clearTimeout(timer);
  }, [card.id, card.autoDismissMs, isHovered, isComplete, card.type, card.text, onDismiss]);

  // Stack offset — newer cards appear higher
  const stackOffset = (total - 1 - index) * 8;

  const frameVariant = card.type === 'error' ? 'secondary' : 'primary';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 40 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: -stackOffset,
      }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="pointer-events-auto"
      style={{ zIndex: 100 + index }}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseStateChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseStateChange?.(false);
      }}
    >
      <div className="relative max-w-lg w-[480px]">
        <FuturisticFrame variant={frameVariant} animated={!isComplete}>
          <div className="p-5">
            {/* Header with type label and dismiss */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-intent-primary/15">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  card.type === 'error' ? 'bg-intent-warning' :
                  card.type === 'action' ? 'bg-intent-focus' :
                  card.type === 'thought' ? 'bg-intent-secondary' :
                  'bg-intent-primary',
                )} />
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-ghost font-light">
                  {card.type === 'error' ? 'ERREUR' :
                   card.type === 'action' ? 'ACTION' :
                   card.type === 'thought' ? 'PENSÉE' :
                   'RÉPONSE'}
                </span>
              </div>

              <button
                onClick={() => onDismiss(card.id)}
                className="text-[8px] text-text-ghost/50 hover:text-text-secondary uppercase tracking-wider transition-colors px-2 py-0.5"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            {card.error && (
              <div
                className="p-3 border border-intent-warning/30 bg-intent-warning/5 mb-3"
                style={{ clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}
              >
                <p className="text-xs text-intent-warning">{card.error}</p>
              </div>
            )}

            {card.text && (
              <div className="min-h-[40px]">
                <ThoughtStream
                  text={card.text}
                  speed="adaptive"
                  isStreaming={card.type === 'response'}
                  onComplete={() => setIsComplete(true)}
                />
              </div>
            )}

            {card.schema && (
              <div className="mt-2">
                <CognitiveRenderer schema={card.schema} onAction={onAction} />
              </div>
            )}

            {/* Auto-dismiss progress bar */}
            {card.autoDismissMs && card.autoDismissMs > 0 && !isHovered && (
              <motion.div
                className="absolute bottom-0 left-0 h-px bg-intent-primary/40"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{
                  duration: card.autoDismissMs / 1000,
                  ease: 'linear',
                }}
              />
            )}
          </div>
        </FuturisticFrame>
      </div>
    </motion.div>
  );
}
