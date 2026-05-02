import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AIActivityOrbProps {
  mode: string;
  thought: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  disabled?: boolean;
}

/**
 * AIActivityOrb — a subtle, floating orb that shows the AI is "alive".
 * Pulses when thinking, streams when generating, shows thought fragments.
 * Positioned top-right of the desktop, above notifications.
 */
export const AIActivityOrb = memo(function AIActivityOrb({
  mode, thought, isLoading, isStreaming, disabled,
}: AIActivityOrbProps) {
  const [showThought, setShowThought] = useState(false);
  const prevThought = useRef(thought);

  useEffect(() => {
    if (thought && thought !== prevThought.current && thought.length > 10) {
      setShowThought(true);
      const t = setTimeout(() => setShowThought(false), 4000);
      prevThought.current = thought;
      return () => clearTimeout(t);
    }
  }, [thought]);

  if (disabled) return null;

  const isActive = isLoading || isStreaming || mode === 'thinking' || mode === 'planning' || mode === 'executing';
  const isIdle = mode === 'idle' && !isLoading && !isStreaming;

  return (
    <div className="fixed top-6 right-6 z-45 pointer-events-none flex items-start gap-3">
      {/* Thought bubble */}
      <AnimatePresence>
        {showThought && thought && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="max-w-[280px] px-3 py-2 rounded-lg text-[10px] text-text-secondary/80 leading-relaxed mt-2"
            style={{
              background: 'hsl(220 20% 8% / 0.8)',
              border: '1px solid hsl(187 85% 53% / 0.15)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="text-[8px] uppercase tracking-[0.3em] text-intent-primary/60 mb-1">
              {mode === 'thinking' ? '◈ Réflexion' : mode === 'planning' ? '◈ Planification' : '◈ Pensée'}
            </div>
            <div className="line-clamp-3">{thought}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={isActive ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: 36, height: 36,
            border: `1.5px solid ${isActive ? 'hsl(187 85% 53% / 0.4)' : 'hsl(220 15% 25% / 0.3)'}`,
          }}
          animate={isActive ? {
            borderColor: [
              'hsl(187 85% 53% / 0.2)',
              'hsl(187 85% 53% / 0.5)',
              'hsl(187 85% 53% / 0.2)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Core */}
        <motion.div
          className="rounded-full"
          style={{
            width: 12, height: 12,
            marginLeft: 12, marginTop: 12,
          }}
          animate={{
            backgroundColor: isActive
              ? ['hsl(187 85% 53% / 0.8)', 'hsl(187 85% 53% / 0.4)', 'hsl(187 85% 53% / 0.8)']
              : 'hsl(220 15% 25% / 0.3)',
            boxShadow: isActive
              ? [
                '0 0 8px 2px hsl(187 85% 53% / 0.3)',
                '0 0 16px 4px hsl(187 85% 53% / 0.15)',
                '0 0 8px 2px hsl(187 85% 53% / 0.3)',
              ]
              : '0 0 0 0 transparent',
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Streaming indicator */}
        {isStreaming && (
          <motion.div
            className="absolute inset-0 rounded-full border border-intent-primary/30"
            style={{ width: 36, height: 36 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-intent-primary" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});
