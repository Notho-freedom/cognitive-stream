import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StatusBlock } from '../types';

interface CogStatusProps extends Omit<StatusBlock, 'type'> {
  className?: string;
}

const stateConfig: Record<string, { color: string; icon: string; label: string }> = {
  loading: {
    color: 'text-intent-primary',
    icon: '◐',
    label: 'PROCESSING',
  },
  success: {
    color: 'text-green-400',
    icon: '◆',
    label: 'SUCCESS',
  },
  error: {
    color: 'text-intent-focus',
    icon: '◇',
    label: 'ERROR',
  },
  warning: {
    color: 'text-amber-400',
    icon: '◈',
    label: 'WARNING',
  },
  info: {
    color: 'text-intent-primary',
    icon: '◉',
    label: 'INFO',
  },
};

export function CogStatus({ state, message, className }: CogStatusProps) {
  const config = stateConfig[state] || stateConfig.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 border border-intent-neutral/20 bg-surface-raised/20',
        className
      )}
      style={{
        clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
      }}
    >
      <motion.span
        className={cn('text-lg', config.color)}
        animate={state === 'loading' ? { rotate: 360 } : {}}
        transition={state === 'loading' ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
      >
        {config.icon}
      </motion.span>
      
      <div className="flex-1">
        <span className={cn('text-[10px] uppercase tracking-wider', config.color)}>
          {config.label}
        </span>
        {message && (
          <p className="text-sm text-text-secondary font-light mt-0.5">
            {message}
          </p>
        )}
      </div>
    </motion.div>
  );
}
