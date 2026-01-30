import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TextBlock } from '../types';

interface CogTextProps extends Omit<TextBlock, 'type'> {
  className?: string;
}

const variantStyles: Record<string, string> = {
  body: 'text-sm text-[hsl(var(--text-primary))] font-light leading-relaxed tracking-wide',
  heading: 'text-lg text-[hsl(var(--text-primary))] font-medium tracking-wide uppercase',
  label: 'text-xs text-[hsl(var(--intent-primary))] uppercase tracking-[0.2em] font-medium',
  caption: 'text-[10px] text-[hsl(var(--text-ghost))] tracking-wider',
  code: 'text-xs text-[hsl(var(--intent-primary))] font-mono bg-[hsl(var(--surface-glass)/0.5)] px-2 py-1 rounded',
};

export function CogText({ content, variant = 'body', streaming, className }: CogTextProps) {
  if (streaming) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(variantStyles[variant], className)}
      >
        {content.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
          >
            {char}
          </motion.span>
        ))}
      </motion.p>
    );
  }

  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(variantStyles[variant], className)}
    >
      {content}
    </motion.p>
  );
}
