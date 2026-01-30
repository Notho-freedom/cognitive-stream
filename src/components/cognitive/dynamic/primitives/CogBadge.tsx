import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { BadgeBlock } from '../types';

interface CogBadgeProps extends Omit<BadgeBlock, 'type'> {
  className?: string;
}

const variantStyles: Record<string, { bg: string; border: string; text: string }> = {
  default: {
    bg: 'bg-intent-neutral/10',
    border: 'border-intent-neutral/30',
    text: 'text-text-secondary',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  error: {
    bg: 'bg-intent-focus/10',
    border: 'border-intent-focus/30',
    text: 'text-intent-focus',
  },
  info: {
    bg: 'bg-intent-primary/10',
    border: 'border-intent-primary/30',
    text: 'text-intent-primary',
  },
};

export function CogBadge({ text, variant = 'default', className }: CogBadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center px-3 py-1 text-[10px] uppercase tracking-wider font-medium border',
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
      style={{
        clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
      }}
    >
      <span className="w-1 h-1 rounded-full bg-current mr-2 opacity-60" />
      {text}
    </motion.span>
  );
}
