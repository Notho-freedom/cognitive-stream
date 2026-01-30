import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FuturisticFrame } from '../../FuturisticFrame';
import type { CardBlock, ActionPayload } from '../types';

interface CogCardProps extends Omit<CardBlock, 'type' | 'children'> {
  children: React.ReactNode;
  className?: string;
  onAction?: (action: ActionPayload) => void;
}

export function CogCard({ 
  id,
  variant = 'default', 
  title,
  children, 
  className,
}: CogCardProps) {
  // Use FuturisticFrame for 'framed' variant
  if (variant === 'framed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn('w-full', className)}
      >
        <FuturisticFrame variant="primary" animated>
          <div className="p-5">
            {title && (
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-intent-primary/20">
                <div className="w-1.5 h-1.5 bg-intent-primary rounded-full" />
                <span className="text-xs text-intent-primary uppercase tracking-[0.2em] font-medium">
                  {title}
                </span>
              </div>
            )}
            {children}
          </div>
        </FuturisticFrame>
      </motion.div>
    );
  }

  // Ghost variant
  if (variant === 'ghost') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('p-4', className)}
      >
        {title && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-text-ghost uppercase tracking-wider">
              {title}
            </span>
          </div>
        )}
        {children}
      </motion.div>
    );
  }

  // Default card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative p-5 border border-intent-neutral/20 bg-surface-raised/30',
        className
      )}
      style={{
        clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
      }}
    >
      {title && (
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-intent-neutral/20">
          <div className="w-1 h-1 bg-intent-primary rounded-full" />
          <span className="text-xs text-text-secondary uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      {children}
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-intent-primary/30" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-intent-primary/30" />
    </motion.div>
  );
}
