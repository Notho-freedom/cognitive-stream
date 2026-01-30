import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DividerBlock } from '../types';

interface CogDividerProps extends Omit<DividerBlock, 'type'> {
  className?: string;
}

export function CogDivider({ label, className }: CogDividerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center py-3', className)}
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-intent-neutral/30 to-transparent" />
      
      {label && (
        <>
          <span className="px-4 text-[10px] text-text-ghost uppercase tracking-[0.2em]">
            {label}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-intent-neutral/30 to-transparent" />
        </>
      )}
      
      {/* Tech dots */}
      <motion.div 
        className="absolute left-0 w-1 h-1 bg-intent-primary/40 rounded-full"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div 
        className="absolute right-0 w-1 h-1 bg-intent-primary/40 rounded-full"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
    </motion.div>
  );
}
