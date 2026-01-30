import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProgressBlock } from '../types';

interface CogProgressProps extends Omit<ProgressBlock, 'type'> {
  className?: string;
}

export function CogProgress({ 
  value, 
  max = 100, 
  label, 
  showValue = true,
  className 
}: CogProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('w-full', className)}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-xs text-text-secondary uppercase tracking-wider">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs text-intent-primary font-mono">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className="relative h-2 bg-surface-raised/50 border border-intent-neutral/20 overflow-hidden"
        style={{
          clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-intent-primary/80 to-intent-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-80px', '400px'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        />
      </div>
    </motion.div>
  );
}
