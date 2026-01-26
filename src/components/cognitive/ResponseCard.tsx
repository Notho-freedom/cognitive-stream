import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FuturisticFrame } from './FuturisticFrame';
import { StateIndicator, IndicatorMode } from './StateIndicator';
import { ThoughtStream } from './ThoughtStream';
import { cn } from '@/lib/utils';

export type ResponseState = 'idle' | 'listening' | 'thinking' | 'responding' | 'complete';

interface ResponseCardProps {
  text: string;
  state?: ResponseState;
  showAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const stateToIndicator: Record<ResponseState, IndicatorMode> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  responding: 'responding',
  complete: 'success',
};

const stateLabels: Record<ResponseState, string> = {
  idle: 'EN ATTENTE',
  listening: 'ÉCOUTE ACTIVE',
  thinking: 'TRAITEMENT...',
  responding: 'RÉPONSE',
  complete: 'TERMINÉ',
};

export function ResponseCard({
  text,
  state = 'responding',
  showAction = false,
  actionLabel = 'Confirmer',
  onAction,
  onDismiss,
  className,
}: ResponseCardProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={cn('max-w-lg', className)}
        >
          <FuturisticFrame 
            variant="primary" 
            animated={state === 'thinking' || state === 'responding'}
          >
            <div className="p-6">
              {/* Header bar */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-intent-primary/20">
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="relative">
                    <StateIndicator 
                      mode={stateToIndicator[state]} 
                      size="sm"
                    />
                  </div>
                  
                  {/* State label */}
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-intent-primary font-medium">
                      {stateLabels[state]}
                    </span>
                    <span className="text-[9px] text-text-ghost tracking-wider">
                      NEURAL.LINK.v2.4
                    </span>
                  </div>
                </div>

                {/* Tech decoration - right side */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-3 bg-intent-primary/40"
                        animate={{
                          opacity: state === 'thinking' ? [0.3, 1, 0.3] : 0.4,
                          scaleY: state === 'thinking' ? [0.5, 1, 0.5] : 1,
                        }}
                        transition={{
                          duration: 0.8,
                          delay: i * 0.15,
                          repeat: state === 'thinking' ? Infinity : 0,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[8px] text-text-ghost font-mono">
                    SYS.OK
                  </span>
                </div>
              </div>

              {/* Content area */}
              <div className="min-h-[60px] mb-5">
                <ThoughtStream
                  text={text}
                  speed="adaptive"
                  isStreaming={state === 'responding'}
                  onComplete={() => setIsComplete(true)}
                />
              </div>

              {/* Action buttons */}
              <AnimatePresence>
                {showAction && isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="flex justify-end gap-3 pt-4 border-t border-intent-primary/10"
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={handleDismiss}
                      className="group relative px-4 py-2 text-xs uppercase tracking-wider text-text-ghost hover:text-text-secondary transition-colors"
                    >
                      <span className="relative z-10">Annuler</span>
                      <div className="absolute inset-0 bg-intent-neutral/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                        style={{
                          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                        }}
                      />
                    </button>

                    {/* Primary action button */}
                    <button
                      onClick={onAction}
                      className="group relative px-6 py-2 text-xs uppercase tracking-wider text-text-primary font-medium"
                    >
                      <span className="relative z-10">{actionLabel}</span>
                      {/* Button frame */}
                      <div 
                        className="absolute inset-0 bg-intent-primary/20 group-hover:bg-intent-primary/30 transition-colors"
                        style={{
                          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                        }}
                      />
                      {/* Button border */}
                      <div 
                        className="absolute inset-0 border border-intent-primary/50"
                        style={{
                          clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                        }}
                      />
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom data bar */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-intent-primary/10">
                <div className="flex items-center gap-4 text-[8px] text-text-ghost font-mono tracking-wide">
                  <span>ID:0x7F3A</span>
                  <span>LAT:12ms</span>
                  <span>MEM:2.4MB</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 h-1 bg-intent-primary/40"
                      style={{
                        opacity: i < 3 ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FuturisticFrame>
        </motion.div>
      )}
    </AnimatePresence>
  );
}