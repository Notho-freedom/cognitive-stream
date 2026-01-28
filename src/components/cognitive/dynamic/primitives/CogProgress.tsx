import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ProgressBlock } from '../types';

interface CogProgressProps extends Omit<ProgressBlock, 'type'> {
  label?: string;
}

const sizeStyles: Record<string, { height: string; text: string; padding: string }> = {
  sm: { height: 'h-1', text: 'text-xs', padding: 'px-0.5' },
  md: { height: 'h-2', text: 'text-sm', padding: 'px-1' },
  lg: { height: 'h-3', text: 'text-base', padding: 'px-1.5' },
  xl: { height: 'h-4', text: 'text-lg', padding: 'px-2' },
};

export function CogProgress({ 
  value, 
  max = 100,
  label,
  showValue = false,
  intent = 'primary',
  size = 'md',
  className 
}: CogProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const styles = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('space-y-3', className)}
    >
      {/* Header with label and value */}
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('text-text-secondary font-light', styles.text)}
            >
              {label}
            </motion.span>
          )}
          {showValue && (
            <motion.span
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                'text-text-muted font-mono px-2 py-1 border border-intent-neutral/20 rounded',
                styles.text
              )}
              style={{
                clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
              }}
            >
              {value}/{max}
            </motion.span>
          )}
        </div>
      )}
      
      {/* Progress bar container */}
      <div className="relative">
        {/* Background track with tech style */}
        <div 
          className={cn(
            'relative overflow-hidden',
            'bg-surface-glass/[0.1]',
            styles.height
          )}
          style={{
            clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
          }}
        >
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `
                linear-gradient(90deg, hsl(var(--intent-primary)/30) 1px, transparent 1px)
              `,
              backgroundSize: '20px 100%',
            }}
          />
          
          {/* Progress fill with animated gradient */}
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ 
              duration: 1, 
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2 
            }}
          >
            {/* Main fill */}
            <div className="absolute inset-0 bg-intent-primary" />
            
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-intent-primary/80 via-intent-primary to-intent-primary/80" />
            
            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </motion.div>
          
          {/* Pulsing glow effect */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-intent-primary opacity-20 blur-sm"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>
        
        {/* Shimmer animation */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className={cn(
              'absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent',
              styles.padding
            )}
            animate={{ x: ['-100%', '400%'] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'linear',
              delay: 0.5 
            }}
            style={{
              clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
            }}
          />
        </motion.div>
        
        {/* Progress markers */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {[0, 25, 50, 75, 100].map((marker) => (
            <div key={marker} className="relative">
              <div 
                className={cn(
                  'absolute top-0 w-px',
                  percentage >= marker ? 'bg-white/40' : 'bg-intent-neutral/20'
                )}
                style={{ height: styles.height }}
              />
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: marker * 0.01 + 0.3 }}
                className="absolute top-full mt-1 text-[8px] text-text-ghost font-mono -translate-x-1/2"
              >
                {marker}%
              </motion.span>
            </div>
          ))}
        </div>
        
        {/* Current value indicator */}
        <motion.div
          className="absolute top-0 h-full w-px bg-white/60 shadow-glow-primary"
          initial={{ left: '0%' }}
          animate={{ left: `${percentage}%` }}
          transition={{ 
            duration: 1, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2 
          }}
        >
          {/* Indicator pulse */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-intent-primary"
            animate={{ 
              scale: [1, 1.3, 1],
              boxShadow: [
                '0 0 0 0 rgba(var(--intent-primary-rgb), 0.4)',
                '0 0 0 6px rgba(var(--intent-primary-rgb), 0)',
                '0 0 0 0 rgba(var(--intent-primary-rgb), 0.4)'
              ]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: 'easeInOut' 
            }}
          />
        </motion.div>
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-intent-primary/40" />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-intent-primary/40" />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-intent-primary/40" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-intent-primary/40" />
      </div>
      
      {/* Data stream below progress */}
      <motion.div
        className="flex items-center justify-between text-[9px] text-text-ghost font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}>
          LOADING
        </motion.span>
        <motion.span 
          className="text-intent-primary"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {percentage.toFixed(1)}%
        </motion.span>
        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}>
          ACTIVE
        </motion.span>
      </motion.div>
    </motion.div>
  );
}