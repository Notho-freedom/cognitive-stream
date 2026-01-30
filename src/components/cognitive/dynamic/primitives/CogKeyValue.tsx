import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { KeyValueBlock } from '../types';

interface CogKeyValueProps extends Omit<KeyValueBlock, 'type'> {
  className?: string;
}

export function CogKeyValue({ pairs, className }: CogKeyValueProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-2', className)}
    >
      {pairs.map((pair, i) => (
        <motion.div
          key={pair.key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between py-2 border-b border-intent-neutral/10 last:border-0"
        >
          <span className="text-xs text-text-ghost uppercase tracking-wider">
            {pair.key}
          </span>
          <span className="text-sm text-text-primary font-light tracking-wide">
            {pair.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
