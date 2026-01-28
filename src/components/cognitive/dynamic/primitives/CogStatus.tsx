import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusBlock } from '../types';
import { Loader2, CheckCircle, AlertCircle, AlertTriangle, Circle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface CogStatusProps extends Omit<StatusBlock, 'type'> {
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const statusConfig: Record<StatusBlock['status'], { 
  icon: React.ElementType; 
  color: string; 
  bg: string;
  border: string;
  pulse?: boolean;
  spin?: boolean;
  glow?: boolean;
}> = {
  idle: { 
    icon: Circle, 
    color: 'text-text-ghost', 
    bg: 'bg-surface-glass/[0.06]',
    border: 'border-intent-neutral/20',
    pulse: false,
    spin: false,
    glow: false,
  },
  loading: { 
    icon: Loader2, 
    color: 'text-intent-primary', 
    bg: 'bg-intent-primary/10',
    border: 'border-intent-primary/30',
    pulse: true,
    spin: true,
    glow: true,
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-intent-success', 
    bg: 'bg-intent-success/10',
    border: 'border-intent-success/30',
    pulse: false,
    spin: false,
    glow: true,
  },
  error: { 
    icon: XCircle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    pulse: true,
    spin: false,
    glow: true,
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-intent-warning', 
    bg: 'bg-intent-warning/10',
    border: 'border-intent-warning/30',
    pulse: true,
    spin: false,
    glow: true,
  },
};

export function CogStatus({ 
  status, 
  message,
  dismissible = false,
  onDismiss,
  className 
}: CogStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleDismiss = () => {
    if (dismissible) {
      setIsVisible(false);
      onDismiss?.();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95, filter: 'blur(4px)' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main container */}
        <div 
          className={cn(
            'relative flex items-center gap-3 px-4 py-3',
            config.bg,
            config.border,
            'border backdrop-blur-glass',
            'transition-all duration-medium',
            isHovered && 'bg-opacity-20',
            className
          )}
          style={{
            clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
          }}
        >
          {/* Icon container with effects */}
          <motion.div
            className="relative"
            animate={config.pulse ? { 
              scale: [1, 1.1, 1],
              boxShadow: config.glow ? [
                `0 0 0 0 ${config.color.replace('text-', 'bg-')}20`,
                `0 0 0 6px ${config.color.replace('text-', 'bg-')}20`,
                `0 0 0 0 ${config.color.replace('text-', 'bg-')}20`
              ] : undefined
            } : {}}
            transition={{ 
              duration: config.pulse ? 1.5 : 0,
              repeat: config.pulse ? Infinity : 0,
              ease: 'easeInOut'
            }}
          >
            <Icon 
              className={cn(
                'w-5 h-5 relative z-10',
                config.color,
                config.spin && 'animate-spin'
              )} 
            />
            
            {/* Icon glow */}
            {config.glow && (
              <div className={cn(
                'absolute inset-0 rounded-full blur-sm',
                config.color.replace('text-', 'bg-'),
                'opacity-20'
              )} />
            )}
            
            {/* Orbiting particles for loading */}
            {status === 'loading' && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-intent-primary/60"
                    animate={{
                      rotate: 360,
                      x: 12 * Math.cos((i * 120 * Math.PI) / 180),
                      y: 12 * Math.sin((i * 120 * Math.PI) / 180),
                    }}
                    transition={{
                      rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                      x: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                      y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
          
          {/* Message */}
          {message && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('text-sm font-light flex-1', config.color)}
            >
              {message}
            </motion.span>
          )}
          
          {/* Dismiss button */}
          {dismissible && (
            <motion.button
              onClick={handleDismiss}
              className="w-5 h-5 flex items-center justify-center text-text-ghost hover:text-text-secondary transition-colors"
              whileHover={{ scale: 1.2, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0.5 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.button>
          )}
          
          {/* Status label */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[9px] font-mono uppercase tracking-widest opacity-60"
          >
            {status}
          </motion.span>
          
          {/* Corner accents */}
          <div className={cn(
            'absolute top-0 left-0 w-2 h-2 border-t border-l transition-colors',
            config.border
          )} />
          <div className={cn(
            'absolute bottom-0 right-0 w-2 h-2 border-b border-r transition-colors',
            config.border
          )} />
          
          {/* Edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Progress bar for loading */}
          {status === 'loading' && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-intent-primary via-intent-primary/50 to-intent-primary"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        
        {/* Data stream */}
        <div className="absolute -bottom-4 left-0 right-0 flex items-center justify-between text-[8px] text-text-ghost font-mono">
          <motion.span 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            STATUS:{status.toUpperCase()}
          </motion.span>
          <motion.span 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
          >
            {new Date().toISOString().slice(11, 19)}
          </motion.span>
        </div>
        
        {/* Floating particles for certain statuses */}
        {(status === 'loading' || status === 'success') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-intent-primary/30"
                initial={{ 
                  x: Math.random() * 200 - 100, 
                  y: Math.random() * 60 - 30,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, -20],
                  opacity: [0, 0.5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}