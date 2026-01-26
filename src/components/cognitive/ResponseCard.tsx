import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CognitiveSurface, CognitiveState } from './CognitiveSurface';
import { StateIndicator, IndicatorMode } from './StateIndicator';
import { ThoughtStream } from './ThoughtStream';
import { EphemeralAction } from './EphemeralAction';
import { cn } from '@/lib/utils';

interface ResponseCardProps {
  text: string;
  state?: CognitiveState;
  showAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const stateToIndicator: Record<CognitiveState, IndicatorMode> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  responding: 'responding',
  fading: 'idle',
};

export function ResponseCard({
  text,
  state = 'responding',
  showAction = false,
  actionLabel = 'Confirm',
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
        <CognitiveSurface
          intent="primary"
          state={state}
          glow={state === 'responding' || state === 'listening'}
          className={cn('max-w-md p-cognitive-md', className)}
        >
          {/* Header with state indicator */}
          <div className="flex items-center gap-3 mb-4">
            <StateIndicator 
              mode={stateToIndicator[state]} 
              size="sm"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs uppercase tracking-widest text-text-ghost font-light"
            >
              {state === 'thinking' ? 'Processing...' : 
               state === 'listening' ? 'Listening...' :
               state === 'responding' ? 'Response' : ''}
            </motion.span>
          </div>

          {/* Content */}
          <div className="mb-4">
            <ThoughtStream
              text={text}
              speed="adaptive"
              isStreaming={state === 'responding'}
              onComplete={() => setIsComplete(true)}
            />
          </div>

          {/* Action button */}
          <AnimatePresence>
            {showAction && isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex justify-end gap-3"
              >
                <EphemeralAction
                  label="Dismiss"
                  variant="subtle"
                  ttl={8000}
                  onConfirm={handleDismiss}
                />
                <EphemeralAction
                  label={actionLabel}
                  variant="primary"
                  ttl={8000}
                  onConfirm={onAction}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom edge glow */}
          <motion.div
            className="absolute bottom-0 left-4 right-4 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--intent-primary) / 0.3), transparent)',
            }}
            animate={{
              opacity: state === 'responding' ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{
              duration: 2,
              repeat: state === 'responding' ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
        </CognitiveSurface>
      )}
    </AnimatePresence>
  );
}