import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface EphemeralActionProps {
  label: string;
  ttl?: number; // Time to live in ms
  onConfirm?: () => void;
  onDismiss?: () => void;
  variant?: 'primary' | 'secondary' | 'subtle';
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: {
    base: 'bg-intent-primary/20 border-intent-primary/40 hover:bg-intent-primary/30 hover:border-intent-primary/60',
    text: 'text-intent-primary',
    glow: 'shadow-glow-primary',
    progress: 'bg-intent-primary',
  },
  secondary: {
    base: 'bg-intent-secondary/20 border-intent-secondary/40 hover:bg-intent-secondary/30 hover:border-intent-secondary/60',
    text: 'text-intent-secondary',
    glow: 'shadow-glow-secondary',
    progress: 'bg-intent-secondary',
  },
  subtle: {
    base: 'bg-surface-glass/10 border-intent-neutral/30 hover:bg-surface-glass/20 hover:border-intent-neutral/50',
    text: 'text-text-secondary',
    glow: 'shadow-glow-subtle',
    progress: 'bg-intent-neutral',
  },
};

export function EphemeralAction({
  label,
  ttl = 5000,
  onConfirm,
  onDismiss,
  variant = 'primary',
  icon,
  className,
}: EphemeralActionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  const styles = variantStyles[variant];

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    setIsVisible(false);
  }, [onConfirm]);

  useEffect(() => {
    if (isHovered) return;

    const startTime = Date.now();
    const endTime = startTime + ttl;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const percentage = (remaining / ttl) * 100;
      
      if (percentage <= 0) {
        handleDismiss();
        return;
      }
      
      setProgress(percentage);
      requestAnimationFrame(updateProgress);
    };

    const frameId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(frameId);
  }, [ttl, isHovered, handleDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            boxShadow: isHovered 
              ? '0 0 30px -5px hsl(var(--intent-primary) / 0.4)' 
              : '0 0 20px -10px hsl(var(--intent-primary) / 0.2)'
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.95, 
            filter: 'blur(8px)',
            transition: { duration: 0.3, ease: [0.7, 0, 0.84, 0] }
          }}
          transition={{
            duration: 0.36,
            ease: [0.16, 1, 0.3, 1],
          }}
          onClick={handleConfirm}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'relative overflow-hidden',
            'px-6 py-3 rounded-cognitive',
            'border backdrop-blur-glass',
            'font-light tracking-wide text-sm',
            'transition-all duration-medium ease-cognitive-enter',
            'cursor-pointer',
            styles.base,
            styles.text,
            className
          )}
        >
          {/* Progress bar (time remaining) */}
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 h-0.5 origin-left',
              styles.progress,
              'opacity-40'
            )}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />

          {/* Content */}
          <span className="relative z-10 flex items-center gap-2">
            {icon && (
              <motion.span
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {icon}
              </motion.span>
            )}
            {label}
          </span>

          {/* Hover glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: isHovered ? '100%' : '-100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />

          {/* Edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}