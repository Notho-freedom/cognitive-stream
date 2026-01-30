import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CogButton } from './CogButton';
import type { EmptyBlock, ActionPayload } from '../types';

interface CogEmptyProps extends Omit<EmptyBlock, 'type'> {
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogEmpty({ 
  title, 
  description, 
  actionLabel, 
  actionId,
  className,
  onAction 
}: CogEmptyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      {/* Empty state icon */}
      <motion.div
        className="relative w-16 h-16 mb-6"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="absolute inset-0 border-2 border-dashed border-intent-neutral/30 rounded-lg rotate-45" />
        <div className="absolute inset-2 border border-intent-primary/20 rounded" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-intent-primary/40 rounded-full" />
        </div>
      </motion.div>
      
      <h3 className="text-sm text-text-secondary uppercase tracking-wider mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-text-ghost max-w-xs mb-6">
          {description}
        </p>
      )}
      
      {actionLabel && actionId && (
        <CogButton
          actionId={actionId}
          label={actionLabel}
          variant="primary"
          onAction={onAction}
        />
      )}
    </motion.div>
  );
}
