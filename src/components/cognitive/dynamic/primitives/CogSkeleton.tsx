import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SkeletonBlock } from '../types';

interface CogSkeletonProps extends Omit<SkeletonBlock, 'type'> {
  className?: string;
}

export function CogSkeleton({ lines = 3, height = '1rem', className }: CogSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {[...Array(lines)].map((_, i) => (
        <motion.div
          key={i}
          className="relative overflow-hidden bg-surface-raised/30 rounded"
          style={{ 
            height,
            width: i === lines - 1 ? '60%' : '100%',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-intent-primary/10 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      ))}
    </div>
  );
}
